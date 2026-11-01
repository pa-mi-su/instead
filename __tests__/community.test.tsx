import { notifyCommunityChanged } from '../src/lib/communityUpdates';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useCommunity } from '../src/hooks/useCommunity';
import type { CommunityClient, CommunitySession } from '../src/lib/community';
import { communityError, profileError } from '../src/lib/community';

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
    resetPasswordForEmail: jest.fn(async () => ({ error: null as unknown })),
    signInWithPassword: jest.fn(async () => ({ error: null as unknown })),
    signUp: jest.fn(async () => ({
      data: { session: null, user: { identities: [{ id: 'new-user' }] } },
      error: null as unknown,
    })),
    verifyOtp: jest.fn(async () => ({ error: null as unknown })),
    updateUser: jest.fn(async () => ({ error: null })),
    signOut: jest.fn(async () => {
      listener('SIGNED_OUT', null);
      return { error: null };
    }),
  };
  const rpc = jest.fn(async (name: string, _args: Record<string, unknown>) => ({
    data: (name === 'community_list' || name === 'recipe_comments_list'
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
      : name === 'community_profile_me'
      ? []
      : null) as unknown,
    error: null as unknown,
  }));
  const storage = {
    from: jest.fn(() => ({
      upload: jest.fn(async () => ({ error: null as unknown })),
      remove: jest.fn(async () => ({ error: null })),
      getPublicUrl: jest.fn((path: string) => ({
        data: { publicUrl: `https://storage.example.invalid/${path}` },
      })),
      createSignedUrl: jest.fn(async (path: string) => ({
        data: { signedUrl: `https://storage.example.invalid/${path}` },
        error: null,
      })),
    })),
  };
  const client = { auth, rpc, storage } as unknown as CommunityClient;
  return {
    client,
    auth,
    rpc,
    storage,
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
test('requests a recovery code only from recovery mode and verifies against the sent address', async () => {
  const m = mockClient();
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-toothpaste'),
  );
  await act(() => hook.result.current.setAuthMode('recovery'));
  await act(() => hook.result.current.setEmail('  Person@Example.com '));
  await act(() => hook.result.current.sendCode());
  expect(m.auth.resetPasswordForEmail).toHaveBeenCalledWith(
    'person@example.com',
  );
  await act(() => hook.result.current.sendCode());
  expect(m.auth.resetPasswordForEmail).toHaveBeenCalledTimes(1);
  await act(() => hook.result.current.setCode('123456'));
  await act(() => hook.result.current.verifyCode());
  expect(m.auth.verifyOtp).toHaveBeenCalledWith({
    email: 'person@example.com',
    token: '123456',
    type: 'recovery',
  });
  hook.unmount();
});
test('signs in with a normalized email and password', async () => {
  const m = mockClient();
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-toothpaste'),
  );
  await act(() => hook.result.current.setEmail(' Person@Example.com '));
  await act(() => hook.result.current.setPassword('long-enough-password'));
  await act(() => hook.result.current.signIn());
  expect(m.auth.signInWithPassword).toHaveBeenCalledWith({
    email: 'person@example.com',
    password: 'long-enough-password',
  });
  expect(hook.result.current.notice).toMatch(/signed in/i);
  hook.unmount();
});
test('marks sign-in failures as authentication errors and clears them when changing modes', async () => {
  const m = mockClient();
  m.auth.signInWithPassword.mockResolvedValue({
    error: { code: 'invalid_credentials' },
  });
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-toothpaste'),
  );
  await act(() => hook.result.current.setEmail('person@example.com'));
  await act(() => hook.result.current.setPassword('wrong-password'));
  await act(() => hook.result.current.signIn());
  expect(hook.result.current.errorSource).toBe('auth');
  expect(hook.result.current.error).toMatch(/email or password is incorrect/i);
  await act(() => hook.result.current.setAuthMode('signup'));
  expect(hook.result.current.error).toBe('');
  hook.unmount();
});
test('creates an account and stores the public profile only after email confirmation', async () => {
  const m = mockClient();
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-toothpaste'),
  );
  await act(() => hook.result.current.setAuthMode('signup'));
  await act(() => hook.result.current.setEmail(' Person@Example.com '));
  await act(() => hook.result.current.setUsername('RecipeMaker'));
  await act(() => hook.result.current.setPassword('long-enough-password'));
  await act(() =>
    hook.result.current.setPasswordConfirmation('long-enough-password'),
  );
  await act(() => hook.result.current.signUp());
  expect(m.auth.signUp).toHaveBeenCalledWith({
    email: 'person@example.com',
    password: 'long-enough-password',
  });
  expect(m.rpc).not.toHaveBeenCalledWith(
    'community_profile_set',
    expect.anything(),
  );
  await act(() => hook.result.current.setCode('123456'));
  await act(() => hook.result.current.verifyCode());
  expect(m.auth.verifyOtp).toHaveBeenCalledWith({
    email: 'person@example.com',
    token: '123456',
    type: 'signup',
  });
  expect(m.rpc).toHaveBeenCalledWith('community_profile_set', {
    p_username: 'RecipeMaker',
    p_bio: '',
  });
  expect(hook.result.current.notice).toMatch(/account is ready/i);
  hook.unmount();
});
test('returns an existing email to sign-in instead of waiting for a code that was not sent', async () => {
  const m = mockClient();
  m.auth.signUp.mockResolvedValue({
    data: { session: null, user: { identities: [] } },
    error: null,
  });
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-toothpaste'),
  );
  await act(() => hook.result.current.setAuthMode('signup'));
  await act(() => hook.result.current.setEmail('person@example.com'));
  await act(() => hook.result.current.setUsername('RecipeMaker'));
  await act(() => hook.result.current.setPassword('long-enough-password'));
  await act(() =>
    hook.result.current.setPasswordConfirmation('long-enough-password'),
  );
  await act(() => hook.result.current.signUp());
  expect(hook.result.current.authMode).toBe('signin');
  expect(hook.result.current.pendingAuth).toBeNull();
  expect(hook.result.current.sentEmail).toBe('');
  expect(hook.result.current.password).toBe('');
  expect(hook.result.current.notice).toMatch(/no confirmation code was sent/i);
  hook.unmount();
});
test('shows explicit local password validation before trying account creation', async () => {
  const m = mockClient();
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-toothpaste'),
  );
  await act(() => hook.result.current.setAuthMode('signup'));
  await act(() => hook.result.current.setEmail('person@example.com'));
  await act(() => hook.result.current.setUsername('RecipeMaker'));
  await act(() => hook.result.current.setPassword('short'));
  await act(() => hook.result.current.setPasswordConfirmation('short'));
  await act(() => hook.result.current.signUp());
  expect(hook.result.current.errorSource).toBe('validation');
  expect(hook.result.current.error).toMatch(/at least 10 characters/i);
  expect(m.auth.signUp).not.toHaveBeenCalled();
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
test('account safeguard failures stop loading, explain the state, and can be retried', async () => {
  const m = mockClient(member);
  const original = m.rpc.getMockImplementation()!;
  let fail = true;
  m.rpc.mockImplementation(async (name, args) =>
    name === 'community_account_state' && fail
      ? { data: null, error: { code: 'PGRST202', message: 'missing' } }
      : original(name, args),
  );
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-toothpaste'),
  );
  await waitFor(() => expect(hook.result.current.accountLoading).toBe(false));
  expect(hook.result.current.accountReady).toBe(false);
  expect(hook.result.current.accountLoadError).toMatch(
    /setup is not complete/i,
  );
  expect(hook.result.current.canEditProfile).toBe(true);
  fail = false;
  await act(() => hook.result.current.retryAccount());
  await waitFor(() => expect(hook.result.current.accountReady).toBe(true));
  hook.unmount();
});
test('updates profile details and avatar without depending on account safeguards', async () => {
  const m = mockClient(member);
  const original = m.rpc.getMockImplementation()!;
  m.rpc.mockImplementation(async (name, args) =>
    name === 'community_account_state'
      ? { data: null, error: { code: 'PGRST202', message: 'missing' } }
      : original(name, args),
  );
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-toothpaste'),
  );
  await waitFor(() => expect(hook.result.current.accountLoading).toBe(false));
  await act(() => hook.result.current.setUsername('ProfileOwner'));
  await act(() => hook.result.current.setBio('A short public bio.'));
  const uploaded = {
    bytes: new ArrayBuffer(8),
    contentType: 'image/jpeg' as const,
  };
  let saved = false;
  await act(async () => {
    saved = await hook.result.current.saveProfile(uploaded);
  });
  expect(saved).toBe(true);
  expect(m.storage.from).toHaveBeenCalledWith('profile-avatars');
  expect(m.rpc).toHaveBeenCalledWith('community_profile_set', {
    p_username: 'ProfileOwner',
    p_bio: 'A short public bio.',
  });
  expect(m.rpc).toHaveBeenCalledWith('community_profile_avatar_set', {
    p_avatar_path: 'member/avatar.jpeg',
  });
  expect(hook.result.current.notice).toMatch(/profile updated/i);
  hook.unmount();
});
test('setup errors are actionable and unexpected errors do not expose backend details', () => {
  expect(communityError({ code: 'PGRST202' })).toMatch(/setup is not complete/);
  expect(
    communityError({ message: 'private database information' }),
  ).not.toMatch(/private database/);
});

