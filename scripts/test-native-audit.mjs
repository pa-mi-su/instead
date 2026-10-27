import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('audit gate rejects new findings, unexpected locations, and registry errors', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'instead-audit-test-'));
  try {
    await fs.writeFile(
      path.join(dir, 'npm'),
      '#!/usr/bin/env node\nprocess.stdout.write(process.env.AUDIT_FIXTURE); process.exit(Number(process.env.AUDIT_EXIT));\n',
      { mode: 0o700 },
    );
    const run = (report, status = 1) =>
      spawnSync(process.execPath, ['scripts/audit-native.mjs'], {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: dir + path.delimiter + process.env.PATH,
          AUDIT_FIXTURE: JSON.stringify(report),
          AUDIT_EXIT: String(status),
        },
      });
    const report = {
      metadata: {},
      vulnerabilities: {
        braces: {
          nodes: ['node_modules/braces'],
          via: [
            {
              severity: 'high',
              url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
            },
          ],
        },
      },
    };
    assert.equal(run(report).status, 0);
    const unknown = structuredClone(report);
    unknown.vulnerabilities.braces.via.push({
      severity: 'critical',
      url: 'https://github.com/advisories/UNKNOWN',
    });
    assert.equal(run(unknown).status, 1);
    const unexpected = structuredClone(report);
    unexpected.vulnerabilities.braces.nodes = [
      'node_modules/new-runtime-library/node_modules/braces',
    ];
    assert.equal(run(unexpected).status, 1);
    assert.notEqual(run({ error: { code: 'E503' } }, 1).status, 0);
    assert.notEqual(run({}, 2).status, 0);
    assert.equal(run({ metadata: {}, vulnerabilities: {} }, 0).status, 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('deepmerge audit acceptance requires the exact installed security patch', async () => {
  const dir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'instead-deepmerge-audit-'),
  );
  const project = path.join(dir, 'project');
  try {
    await fs.mkdir(project);
    await fs.writeFile(
      path.join(dir, 'npm'),
      '#!/usr/bin/env node\nprocess.stdout.write(process.env.AUDIT_FIXTURE); process.exit(1);\n',
      { mode: 0o700 },
    );
    const files = ['index.js', 'dist/cjs.js', 'dist/umd.js'];
    for (const file of files) {
      const target = path.join(project, 'node_modules/deepmerge', file);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(path.join('node_modules/deepmerge', file), target);
    }
    await fs.writeFile(
      path.join(project, 'package-lock.json'),
      JSON.stringify({
        packages: { 'node_modules/deepmerge': { version: '4.3.1' } },
      }),
    );
    const report = {
      metadata: {},
      vulnerabilities: {
        deepmerge: {
          nodes: ['node_modules/deepmerge'],
          via: [
            {
              severity: 'low',
              url: 'https://github.com/advisories/GHSA-gcqx-w48m-w2h4',
            },
          ],
        },
      },
    };
    const run = value =>
      spawnSync(process.execPath, [path.resolve('scripts/audit-native.mjs')], {
        cwd: project,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: dir + path.delimiter + process.env.PATH,
          AUDIT_FIXTURE: JSON.stringify(value),
        },
      });
    assert.equal(run(report).status, 0);
    const severity = structuredClone(report);
    severity.vulnerabilities.deepmerge.via[0].severity = 'high';
    assert.equal(run(severity).status, 1);
    const nested = structuredClone(report);
    nested.vulnerabilities.deepmerge.nodes = [
      'node_modules/other/node_modules/deepmerge',
    ];
    assert.equal(run(nested).status, 1);
    for (const file of files) {
      const target = path.join(project, 'node_modules/deepmerge', file);
      const content = await fs.readFile(target);
      await fs.appendFile(target, '\n// patch changed\n');
      assert.equal(run(report).status, 1, `changed ${file} must fail`);
      await fs.writeFile(target, content);
    }
    await fs.rm(path.join(project, 'node_modules/deepmerge/dist/cjs.js'));
    assert.equal(run(report).status, 1, 'missing patch must fail');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
