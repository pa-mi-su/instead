import {
  clearInvalidSession,
  readStoredSession,
  validateSession,
} from '../src/lib/sessionValidation';
import type { CommunityClient, CommunitySession } from '../src/lib/community';
const old: CommunitySession = {
  access_token: 'old-token',
  user: { id: 'old', email_confirmed_at: '2026-11-06' },
};
function fixture() {
  const getUser = jest.fn(async (_jwt?: string) => ({
    data: { user: old.user as CommunitySession['user'] | null },
    error: null as unknown,
  }));
  const getSession = jest.fn(async () => ({
    data: { session: old as CommunitySession | null },
    error: null,
  }));
  const signOut = jest.fn(async () => ({ error: null }));
  return {
    getUser,
    getSession,
    signOut,
    client: {
      auth: { getUser, getSession, signOut },
    } as unknown as CommunityClient,
  };
}
test('validation coalesces in-flight checks but never caches a prior success', async () => {
  const f = fixture();
  await Promise.all([
    validateSession(f.client, old),
    validateSession(f.client, old),
  ]);
  expect(f.getUser).toHaveBeenCalledTimes(1);
  expect(f.getUser).toHaveBeenCalledWith('old-token');
  f.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
  expect((await validateSession(f.client, old)).status).toBe('invalid');
  expect(f.getUser).toHaveBeenCalledTimes(2);
});
test('late invalidation never clears a newer login or refreshed token', async () => {
  const f = fixture();
  f.getSession.mockResolvedValue({
    data: { session: { ...old, access_token: 'new-token' } },
    error: null,
  });
  await clearInvalidSession(f.client, old);
  expect(f.signOut).not.toHaveBeenCalled();
});
test('null, mismatched and unverified live identities cannot validate a stored session', async () => {
  const f = fixture();
  for (const user of [
    null,
    { id: 'different', email_confirmed_at: '2026-11-06' },
    { id: 'old' },
  ]) {
    f.getUser.mockResolvedValue({ data: { user }, error: null });
    expect((await validateSession(f.client, old)).status).toBe('invalid');
  }
});
test('transient lookup errors preserve storage and validation has a finite deadline', async () => {
  const f = fixture();
  f.getUser.mockRejectedValueOnce(new Error('Network request failed'));
  expect((await validateSession(f.client, old)).status).toBe('unavailable');
  expect(f.signOut).not.toHaveBeenCalled();
  jest.useFakeTimers();
  f.getUser.mockImplementation(() => new Promise(() => undefined));
  const check = validateSession(f.client, old);
  await jest.advanceTimersByTimeAsync(15001);
  expect((await check).status).toBe('unavailable');
  jest.useRealTimers();
});

test('a stalled stored-session refresh has a finite deadline', async () => {
  const f = fixture();
  jest.useFakeTimers();
  f.getSession.mockImplementation(() => new Promise(() => undefined));
  const check = readStoredSession(f.client);
  const assertion = expect(check).rejects.toThrow('Session check timed out');
  await jest.advanceTimersByTimeAsync(15001);
  await assertion;
  jest.useRealTimers();
});
