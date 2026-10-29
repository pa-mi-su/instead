import test from 'node:test';
import assert from 'node:assert/strict';
import { detectMobileReleases } from './detect-mobile-release-changes.mjs';

function history(runs, jobs, diff, isAncestor = () => true) {
  return detectMobileReleases({
    head: 'head',
    diff,
    isAncestor,
    api: async route => {
      if (route.includes('/workflows/')) return { workflow_runs: runs };
      return { jobs: jobs[route.match(/runs\/(\d+)/)[1]] };
    },
  });
}
const android = { name: 'Android internal testing', conclusion: 'success' };
const ios = { name: 'iOS TestFlight', conclusion: 'success' };
test('a test-only fix includes app changes missed by a failed release', async () => {
  const result = await history(
    [
      { id: 3, head_sha: 'skipped' },
      { id: 2, head_sha: 'failed' },
      { id: 1, head_sha: 'published' },
    ],
    {
      3: [{ ...android, conclusion: 'skipped' }],
      2: [{ ...ios, conclusion: 'failure' }],
      1: [android, ios],
    },
    base => {
      assert.equal(base, 'published');
      return ['src/screens/AccountScreen.tsx', 'jest.config.js'];
    },
  );
  assert.deepEqual(result, { android: true, ios: true });
});
test('each platform uses its own successful release even if the other failed', async () => {
  const result = await history(
    [
      { id: 2, head_sha: 'new-android' },
      { id: 1, head_sha: 'old-ios' },
    ],
    { 2: [android, { ...ios, conclusion: 'failure' }], 1: [android, ios] },
    base => (base === 'new-android' ? ['README.md'] : ['src/styles.ts']),
  );
  assert.deepEqual(result, { android: false, ios: true });
});
test('no release history builds both platforms conservatively', async () => {
  assert.deepEqual(await history([], {}, () => []), {
    android: true,
    ios: true,
  });
});
test('web-only changes since successful uploads do not rebuild mobile', async () => {
  assert.deepEqual(
    await history(
      [{ id: 1, head_sha: 'published' }],
      { 1: [android, ios] },
      () => ['web/app/page.tsx'],
    ),
    { android: false, ios: false },
  );
});
test('non-ancestor releases cannot hide current app changes', async () => {
  assert.deepEqual(
    await history(
      [{ id: 1, head_sha: 'other-branch' }],
      {},
      () => [],
      () => false,
    ),
    { android: true, ios: true },
  );
});
test('API failures stop detection instead of silently skipping releases', async () => {
  await assert.rejects(
    detectMobileReleases({
      head: 'head',
      api: async () => {
        throw new Error('API unavailable');
      },
    }),
    /API unavailable/,
  );
});