test('authentication errors explain the next step without exposing service details', () => {
  expect(communityError({ code: 'invalid_credentials' })).toMatch(
    /email or password is incorrect.*forgot or set password/i,
  );
  expect(communityError({ code: 'user_already_exists' })).toMatch(
    /already has an account.*sign in/i,
  );
  expect(communityError({ code: 'email_not_confirmed' })).toMatch(
    /confirm your email/i,
  );
  expect(communityError({ code: 'weak_password' })).toMatch(/10 characters/i);
  expect(communityError({ code: 'over_email_send_rate_limit' })).toMatch(
    /wait a few minutes/i,
  );
  expect(communityError(new TypeError('Network request failed'))).toMatch(
    /could not reach the sign-in service/i,
  );
  expect(communityError(new Error('Enter your password.'))).toBe(
    'Enter your password.',
  );
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
    p_version: '2026-10-19.1',
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

test('recipe discussions read and post only to the selected recipe', async () => {
  const m = mockClient(member);
  const hook = await renderHook(() =>
    useCommunity(
      m.client,
      'natural-glass-cleaner',
      'builtin:glassCleanerRecipe',
      'newest',
    ),
  );
  await waitFor(() => expect(hook.result.current.canContribute).toBe(true));
  expect(m.rpc).toHaveBeenCalledWith('recipe_comments_list', {
    p_product: 'natural-glass-cleaner',
    p_recipe: 'builtin:glassCleanerRecipe',
    p_offset: 0,
    p_sort: 'newest',
  });
  await act(() => hook.result.current.setDraft('I use a lint-free cloth.'));
  await act(() => hook.result.current.post());
  expect(m.rpc).toHaveBeenCalledWith('recipe_comment_post', {
    p_product: 'natural-glass-cleaner',
    p_recipe: 'builtin:glassCleanerRecipe',
    p_body: 'I use a lint-free cloth.',
  });
  expect(m.rpc.mock.calls.some(([name]) => name === 'community_post')).toBe(
    false,
  );
  await hook.unmount();
});

test('a missing avatar bucket gives a profile-scoped error and closing clears it', async () => {
  const m = mockClient(member);
  const bucket = m.storage.from();
  bucket.upload.mockResolvedValue({
    error: { code: 'NoSuchBucket', message: 'Bucket not found' },
  });
  m.storage.from.mockReturnValue(bucket);
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-toothpaste'),
  );
  await waitFor(() => expect(hook.result.current.accountLoading).toBe(false));
  await act(() => hook.result.current.setUsername('NewPhotoUser'));
  let saved = true;
  await act(async () => {
    saved = await hook.result.current.saveProfile({
      bytes: new ArrayBuffer(8),
      contentType: 'image/png',
    });
  });
  expect(saved).toBe(false);
  expect(hook.result.current.errorSource).toBe('profile');
  expect(hook.result.current.error).toMatch(
    /profile photos are temporarily unavailable/i,
  );
  expect(m.rpc).not.toHaveBeenCalledWith(
    'community_profile_set',
    expect.anything(),
  );
  await act(() => hook.result.current.clearProfileError());
  expect(hook.result.current.error).toBe('');
  hook.unmount();
});

test('profile errors explain missing avatar setup and do not expose backend details', () => {
  expect(
    profileError({
      code: 'PGRST202',
      message: 'Could not find community_profile_avatar_set',
    }),
  ).toMatch(/profile photos are temporarily unavailable/i);
  expect(profileError({ message: 'Network request failed' })).toMatch(
    /check your connection/i,
  );
  expect(profileError({ statusCode: '413' })).toMatch(/2 MB/);
  expect(profileError({ message: 'private backend information' })).toBe(
    'Your profile could not be saved. Please try again.',
  );
});

test('confirmed deletion clears every mounted account view even if local sign-out rejects', async () => {
  const m = mockClient(member);
  m.client.functions = {
    invoke: jest.fn(async () => ({
      data: { message: 'Account deleted.' },
      error: null,
    })),
  };
  m.auth.signOut.mockRejectedValueOnce(new Error('User no longer exists'));
  const hook = await renderHook(() => ({
    source: useCommunity(m.client, 'natural-toothpaste'),
    other: useCommunity(m.client, 'natural-glass-cleaner'),
  }));
  await waitFor(() =>
    expect(hook.result.current.other.canContribute).toBe(true),
  );
  await act(() =>
    hook.result.current.other.setPassword('temporary credential'),
  );
  await act(() => hook.result.current.source.requestDeletion());
  await waitFor(() =>
    expect(hook.result.current.source.deletionComplete).toBe(true),
  );
  expect(hook.result.current.source.session).toBeNull();
  expect(hook.result.current.other.session).toBeNull();
  expect(hook.result.current.other.password).toBe('');
  expect(hook.result.current.other.profile).toBeNull();
  expect(hook.result.current.source.notice).toBe('');
  await act(() => hook.result.current.source.dismissDeletionConfirmation());
  expect(hook.result.current.source.deletionComplete).toBe(false);
  hook.unmount();
});

test('pending deletion does not show permanent-success confirmation or sign the user out', async () => {
  const m = mockClient(member);
  m.client.functions = {
    invoke: jest.fn(async () => ({
      data: null,
      error: new Error('Cleanup pending'),
    })),
  };
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-toothpaste'),
  );
  await waitFor(() => expect(hook.result.current.canManage).toBe(true));
  await act(() => hook.result.current.requestDeletion());
  expect(hook.result.current.deletionComplete).toBe(false);
  expect(hook.result.current.session?.user.id).toBe('member');
  expect(m.auth.signOut).not.toHaveBeenCalled();
  expect(hook.result.current.notice).toMatch(/could not finish/i);
  hook.unmount();
});

