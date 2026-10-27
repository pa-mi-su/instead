import test from 'node:test';
import assert from 'node:assert/strict';
import { checkProfileAvatars } from './check-profile-avatars.mjs';
const config = {
  url: 'https://supabase.example.invalid',
  key: 'sb_publishable_test',
};
const response = (data, status) =>
  new Response(JSON.stringify(data), { status });

test('readiness verifies storage and rejects anonymous avatar updates without using an account', async () => {
  const calls = [];
  await checkProfileAvatars(config, async (url, options) => {
    calls.push({ url, ...options });
    return url.includes('/storage/')
      ? response({ code: 'NoSuchKey', message: 'Object not found' }, 400)
      : response({ code: '42501' }, 401);
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(calls[1].body), { p_avatar_path: null });
});
test('missing bucket, missing RPC, backend errors, and unsafe public writes block release', async () => {
  for (const failure of ['bucket', 'rpc', 'server', 'public-write']) {
    await assert.rejects(
      checkProfileAvatars(config, async url => {
        if (url.includes('/storage/'))
          return failure === 'bucket'
            ? response(
                { code: 'NoSuchBucket', message: 'Bucket not found' },
                400,
              )
            : failure === 'server'
            ? response({}, 503)
            : response({ code: 'NoSuchKey' }, 400);
        return failure === 'public-write'
          ? response(null, 200)
          : response({ code: 'PGRST202' }, 404);
      }),
      /Apply supabase\/profile-avatars.sql/,
    );
  }
});
test('privileged keys never reach the network', async () => {
  let called = false;
  await assert.rejects(
    checkProfileAvatars({ ...config, key: 'sb_secret_test' }, async () => {
      called = true;
    }),
    /never a privileged key/,
  );
  assert.equal(called, false);
});
