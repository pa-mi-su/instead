import test from 'node:test';
import assert from 'node:assert/strict';
import { playRelease } from './google-play-release.mjs';

test('production, closed, open and internal destinations are supported', () => {
  for (const track of ['production', 'alpha', 'beta', 'internal'])
    assert.deepEqual(playRelease({ track, name: '1.0' }), {
      name: '1.0',
      status: 'completed',
    });
});
test('staged production rollout includes the requested fraction', () => {
  assert.deepEqual(
    playRelease({ track: 'production', status: 'inProgress', fraction: '0.1' }),
    {
      name: undefined,
      status: 'inProgress',
      userFraction: 0.1,
    },
  );
});
test('invalid destination or rollout fails before uploading', () => {
  for (const config of [
    { track: 'unknown' },
    { track: 'production', status: 'halted' },
    { track: 'production', status: 'inProgress' },
    { track: 'production', status: 'inProgress', fraction: '1' },
    { track: 'internal', status: 'inProgress', fraction: '.2' },
    { track: 'production', status: 'completed', fraction: '.2' },
  ])
    assert.throws(() => playRelease(config));
});

const { commitPlayEdit, PlayRequestError, reviewMode } = await import(
  './google-play-release.mjs'
);
const editUrl =
  'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/test/edits/123';
const rejection = () =>
  new PlayRequestError(
    400,
    JSON.stringify({
      error: {
        message:
          'Changes cannot be sent for review automatically. Please set the query parameter changesNotSentForReview to true. Once committed, send from Console.',
      },
    }),
  );

test('normal commit protects an existing review and has an empty request body', async () => {
  const calls = [];
  assert.equal(
    await commitPlayEdit({
      editUrl,
      request: async (...args) => calls.push(args),
    }),
    'committed',
  );
  assert.equal(calls.length, 1);
  const [url, options] = calls[0];
  assert.equal(
    new URL(url).searchParams.get('changesInReviewBehavior'),
    'ERROR_IF_IN_REVIEW',
  );
  assert.equal(new URL(url).searchParams.has('changesNotSentForReview'), false);
  assert.deepEqual(options, { method: 'POST' });
});

test('rejection-specific fallback commits the same edit without rebuilding or uploading', async () => {
  const urls = [];
  assert.equal(
    await commitPlayEdit({
      editUrl,
      request: async url => {
        urls.push(new URL(url));
        if (urls.length === 1) throw rejection();
      },
    }),
    'saved-for-review',
  );
  assert.equal(urls.length, 2);
  assert.equal(urls[0].pathname, urls[1].pathname);
  assert.equal(urls[1].searchParams.get('changesNotSentForReview'), 'true');
  assert.equal(
    urls[1].searchParams.get('changesInReviewBehavior'),
    'ERROR_IF_IN_REVIEW',
  );
});

test('explicit save mode never attempts automatic review submission', async () => {
  const urls = [];
  assert.equal(
    await commitPlayEdit({
      editUrl,
      mode: 'save',
      request: async url => urls.push(url),
    }),
    'saved-for-review',
  );
  assert.equal(urls.length, 1);
  assert.equal(
    new URL(urls[0]).searchParams.get('changesNotSentForReview'),
    'true',
  );
});

test('other errors and uncertain commit outcomes never trigger a second mutation', async () => {
  for (const error of [
    new Error('network timeout'),
    new PlayRequestError(503, '{}'),
    new PlayRequestError(401, '{}'),
    new PlayRequestError(
      400,
      JSON.stringify({ error: { message: 'CHANGES_ALREADY_IN_REVIEW' } }),
    ),
    new PlayRequestError(
      400,
      JSON.stringify({ error: { message: 'App invalid' } }),
    ),
  ]) {
    let count = 0;
    await assert.rejects(
      commitPlayEdit({
        editUrl,
        request: async () => {
          count++;
          throw error;
        },
      }),
    );
    assert.equal(count, 1);
  }
  let count = 0;
  await assert.rejects(
    commitPlayEdit({
      editUrl,
      request: async () => {
        count++;
        throw rejection();
      },
    }),
  );
  assert.equal(count, 2, 'fallback failure is surfaced, not retried forever');
});

test('invalid review modes fail before any mutation', async () => {
  assert.equal(reviewMode(), 'auto');
  let count = 0;
  await assert.rejects(
    commitPlayEdit({ editUrl, mode: 'anything', request: async () => count++ }),
  );
  assert.equal(count, 0);
});
