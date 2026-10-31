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
  adminStatus = 200,
  adminTarget = victim,
} = {}) {
  const calls = [];
  let photoBatches = 0;
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
      if (url.endsWith('/rpc/community_admin_prepare_deletion'))
        return data(adminTarget, adminStatus);
      if (url.includes('/community_photo_folders')) return data([]);
      if (url.includes('/rest/v1/'))
        return data(requested ? [{ deletion_requested_at: '2026-10-16' }] : []);
      if (url.includes('/object/list/'))
        return storageFail
          ? data({}, 503)
          : url.endsWith('/object/list/recipe-photos')
          ? data(
              photoBatches++ === 0
                ? [{ name: maliciousPath ? '../other/file.jpg' : 'photo.jpg' }]
                : [],
            )
          : data([{ name: 'avatar.jpeg' }]);
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
  assert.equal(deletes.length, 3);
  assert.deepEqual(JSON.parse(deletes[0].body).prefixes, [
    `${owner}/photo.jpg`,
  ]);
  assert.equal(
    deletes[1].url,
    'https://supabase.example.invalid/storage/v1/object/profile-avatars',
  );
  assert.deepEqual(JSON.parse(deletes[1].body).prefixes, [
    `${owner}/avatar.jpeg`,
  ]);
  assert.equal(
    deletes[2].url,
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

const adminRequest = (overrides = {}) =>
  new Request('https://function.example.invalid', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-admin-token' },
    body: JSON.stringify({
      action: 'admin-delete',
      user_id: victim,
      email: 'target@example.invalid',
      reason: 'Account removal requested',
      ...overrides,
    }),
  });
test('admin deletion uses caller authorization before any cleanup and deletes only the authorized target', async () => {
  const f = fixture();
  assert.equal((await f.handler(adminRequest())).status, 200);
  const authorize = f.calls.find(call =>
    call.url.endsWith('/rpc/community_admin_prepare_deletion'),
  );
  assert.equal(authorize.headers.Authorization, 'Bearer test-admin-token');
  assert.equal(JSON.parse(authorize.body).p_user, victim);
  const deletes = f.calls.filter(call => call.method === 'DELETE');
  assert.deepEqual(JSON.parse(deletes[0].body).prefixes, [
    `${victim}/photo.jpg`,
  ]);
  assert.deepEqual(JSON.parse(deletes[1].body).prefixes, [
    `${victim}/avatar.jpeg`,
  ]);
  assert.ok(deletes[2].url.endsWith(`/auth/v1/admin/users/${victim}`));
  assert.deepEqual(JSON.parse(deletes[2].body), { should_soft_delete: false });
  assert.ok(
    !f.calls.some(call => call.url.includes(`/auth/v1/admin/users/${owner}`)),
  );
});
test('denied or mismatched admin authorization never reaches storage or Auth deletion', async () => {
  for (const config of [
    { adminStatus: 403 },
    { adminStatus: 409 },
    { adminStatus: 500 },
    { adminTarget: owner },
    { adminTarget: 'unexpected' },
  ]) {
    const f = fixture(config);
    assert.ok((await f.handler(adminRequest())).status >= 400);
    assert.ok(
      !f.calls.some(
        call => call.url.includes('/storage/') || call.method === 'DELETE',
      ),
    );
  }
});
test('malformed target requests are rejected before admin RPC or cleanup', async () => {
  for (const body of [
    { user_id: '../other' },
    { email: null },
    { reason: null },
  ]) {
    const f = fixture();
    assert.equal((await f.handler(adminRequest(body))).status, 400);
    assert.equal(f.calls.length, 1);
  }
});
test('admin cleanup failures preserve Auth for retry', async () => {
  const f = fixture({ storageFail: true });
  assert.equal((await f.handler(adminRequest())).status, 503);
  assert.ok(!f.calls.some(call => call.url.includes('/auth/v1/admin/users/')));
});

test('capabilities handshake is read-only and never authenticates, prepares or deletes an account', async () => {
  const f = fixture();
  const response = await f.handler(
    new Request('https://function.example.invalid?action=capabilities'),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { adminDeletionVersion: 1 });
  assert.equal(f.calls.length, 0);
});
test('unknown actions cannot fall through into authenticated self-deletion', async () => {
  const f = fixture();
  const response = await f.handler(
    adminRequest({ action: 'unsupported-admin-action' }),
  );
  assert.equal(response.status, 400);
  assert.ok(!f.calls.some(call => call.method === 'DELETE'));
});
test('admin deletion missing its prepared state returns an admin-specific error without deleting', async () => {
  const f = fixture({ requested: false });
  const response = await f.handler(adminRequest());
  assert.equal(response.status, 409);
  assert.match((await response.json()).message, /Admin deletion preparation/);
  assert.ok(!f.calls.some(call => call.method === 'DELETE'));
});
