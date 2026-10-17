import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reserveBuild } from './reserve-mobile-build.mjs';
const config = {
  platform: 'android',
  repository: 'example/app',
  sha: 'abc',
  token: 'test-only',
};
function response(status, data) {
  return { status, ok: status >= 200 && status < 300, json: async () => data };
}
test('both platforms continue above the old upload floor, then increase by one', async () => {
  for (const platform of ['android', 'ios']) {
    const refs = [];
    const fetcher = async (_url, options) => {
      if (options.method !== 'POST') return response(200, refs);
      const ref = JSON.parse(options.body).ref;
      refs.push({ ref });
      return response(201, {});
    };
    assert.equal(await reserveBuild({ ...config, platform, fetcher }), 402);
    assert.equal(await reserveBuild({ ...config, platform, fetcher }), 403);
  }
});
test('a concurrent reservation collision obtains the next number', async () => {
  let reads = 0;
  const fetcher = async (_url, options) => {
    if (options.method !== 'POST')
      return response(
        200,
        reads++ ? [{ ref: 'refs/tags/instead-build-android-402' }] : [],
      );
    return response(
      JSON.parse(options.body).ref.endsWith('-402') ? 422 : 201,
      {},
    );
  };
  assert.equal(await reserveBuild({ ...config, fetcher }), 403);
});
test('lookup or write failures stop the release rather than reuse a number', async () => {
  await assert.rejects(
    reserveBuild({ ...config, fetcher: async () => response(403, {}) }),
    /lookup failed/,
  );
  await assert.rejects(
    reserveBuild({
      ...config,
      fetcher: async (_url, opts) =>
        opts.method === 'POST' ? response(403, {}) : response(200, []),
    }),
    /reservation failed/,
  );
});
