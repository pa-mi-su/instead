import { fileURLToPath } from 'node:url';
import path from 'node:path';

export async function requireReleaseCI({
  repository,
  sha,
  token,
  fetcher = fetch,
}) {
  if (!repository || !/^[a-f0-9]{40}$/.test(sha || '') || !token)
    throw new Error('Missing release CI verification configuration');
  const response = await fetcher(
    `https://api.github.com/repos/${repository}/actions/workflows/ci.yml/runs?branch=main&event=push&head_sha=${sha}&per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    },
  );
  if (!response.ok)
    throw new Error(`Release CI lookup failed (${response.status})`);
  const data = await response.json();
  const runs = data.workflow_runs;
  if (!Array.isArray(runs)) throw new Error('Invalid release CI response');
  if (
    !runs.some(
      run =>
        run.head_sha === sha &&
        run.head_branch === 'main' &&
        run.event === 'push' &&
        run.status === 'completed' &&
        run.conclusion === 'success',
    )
  )
    throw new Error(
      'Release blocked: this exact main commit has no successful CI run',
    );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await requireReleaseCI({
    repository: process.env.GITHUB_REPOSITORY,
    sha: process.env.HEAD_SHA,
    token: process.env.GH_TOKEN,
  });
}
