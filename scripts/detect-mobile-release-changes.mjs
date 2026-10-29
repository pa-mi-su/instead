import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { classifyPlatformChanges } from './detect-platform-changes.mjs';

const jobNames = { android: 'Android internal testing', ios: 'iOS TestFlight' };

// A green workflow with skipped release jobs is not a published app revision.
export async function detectMobileReleases({ api, head, diff, isAncestor }) {
  const bases = {};
  for (let page = 1; page <= 10; page++) {
    const result = await api(
      `/actions/workflows/mobile-release.yml/runs?branch=main&status=completed&per_page=100&page=${page}`,
    );
    if (!Array.isArray(result.workflow_runs))
      throw new Error('Invalid mobile release history');
    for (const run of result.workflow_runs) {
      if (!isAncestor(run.head_sha, head)) continue;
      const resultJobs = await api(`/actions/runs/${run.id}/jobs?per_page=100`);
      if (!Array.isArray(resultJobs.jobs))
        throw new Error('Invalid mobile release jobs');
      for (const [platform, name] of Object.entries(jobNames)) {
        if (
          !bases[platform] &&
          resultJobs.jobs.some(
            job => job.name === name && job.conclusion === 'success',
          )
        )
          bases[platform] = run.head_sha;
      }
      if (bases.android && bases.ios) break;
    }
    if ((bases.android && bases.ios) || result.workflow_runs.length < 100)
      break;
  }
  return Object.fromEntries(
    Object.keys(jobNames).map(platform => [
      platform,
      bases[platform]
        ? classifyPlatformChanges(diff(bases[platform], head))[platform]
        : true,
    ]),
  );
}

async function main() {
  const { GH_TOKEN, GITHUB_REPOSITORY, HEAD_SHA, GITHUB_OUTPUT } = process.env;
  if (!GH_TOKEN || !GITHUB_REPOSITORY || !HEAD_SHA)
    throw new Error('Missing release history configuration');
  const result = await detectMobileReleases({
    head: HEAD_SHA,
    api: async route => {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPOSITORY}${route}`,
        {
          headers: {
            Authorization: `Bearer ${GH_TOKEN}`,
            Accept: 'application/vnd.github+json',
          },
        },
      );
      if (!response.ok)
        throw new Error(`Release history lookup failed (${response.status})`);
      return response.json();
    },
    isAncestor: (base, head) => {
      try {
        execFileSync('git', ['merge-base', '--is-ancestor', base, head]);
        return true;
      } catch {
        return false;
      }
    },
    diff: (base, head) =>
      execFileSync('git', ['diff', '--name-only', base, head], {
        encoding: 'utf8',
      })
        .split('\n')
        .filter(Boolean),
  });
  const output = Object.entries(result)
    .map(([platform, needed]) => `${platform}=${needed}\n`)
    .join('');
  if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, output);
  process.stdout.write(output);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main();
