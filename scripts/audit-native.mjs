import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

// Temporary, exact exception: React Native's Node build/test glob matching.
// No patched braces version is published. User recipe/photo input is not passed
// to this tool; CI only matches files and patterns from the checked-out source.
const exception = {
  url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
  package: 'braces',
  version: '3.0.3',
  severity: 'high',
  expires: '2026-10-30T00:00:00Z',
};
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
    const accepted =
      name === exception.package &&
      advisory.url === exception.url &&
      advisory.severity === exception.severity &&
      Date.now() < Date.parse(exception.expires) &&
      vulnerability.nodes.length > 0 &&
      vulnerability.nodes.every(
        node =>
          node === 'node_modules/braces' &&
          lock.packages[node]?.version === exception.version,
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
      `braces 3.0.3: ${exception.url}; expires ${exception.expires}. See docs/dependency-security.md.`,
    );
}