test('shared and foreground refreshes update profiles without overwriting an unsaved edit', async () => {
  const m = mockClient(member);
  const original = m.rpc.getMockImplementation()!;
  let bio = 'Original bio';
  m.rpc.mockImplementation(async (name, args) =>
    name === 'community_profile_me'
      ? { data: [{ username: 'OriginalUser', bio }], error: null }
      : original(name, args),
  );
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-toothpaste'),
  );
  await waitFor(() =>
    expect(hook.result.current.username).toBe('OriginalUser'),
  );
  await act(() => hook.result.current.setUsername('UnsavedEdit'));
  await act(() => {
    bio = 'Updated elsewhere';
    notifyCommunityChanged({ type: 'foreground' });
  });
  await waitFor(() =>
    expect(hook.result.current.profile?.bio).toBe('Updated elsewhere'),
  );
  expect(hook.result.current.username).toBe('UnsavedEdit');
  expect(hook.result.current.bio).toBe('Updated elsewhere');
  hook.unmount();
});

test('password reset requires a verified recovery code and saves through the authenticated recovery session', async () => {
  const m = mockClient();
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-toothpaste'),
  );
  await act(() => hook.result.current.setPassword('a-new-long-password'));
  await act(() =>
    hook.result.current.setPasswordConfirmation('a-new-long-password'),
  );
  await act(() => hook.result.current.setNewPassword());
  expect(m.auth.updateUser).not.toHaveBeenCalled();
  await act(() => hook.result.current.setAuthMode('recovery'));
  await act(() => hook.result.current.setEmail('person@example.com'));
  await act(() => hook.result.current.sendCode());
  await act(() => hook.result.current.setCode('12345678'));
  await act(() => hook.result.current.verifyCode());
  expect(m.auth.verifyOtp).toHaveBeenCalledWith({
    email: 'person@example.com',
    token: '12345678',
    type: 'recovery',
  });
  expect(hook.result.current.passwordSetupReady).toBe(true);
  await act(() => hook.result.current.setNewPassword());
  expect(m.auth.updateUser).toHaveBeenCalledWith({
    password: 'a-new-long-password',
  });
  expect(hook.result.current.passwordSetupReady).toBe(false);
  expect(hook.result.current.password).toBe('');
  hook.unmount();
});

