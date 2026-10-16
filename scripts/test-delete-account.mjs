import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source = await fs.readFile(
  new URL('../supabase/functions/delete-account/index.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { createDeletionHandler } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);
const owner = '40000000-0000-0000-0000-000000000001';
const victim = '40000000-0000-0000-0000-000000000002';
function fixture({
  confirmed = true,
  requested = true,
  storageFail = false,
  maliciousPath = false,
  authFail = false,
} = {}) {
  const calls = [];
  let batches = 0;
  const handler = createDeletionHandler(
    { url: 'https://supabase.example.invalid', serviceKey: 'test-service-key' },
    async (url, options = {}) => {
      calls.push({ url, ...options });
      const data = (body, status = 200) =>
        new Response(JSON.stringify(body), { status });
      if (url.endsWith('/auth/v1/user'))
        return authFail
          ? data({}, 401)
          : data({
              id: owner,
              email_confirmed_at: confirmed ? '2026-10-16' : null,
              is_anonymous: false,
            });
      if (url.includes('/community_photo_folders')) return data([]);
      if (url.includes('/rest/v1/'))
        return data(requested ? [{ deletion_requested_at: '2026-10-16' }] : []);
      if (url.includes('/object/list/'))
        return storageFail
          ? data({}, 503)
          : data(
              batches++ === 0
                ? [{ name: maliciousPath ? '../other/file.jpg' : 'photo.jpg' }]
                : [],
            );
      return data({});
    },
  );
  const request = () =>
    new Request('https://function.example.invalid', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-user-token' },
      body: JSON.stringify({ user_id: victim }),
    });
  return { calls, handler, request };
}
test('rejects unauthenticated, unverified, and unconfirmed deletion attempts', async () => {
  const m = fixture();
  assert.equal(
    (
      await m.handler(
        new Request('https://function.example.invalid', { method: 'POST' }),
      )
    ).status,
    401,
  );
  assert.equal(m.calls.length, 0);
  for (const config of [
    { confirmed: false },
    { requested: false },
    { authFail: true },
  ]) {
    const f = fixture(config);
    assert.ok((await f.handler(f.request())).status >= 400);
    assert.ok(!f.calls.some(call => call.method === 'DELETE'));
  }
});
test('only deletes the authenticated owner, removes photos first, and ignores caller target ids', async () => {
  const m = fixture();
  const response = await m.handler(m.request());
  assert.equal(response.status, 200);
  const deletes = m.calls.filter(call => call.method === 'DELETE');
  assert.equal(deletes.length, 2);
  assert.deepEqual(JSON.parse(deletes[0].body).prefixes, [
    `${owner}/photo.jpg`,
  ]);
  assert.equal(
    deletes[1].url,
    `https://supabase.example.invalid/auth/v1/admin/users/${owner}`,
  );
  assert.ok(m.calls.every(call => !call.url.includes(victim)));
  assert.ok(!(await response.text()).includes('test-service-key'));
});
test('never deletes auth account when photo cleanup fails or a path escapes its owner folder', async () => {
  for (const config of [{ storageFail: true }, { maliciousPath: true }]) {
    const m = fixture(config);
    assert.equal((await m.handler(m.request())).status, 503);
    assert.ok(
      !m.calls.some(call => call.url.includes('/auth/v1/admin/users/')),
    );
  }
});
