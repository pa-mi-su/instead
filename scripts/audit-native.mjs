import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

// Temporary, exact exception: React Native's Node build/test glob matching.
// No patched braces version is published. User recipe/photo input is not passed
// to this tool; CI only matches files and patterns from the checked-out source.
const exceptions = [
  {
    url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
    package: 'braces',
    version: '3.0.3',
    severity: 'high',
    expires: '2026-10-30T00:00:00Z',
  },
  {
    url: 'https://github.com/advisories/GHSA-gcqx-w48m-w2h4',
    package: 'deepmerge',
    version: '4.3.1',
    severity: 'low',
    expires: '2026-11-03T00:00:00Z',
    files: {
      'node_modules/deepmerge/index.js':
        '3353205e139308aeda737bd5760628c6b05e88d2c43a30ddf3e40a4229902413',
      'node_modules/deepmerge/dist/cjs.js':
        '73afd95fdd814fb5621fe8e25545a28578e8c9c14ff76050f0c40b161c72104b',
      'node_modules/deepmerge/dist/umd.js':
        '0bbc158163d69d2a2d095660fb30847ac9442a7c2c6b2eb294dd2a238d383997',
    },
  },
];
const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});
if (result.error) throw result.error;
if (![0, 1].includes(result.status))
  throw new Error('npm audit could not complete.');
const audit = JSON.parse(result.stdout);
if (audit.error || !audit.metadata || !audit.vulnerabilities)
  throw new Error('npm audit returned an invalid or unavailable report.');
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const failures = [];
let reviewed = 0;
for (const [name, vulnerability] of Object.entries(audit.vulnerabilities)) {
  for (const advisory of vulnerability.via) {
    if (typeof advisory === 'string') continue; // Parent summaries repeat leaf advisories.
    const accepted = exceptions.find(
      exception =>
        name === exception.package &&
        advisory.url === exception.url &&
        advisory.severity === exception.severity &&
        Date.now() < Date.parse(exception.expires) &&
        vulnerability.nodes.length > 0 &&
        vulnerability.nodes.every(
          node =>
            node === `node_modules/${exception.package}` &&
            lock.packages[node]?.version === exception.version,
        ) &&
        Object.entries(exception.files ?? {}).every(([file, expected]) => {
          try {
            return (
              createHash('sha256')
                .update(fs.readFileSync(file))
                .digest('hex') === expected
            );
          } catch {
            return false;
          }
        }),
    );
    if (accepted) reviewed += 1;
    else failures.push(`${name}: ${advisory.url}`);
  }
}
if (failures.length) {
  console.error(
    'Unreviewed dependency vulnerabilities:\n' + failures.join('\n'),
  );
  process.exitCode = 1;
} else {
  console.log(
    `Native dependency audit passed with ${reviewed} temporary build-tool exception(s).`,
  );
  if (reviewed)
    console.log(
      'Only exact reviewed advisories are accepted. deepmerge additionally requires verified patched-file hashes. See docs/dependency-security.md.',
    );
}
