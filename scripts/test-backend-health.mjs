import assert from 'node:assert/strict';
import test from 'node:test';
import { checkBackendHealth } from './check-backend-health.mjs';

const config = {
  url: 'https://example.supabase.co',
  key: 'sb_publishable_test',
};
const response = value => new Response(JSON.stringify(value));

test('checks email authentication and makes a bounded anonymous database read', async () => {
  const calls = [];
  await checkBackendHealth({
    ...config,
    request: async (url, options) => {
      calls.push([url, options]);
      return response(
        calls.length === 1 ? { external: { email: true } } : [{ id: 'guide' }],
      );
    },
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[1][0].pathname, '/rest/v1/guides');
  assert.equal(calls[1][0].searchParams.get('limit'), '1');
  assert.equal(calls[1][0].searchParams.get('published'), 'eq.true');
  for (const [, options] of calls) {
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.apikey, config.key);
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.headers.Authorization, undefined);
  }
});

test('an empty published catalogue still proves database reachability', async () => {
  await checkBackendHealth({
    ...config,
    request: async url =>
      response(
        url.pathname.includes('/auth/') ? { external: { email: true } } : [],
      ),
  });
});

for (const [name, request, expected] of [
  [
    'DNS failure',
    async () => {
      throw new Error('private upstream detail');
    },
    /connection failed/,
  ],
  [
    'HTTP failure',
    async () => new Response('private upstream detail', { status: 503 }),
    /HTTP 503/,
  ],
  ['invalid JSON', async () => new Response('not JSON'), /invalid JSON/],
  [
    'disabled email auth',
    async () => response({ external: { email: false } }),
    /unexpected response/,
  ],
  [
    'database error body',
    async url =>
      response(
        url.pathname.includes('/auth/')
          ? { external: { email: true } }
          : { error: 'denied' },
      ),
    /unexpected response/,
  ],
]) {
  test(`fails visibly on ${name} without leaking upstream details`, async () => {
    await assert.rejects(checkBackendHealth({ ...config, request }), error => {
      assert.match(error.message, expected);
      assert.doesNotMatch(error.message, /private upstream detail/);
      return true;
    });
  });
}

test('rejects missing config, elevated keys, and redirected credential destinations', async () => {
  for (const invalid of [
    { url: '' },
    { key: '' },
    { key: 'sb_secret_never_use' },
    { url: 'http://example.supabase.co' },
    { url: 'https://example.supabase.co.attacker.com' },
    { url: 'https://user@example.supabase.co' },
    { url: 'https://example.supabase.co/path' },
  ]) {
    await assert.rejects(
      checkBackendHealth({
        ...config,
        ...invalid,
        request: async () =>
          assert.fail('Must reject before sending any request'),
      }),
    );
  }
});