test('password reset cannot use failed verification or leave its verified form open indefinitely', async () => {
  const m = mockClient();
  const hook = await renderHook(() =>
    useCommunity(m.client, 'natural-toothpaste'),
  );
  await act(() => hook.result.current.setAuthMode('recovery'));
  await act(() => hook.result.current.setEmail('person@example.com'));
  await act(() => hook.result.current.sendCode());
  await act(() => hook.result.current.setCode('12345678'));
  m.auth.verifyOtp.mockResolvedValueOnce({ error: new Error('invalid code') });
  await act(() => hook.result.current.verifyCode());
  expect(hook.result.current.passwordSetupReady).toBe(false);
  await act(() => hook.result.current.verifyCode());
  await act(() => hook.result.current.setPassword('a-new-long-password'));
  await act(() =>
    hook.result.current.setPasswordConfirmation('a-new-long-password'),
  );
  const realNow = Date.now;
  const verified = Date.now();
  const clock = jest
    .spyOn(Date, 'now')
    .mockImplementation(() => verified + 300001);
  try {
    await act(() => hook.result.current.setNewPassword());
  } finally {
    clock.mockRestore();
  }
  expect(Date.now).toBe(realNow);
  expect(m.auth.updateUser).not.toHaveBeenCalled();
  expect(hook.result.current.passwordSetupReady).toBe(false);
  expect(hook.result.current.notice).toMatch(/verification expired/i);
  hook.unmount();
});
