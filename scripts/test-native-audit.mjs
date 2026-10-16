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
