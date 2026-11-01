import { spawnSync } from 'node:child_process';
import { verifyDeepmerge } from './verify-deepmerge.mjs';

// npm does not scan local forks. Independently verify the exact patched code.
verifyDeepmerge();
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
const findings = Object.keys(audit.vulnerabilities);
if (findings.length || result.status !== 0) {
  console.error('Production dependency audit failed:', findings.join(', '));
  process.exitCode = 1;
} else {
  console.log(
    'Native production dependency audit passed with zero advisory exceptions.',
  );
}
