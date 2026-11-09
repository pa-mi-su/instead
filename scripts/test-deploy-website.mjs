import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deployWebsite, validateWebsite } from './deploy-website.mjs';
const sha = 'a'.repeat(40);
function fixture(t) {
  const dir = mkdtempSync(path.join(tmpdir(), 'instead-site-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const file of [
    'index.html',
    'privacy/index.html',
    'terms/index.html',
    'safety/index.html',
    'support/index.html',
    'delete-account/index.html',
    'admin/index.html',
    'admin/admin.mjs',
    'admin/config.mjs',
    'admin/builtin-recipes.json',
  ]) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFileSync(path.join(dir, file), `INSTEAD ${file}`);
  }
  writeFileSync(path.join(dir, 'deployment.json'), JSON.stringify({ sha }));
  return dir;
}
const healthy = directory => async url => {
  const route = new URL(url).pathname.slice(1);
  const file = route.includes('.') ? route : path.join(route, 'index.html');
  return {
    ok: true,
    text: async () => readFileSync(path.join(directory, file), 'utf8'),
  };
};
const awsResult = () => JSON.stringify({ Invalidation: { Id: 'INV' } });

test('deploy uploads all files with new cache metadata and invalidates before public verification', async t => {
  const directory = fixture(t),
    calls = [];
  const run = args => {
    calls.push(args);
    return awsResult();
  };
  const fetcher = async url => {
    assert.equal(calls.length, 2);
    assert.equal(
      new URL(url).search,
      '',
      'do not bypass the CDN cache being tested',
    );
    return healthy(directory)(url);
  };
  assert.equal(await deployWebsite({ directory, sha, run, fetcher }), 'INV');
  assert.deepEqual(calls[0].slice(0, 2), ['s3', 'cp']);
  assert.ok(calls[0].includes('--recursive'));
  assert.ok(calls[0].includes('no-cache'));
  assert.equal(calls[1][1], 'create-invalidation');
});

test('missing output or mismatched commit fails before AWS mutation', async t => {
  const directory = fixture(t);
  assert.throws(() => validateWebsite(directory, 'bad'), /exact commit/);
  writeFileSync(
    path.join(directory, 'deployment.json'),
    JSON.stringify({ sha: 'b'.repeat(40) }),
  );
  let count = 0;
  await assert.rejects(
    deployWebsite({ directory, sha, run: () => count++ }),
    /different commit/,
  );
  assert.equal(count, 0);
  writeFileSync(
    path.join(directory, 'deployment.json'),
    JSON.stringify({ sha }),
  );
  rmSync(path.join(directory, 'delete-account/index.html'));
  await assert.rejects(
    deployWebsite({ directory, sha, run: () => count++ }),
    /Missing or empty/,
  );
  assert.equal(count, 0);
});

test('upload and invalidation failures stop without claiming deployment', async t => {
  const directory = fixture(t);
  for (let fail = 0; fail < 2; fail++) {
    let count = 0,
      reads = 0;
    await assert.rejects(
      deployWebsite({
        directory,
        sha,
        run: () => {
          if (count++ === fail) throw new Error('AWS failed');
          return awsResult();
        },
        fetcher: async () => {
          reads++;
          return { ok: false };
        },
      }),
      /AWS failed/,
    );
    assert.equal(count, fail + 1);
    assert.equal(reads, 0);
  }
});

test('stale or broken CDN output fails; convergence retries reads without re-uploading', async t => {
  const directory = fixture(t),
    run = awsResult;
  for (const response of [{ ok: true, text: async () => 'old' }, { ok: false }])
    await assert.rejects(
      deployWebsite({
        directory,
        sha,
        run,
        maxAttempts: 1,
        fetcher: async () => response,
      }),
      /does not serve/,
    );
  await assert.rejects(
    deployWebsite({
      directory,
      sha,
      run: () => '{}',
      fetcher: healthy(directory),
    }),
    /invalidation ID/,
  );
  let writes = 0,
    reads = 0,
    pauses = 0;
  await deployWebsite({
    directory,
    sha,
    run: () => {
      writes++;
      return awsResult();
    },
    pause: async () => pauses++,
    maxAttempts: 2,
    fetcher: async url =>
      ++reads === 1 ? { ok: false } : healthy(directory)(url),
  });
  assert.equal(writes, 2);
  assert.equal(pauses, 1);
});
