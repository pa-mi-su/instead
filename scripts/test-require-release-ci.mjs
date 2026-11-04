import test from 'node:test';
import assert from 'node:assert/strict';
import { requireReleaseCI } from './require-release-ci.mjs';
const sha = 'a'.repeat(40);
const successful = {
  id: 1,
  head_sha: sha,
  head_branch: 'main',
  event: 'push',
  status: 'completed',
  conclusion: 'success',
};
const config = { repository: 'example/app', sha, token: 'test-token' };
const response =
  (runs, conclusion = 'success') =>
  async url => ({
    ok: true,
    json: async () =>
      url.includes('/jobs?')
        ? { jobs: [{ name: 'Quality and Android', conclusion }] }
        : { workflow_runs: runs },
  });
test('manual release requires successful CI for the exact main revision', async () => {
  await requireReleaseCI({ ...config, fetcher: response([successful]) });
  for (const change of [
    { head_sha: 'b'.repeat(40) },
    { head_branch: 'feature' },
    { event: 'pull_request' },
    { status: 'in_progress' },
  ]) {
    await assert.rejects(
      requireReleaseCI({
        ...config,
        fetcher: response([{ ...successful, ...change }]),
      }),
      /Release blocked/,
    );
  }
  await assert.rejects(
    requireReleaseCI({ ...config, fetcher: response([]) }),
    /Release blocked/,
  );
});
test('CI API failures block a manual release', async () => {
  await assert.rejects(
    requireReleaseCI({
      ...config,
      fetcher: async () => ({ ok: false, status: 403 }),
    }),
    /lookup failed/,
  );
});

test('failed deployment can retry when the exact main validation gate passed', async () => {
  await requireReleaseCI({
    ...config,
    fetcher: response([{ ...successful, conclusion: 'failure' }]),
  });
  for (const conclusion of ['failure', 'cancelled', 'skipped'])
    await assert.rejects(
      requireReleaseCI({
        ...config,
        fetcher: response([successful], conclusion),
      }),
      /Release blocked/,
    );
});
