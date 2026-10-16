import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useCommunity } from '../src/hooks/useCommunity';
import type { CommunityClient, CommunitySession } from '../src/lib/community';
import { communityError } from '../src/lib/community';

function mockClient(session: CommunitySession | null = null) {
  let listener: (
    event: string,
    next: CommunitySession | null,
  ) => void = () => {};
  const auth = {
    getSession: jest.fn(async () => ({ data: { session }, error: null })),
    onAuthStateChange: jest.fn((callback: typeof listener) => {
      listener = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }),
    signInWithOtp: jest.fn(async () => ({ error: null })),
    verifyOtp: jest.fn(async () => ({ error: null as unknown })),
    signOut: jest.fn(async () => {
      listener('SIGNED_OUT', null);
      return { error: null };
    }),
  };
  const rpc = jest.fn(async (name: string, _args: Record<string, unknown>) => ({
    data: (name === 'community_list'
      ? []
      : name === 'community_account_state'
      ? [
          {
            policy_accepted: true,
            suspended: false,
            deletion_requested_at: null,
          },
        ]
      : name === 'community_blocks_list'
      ? []
      : null) as unknown,
    error: null as unknown,
  }));
  const client = { auth, rpc } as unknown as CommunityClient;
  return {
    client,
    auth,
    rpc,
    emit: (next: CommunitySession | null) => listener('SIGNED_IN', next),
  };
}
const member: CommunitySession = {
  user: { id: 'member', email_confirmed_at: '2026-10-16', is_anonymous: false },
};

test('guest browsing loads the product without signing in', async () => {
  const m = mockClient();
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-toothpaste'),
  );
  expect(hook.result.current.canContribute).toBe(false);
  expect(m.rpc).toHaveBeenCalledWith('community_list', {
    p_product: 'natural-toothpaste',
    p_offset: 0,
  });
  expect(m.auth.signInWithOtp).not.toHaveBeenCalled();
});
test('requests a normalized email code, blocks immediate resend, and verifies against the sent address', async () => {
  const m = mockClient();
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-toothpaste'),
  );
  await act(() => hook.result.current.setEmail('  Person@Example.com '));
  await act(() => hook.result.current.sendCode());
  expect(m.auth.signInWithOtp).toHaveBeenCalledWith({
    email: 'person@example.com',
  });
  await act(() => hook.result.current.sendCode());
  expect(m.auth.signInWithOtp).toHaveBeenCalledTimes(1);
  await act(() => hook.result.current.setCode('123456'));
  await act(() => hook.result.current.verifyCode());
  expect(m.auth.verifyOtp).toHaveBeenCalledWith({
    email: 'person@example.com',
    token: '123456',
    type: 'email',
  });
  hook.unmount();
});
test('wrong code retains the sent email for retry', async () => {
  const m = mockClient();
  m.auth.verifyOtp.mockResolvedValue({ error: { message: 'expired' } });
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-shampoo'),
  );
  await act(() => hook.result.current.setEmail('person@example.com'));
  await act(() => hook.result.current.sendCode());
  await act(() => hook.result.current.setCode('123456'));
  await act(() => hook.result.current.verifyCode());
  expect(hook.result.current.error).toMatch(/invalid or expired/);
  expect(hook.result.current.sentEmail).toBe('person@example.com');
  hook.unmount();
});
test('preserves a draft on a failed write, clears it on success, and revokes contribution on sign-out', async () => {
  const m = mockClient(member);
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-shampoo'),
  );
  await waitFor(() => expect(hook.result.current.canContribute).toBe(true));
  await act(() => hook.result.current.setDraft('  My ingredient swap  '));
  m.rpc.mockImplementationOnce(async () => ({
    data: null,
    error: { code: 'P0001', message: 'Too many actions.' },
  }));
  await act(() => hook.result.current.post());
  expect(hook.result.current.draft).toBe('  My ingredient swap  ');
  expect(hook.result.current.error).toMatch(/Too many/);
  await act(() => hook.result.current.post());
  expect(m.rpc).toHaveBeenCalledWith('community_post', {
    p_product: 'natural-shampoo',
    p_body: 'My ingredient swap',
  });
  expect(hook.result.current.draft).toBe('');
  await act(() => hook.result.current.signOut());
  expect(hook.result.current.canContribute).toBe(false);
});
test('unverified sessions cannot contribute', async () => {
  const m = mockClient({ user: { id: 'unverified' } });
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-shampoo'),
  );
  expect(hook.result.current.canContribute).toBe(false);
});
test('setup errors are actionable and unexpected errors do not expose backend details', () => {
  expect(communityError({ code: 'PGRST202' })).toMatch(/setup is not complete/);
  expect(
    communityError({ message: 'private database information' }),
  ).not.toMatch(/private database/);
});

