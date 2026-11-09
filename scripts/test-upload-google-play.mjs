import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const privateKey = generateKeyPairSync('rsa', {
  modulusLength: 2048,
}).privateKey.export({ type: 'pkcs8', format: 'pem' });
function run(t, scenario, extra = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), 'instead-play-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(
    path.join(directory, 'credentials.json'),
    JSON.stringify({
      client_email: 'test@example.invalid',
      private_key: privateKey,
    }),
  );
  writeFileSync(path.join(directory, 'app.aab'), 'test artifact');
  const calls = path.join(directory, 'calls.json');
  const summary = path.join(directory, 'summary.md');
  writeFileSync(
    path.join(directory, 'runner.mjs'),
    `
    import {writeFileSync} from 'node:fs';
    const calls=[];
    let commits=0;
    globalThis.fetch=async (url, options={})=>{
      calls.push({url:String(url),method:options.method,body: typeof options.body==='string'?options.body:undefined});
      writeFileSync(${JSON.stringify(calls)}, JSON.stringify(calls));
      let body={}; let status=200;
      if(String(url).includes('oauth2')) body={access_token:'fake-token'};
      else if(String(url).endsWith('/edits')) body={id:'123'};
      else if(String(url).includes('/bundles?')) body={versionCode:446};
      else if(String(url).includes(':validate') && ${JSON.stringify(
        scenario,
      )}==='invalid') {
        status=400;body={error:{message:'Invalid bundle'}};
      }
      else if(String(url).includes(':commit')) {
        commits++;
        if(${JSON.stringify(scenario)}==='fallback' && commits===1) {
          status=400;body={error:{message:'Please set the query parameter changesNotSentForReview to true.'}};
        }
        if(${JSON.stringify(scenario)}==='conflict') {
          status=400;body={error:{message:'CHANGES_ALREADY_IN_REVIEW'}};
        }
      }
      return {ok:status===200,status,json:async()=>body,text:async()=>JSON.stringify(body)};
    };
    await import(${JSON.stringify(
      pathToFileURL(path.resolve('scripts/upload-google-play.mjs')).href,
    )});
  `,
  );
  const result = spawnSync(
    process.execPath,
    [path.join(directory, 'runner.mjs')],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        GOOGLE_APPLICATION_CREDENTIALS: path.join(
          directory,
          'credentials.json',
        ),
        GOOGLE_PLAY_PACKAGE_NAME: 'test.app',
        GOOGLE_PLAY_BUNDLE_PATH: path.join(directory, 'app.aab'),
        GOOGLE_PLAY_TRACK: 'internal',
        GOOGLE_PLAY_RELEASE_STATUS: 'completed',
        GOOGLE_PLAY_USER_FRACTION: '',
        GOOGLE_PLAY_REVIEW_MODE: 'auto',
        GOOGLE_PLAY_EXPECTED_VERSION_CODE: '446',
        GITHUB_STEP_SUMMARY: summary,
        ...extra,
      },
    },
  );
  return {
    result,
    calls: JSON.parse(readFileSync(calls, 'utf8')),
    summary: () => readFileSync(summary, 'utf8'),
  };
}

test('uploader validates then commits the same uploaded bundle; fallback is successful with an explicit action summary', t => {
  const { result, calls, summary } = run(t, 'fallback');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(calls.filter(call => call.url.includes('/bundles?')).length, 1);
  const track = calls.find(call => call.method === 'PUT');
  assert.deepEqual(JSON.parse(track.body).releases[0].versionCodes, ['446']);
  const commits = calls.filter(call => call.url.includes(':commit'));
  assert.equal(commits.length, 2);
  assert.equal(commits[0].body, undefined);
  assert.match(commits[1].url, /changesNotSentForReview=true/);
  assert.ok(
    calls.findIndex(call => call.url.includes(':validate')) <
      calls.indexOf(commits[0]),
  );
  assert.equal(
    calls.some(call => call.method === 'DELETE'),
    false,
  );
  assert.match(summary(), /ACTION REQUIRED/);
  assert.match(summary(), /No rebuild or re-upload/);
});

test('validation, version mismatch and review conflicts fail visibly and clean up the uncommitted edit', t => {
  for (const [scenario, extra] of [
    ['invalid', {}],
    ['conflict', {}],
    ['normal', { GOOGLE_PLAY_EXPECTED_VERSION_CODE: '447' }],
  ]) {
    const { result, calls } = run(t, scenario, extra);
    assert.notEqual(result.status, 0);
    assert.equal(calls.at(-1).method, 'DELETE');
    const commits = calls.filter(call => call.url.includes(':commit'));
    assert.equal(commits.length, scenario === 'conflict' ? 1 : 0);
  }
});
