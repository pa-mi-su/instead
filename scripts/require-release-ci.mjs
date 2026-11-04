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
  async function api(route) {
    const response = await fetcher(
      `https://api.github.com/repos/${repository}${route}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      },
    );
    if (!response.ok)
      throw new Error(`Release CI lookup failed (${response.status})`);
    return response.json();
  }
  const data = await api(
    `/actions/workflows/ci.yml/runs?branch=main&event=push&head_sha=${sha}&per_page=100`,
  );
  if (!Array.isArray(data.workflow_runs))
    throw new Error('Invalid release CI response');
  for (const run of data.workflow_runs) {
    if (
      run.head_sha !== sha ||
      run.head_branch !== 'main' ||
      run.event !== 'push' ||
      run.status !== 'completed'
    )
      continue;
    // Deployment failures must remain retryable. Verify the required validation
    // gate, rather than requiring the deploy-containing workflow to be green.
    for (let page = 1; page <= 10; page++) {
      const { jobs } = await api(
        `/actions/runs/${run.id}/jobs?per_page=100&page=${page}`,
      );
      if (!Array.isArray(jobs))
        throw new Error('Invalid release CI jobs response');
      if (
        jobs.some(
          job =>
            job.name === 'Quality and Android' && job.conclusion === 'success',
        )
      )
        return;
      if (jobs.length < 100) break;
    }
  }
  throw new Error(
    'Release blocked: this exact main commit has no successful required CI gate',
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