test('does not send a vote request for an owned comment', async () => {
  const m = mockClient(member);
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-shampoo'),
  );
  await act(() =>
    hook.result.current.vote({
      id: 'own-comment',
      nickname: 'Community member',
      body: 'My comment',
      created_at: '2026-10-16',
      votes: 0,
      upvoted: false,
      mine: true,
      reported: false,
    }),
  );
  expect(m.rpc).not.toHaveBeenCalledWith('community_vote', expect.anything());
  expect(hook.result.current.notice).toMatch(/own comment/);
});

test('unaccepted account cannot post and acceptance uses the current server version', async () => {
  const m = mockClient(member);
  let accepted = false;
  m.rpc.mockImplementation(async name => {
    if (name === 'community_accept_policy') accepted = true;
    return {
      data:
        name === 'community_account_state'
          ? [
              {
                policy_accepted: accepted,
                suspended: false,
                deletion_requested_at: null,
              },
            ]
          : [],
      error: null,
    };
  });
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-glass-cleaner'),
  );
  await waitFor(() => expect(hook.result.current.accountReady).toBe(true));
  expect(hook.result.current.canContribute).toBe(false);
  await act(() => hook.result.current.setDraft('My general experience'));
  await act(() => hook.result.current.post());
  expect(m.rpc).not.toHaveBeenCalledWith('community_post', expect.anything());
  await act(() => hook.result.current.acceptPolicy());
  expect(m.rpc).toHaveBeenCalledWith('community_accept_policy', {
    p_version: '2026-10-16.2',
  });
  expect(hook.result.current.canContribute).toBe(true);
});
test('suspended and deletion-requested accounts cannot contribute', async () => {
  for (const state of [
    { policy_accepted: true, suspended: true, deletion_requested_at: null },
    {
      policy_accepted: true,
      suspended: false,
      deletion_requested_at: '2026-10-16',
    },
  ]) {
    const m = mockClient(member);
    m.rpc.mockImplementation(async name => ({
      data: name === 'community_account_state' ? [state] : [],
      error: null,
    }));
    const hook = await renderHook(() =>
      useCommunity(m.client, 'natural-glass-cleaner'),
    );
    await waitFor(() => expect(hook.result.current.accountReady).toBe(true));
    expect(hook.result.current.canContribute).toBe(false);
    expect(hook.result.current.canManage).toBe(false);
    await hook.unmount();
  }
});
test('blocking addresses content without exposing another account id and refreshes private blocks', async () => {
  const m = mockClient(member);
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-glass-cleaner'),
  );
  await waitFor(() => expect(hook.result.current.accountReady).toBe(true));
  await act(() => hook.result.current.block('recipe', 'content-id'));
  expect(m.rpc).toHaveBeenCalledWith('community_block', {
    p_kind: 'recipe',
    p_content: 'content-id',
  });
  expect(hook.result.current.notice).toMatch(/blocked/);
  await act(() => hook.result.current.requestDeletion());
  expect(m.rpc).toHaveBeenCalledWith('community_request_deletion', {});
});
