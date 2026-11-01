import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { verifyDeepmerge } from './verify-deepmerge.mjs';

test('audit gate rejects all findings, including formerly excepted deepmerge, and registry errors', async () => {
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
    for (const name of ['braces', 'deepmerge', 'new-package']) {
      assert.equal(
        run({
          metadata: {},
          vulnerabilities: {
            [name]: {
              nodes: [`node_modules/${name}`],
              via: [
                {
                  severity: 'low',
                  url: 'https://github.com/advisories/GHSA-gcqx-w48m-w2h4',
                },
              ],
            },
          },
        }).status,
        1,
      );
    }
    assert.notEqual(run({ error: { code: 'E503' } }).status, 0);
    assert.notEqual(run({}, 2).status, 0);
    assert.equal(run({ metadata: {}, vulnerabilities: {} }, 0).status, 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('local fork verification rejects tampering, missing files, wrong versions, and nested copies', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'instead-fork-test-'));
  try {
    await fs.cp('vendor/deepmerge', path.join(dir, 'vendor/deepmerge'), {
      recursive: true,
    });
    await fs.mkdir(path.join(dir, 'node_modules'));
    await fs.symlink(
      '../vendor/deepmerge',
      path.join(dir, 'node_modules/deepmerge'),
    );
    const lock = {
      packages: {
        'node_modules/deepmerge': { resolved: 'vendor/deepmerge', link: true },
      },
    };
    const writeLock = () =>
      fs.writeFile(path.join(dir, 'package-lock.json'), JSON.stringify(lock));
    await writeLock();
    assert.doesNotThrow(() => verifyDeepmerge(dir));
    for (const file of ['index.js', 'dist/cjs.js', 'dist/umd.js']) {
      const target = path.join(dir, 'vendor/deepmerge', file);
      const original = await fs.readFile(target);
      await fs.appendFile(target, '\n// changed\n');
      assert.throws(() => verifyDeepmerge(dir), /integrity failed/);
      await fs.rm(target);
      assert.throws(() => verifyDeepmerge(dir));
      await fs.writeFile(target, original);
    }
    lock.packages['node_modules/other/node_modules/deepmerge'] = {
      version: '4.3.1',
    };
    await writeLock();
    assert.throws(() => verifyDeepmerge(dir), /nested/);
    delete lock.packages['node_modules/other/node_modules/deepmerge'];
    await writeLock();
    const manifest = path.join(dir, 'vendor/deepmerge/package.json');
    const pkg = JSON.parse(await fs.readFile(manifest, 'utf8'));
    pkg.version = '4.3.1';
    await fs.writeFile(manifest, JSON.stringify(pkg));
    assert.throws(() => verifyDeepmerge(dir), /reviewed/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
