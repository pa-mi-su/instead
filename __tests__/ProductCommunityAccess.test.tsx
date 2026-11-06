import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ProductCommunityAccess } from '../src/components/ProductCommunityAccess';
import { useCommunity } from '../src/hooks/useCommunity';
import type { CommunityClient } from '../src/lib/community';

jest.mock('lucide-react-native', () => ({
  Eye: () => null,
  EyeOff: () => null,
}));
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

const client = {
  storage: {
    from: () => ({
      upload: async () => ({ error: null }),
      remove: async () => ({ error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
      createSignedUrl: async (path: string) => ({
        data: { signedUrl: path },
        error: null,
      }),
    }),
  },
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithOtp: async () => ({ error: null }),
    signInWithPassword: async () => ({ error: null }),
    signUp: async () => ({
      data: { session: null, user: { identities: [{ id: 'new-user' }] } },
      error: null,
    }),
    verifyOtp: async () => ({ error: null }),
    updateUser: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
  },
  rpc: async (name: string) => ({
    data:
      name === 'community_username_available'
        ? true
        : name === 'community_list'
        ? []
        : null,
    error: null,
  }),
} as unknown as CommunityClient;

function Harness() {
  const community = useCommunity(client, 'natural-toothpaste');
  return (
    <ProductCommunityAccess
      community={community}
      onSignInRequest={() => undefined}
    />
  );
}

test('password visibility control reveals and hides the sign-in password', async () => {
  const screen = await render(<Harness />);
  await waitFor(() => expect(screen.getByLabelText('Password')).toBeTruthy());
  const password = screen.getByLabelText('Password');
  expect(password.props.secureTextEntry).toBe(true);
  await fireEvent.press(screen.getByLabelText('Show password'));
  await waitFor(() =>
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false),
  );
  await fireEvent.press(screen.getByLabelText('Hide password'));
  expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
});

test('short signup password shows the minimum beside the field', async () => {
  const screen = await render(<Harness />);
  await fireEvent.press(screen.getByText('Create account', { exact: true }));
  const password = await screen.findByLabelText('Password (10+ characters)');
  await fireEvent.changeText(password, 'short');
  expect(
    await screen.findByText('Password needs 10 characters. Add 5 more.'),
  ).toBeTruthy();
});

function ErrorScopeHarness({ source }: { source: 'profile' | 'other' }) {
  const community = useCommunity(client, 'natural-toothpaste');
  return (
    <ProductCommunityAccess
      community={{
        ...community,
        error: 'Profile photo failed',
        errorSource: source,
      }}
      onSignInRequest={() => undefined}
    />
  );
}

test('profile editor failures do not leak onto the account page', async () => {
  const screen = await render(<ErrorScopeHarness source="profile" />);
  expect(screen.queryByText('Profile photo failed')).toBeNull();
  await screen.rerender(<ErrorScopeHarness source="other" />);
  expect(screen.getByText('Profile photo failed')).toBeTruthy();
});

test('sign-in offers password recovery without implying signup omitted a password', async () => {
  const screen = await render(<Harness />);
  expect(await screen.findByText('Forgot password?')).toBeTruthy();
  expect(screen.queryByText('Forgot or set password')).toBeNull();
});

function SetupHarness({ finishing = false }: { finishing?: boolean }) {
  const c = useCommunity(client, 'natural-toothpaste');
  return (
    <ProductCommunityAccess
      community={{
        ...c,
        session: { user: { id: 'test', email_confirmed_at: '2026-11-02' } },
        authReady: true,
        accountLoading: true,
        profileLoading: true,
        finishingSignup: finishing,
      }}
      purpose="account"
      onSignInRequest={() => undefined}
    />
  );
}

test('account loading shows progress instead of fake profile or eligibility warnings', async () => {
  const screen = await render(<SetupHarness />);
  expect(screen.getByLabelText('Checking your account')).toBeTruthy();
  expect(screen.getByLabelText('Loading your profile')).toBeTruthy();
  expect(screen.queryByText('Set your username')).toBeNull();
  expect(screen.queryByText(/Create a profile to share recipes/)).toBeNull();
  expect(screen.queryByText(/A verified, active account/)).toBeNull();
});

test('signup completion stays in a dedicated progress state until setup finishes', async () => {
  const screen = await render(<SetupHarness finishing />);
  expect(screen.getByLabelText('Finishing account setup')).toBeTruthy();
  expect(screen.queryByText('Update profile')).toBeNull();
  expect(screen.queryByText('Delete account')).toBeNull();
});

test('clearing a password resets its visibility before another is entered', async () => {
  const screen = await render(<Harness />);
  await fireEvent.changeText(
    await screen.findByLabelText('Password'),
    'test-only-secret',
  );
  await fireEvent.press(screen.getByLabelText('Show password'));
  expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
  await fireEvent.changeText(screen.getByLabelText('Password'), '');
  await fireEvent.changeText(
    screen.getByLabelText('Password'),
    'another-test-secret',
  );
  expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
});

function DeletionHarness({ deleting }: { deleting: boolean }) {
  const c = useCommunity(client, 'natural-toothpaste');
  return (
    <ProductCommunityAccess
      community={{
        ...c,
        session: { user: { id: 'test', email_confirmed_at: 'today' } },
        deletionInProgress: deleting,
        profileLoadError: 'Profile no longer exists',
        accountReady: true,
        accountLoading: false,
        account: {
          policy_accepted: true,
          suspended: false,
          deletion_requested_at: 'today',
        },
      }}
      purpose="account"
      onSignInRequest={() => undefined}
    />
  );
}
test('deletion shows dedicated progress without profile errors, retry buttons, or account controls', async () => {
  const screen = await render(<DeletionHarness deleting />);
  expect(screen.getByLabelText('Deleting your account')).toBeTruthy();
  expect(screen.queryByText(/Could not load your profile/)).toBeNull();
  expect(screen.queryByText('Retry account deletion')).toBeNull();
  expect(screen.queryByText('Sign out')).toBeNull();
  await screen.rerender(<DeletionHarness deleting={false} />);
  expect(screen.queryByLabelText('Deleting your account')).toBeNull();
  expect(screen.queryByText('Retry account deletion')).toBeNull();
  // Deletion retry is now a separate section on AccountScreen.
  expect(screen.queryByText(/Could not load your profile/)).toBeNull();
});

test('pending signup exposes confirmation resend with cooldown and expiry guidance', async () => {
  function PendingSignup() {
    const community = useCommunity(client, 'topic');
    return (
      <ProductCommunityAccess
        community={{
          ...community,
          pendingAuth: 'signup',
          sentEmail: 'person@example.com',
          resendSeconds: 32,
        }}
        onSignInRequest={() => undefined}
      />
    );
  }
  const screen = await render(<PendingSignup />);
  expect(screen.getByText('Confirm your email')).toBeTruthy();
  expect(screen.getByText(/Codes expire after five minutes/)).toBeTruthy();
  expect(screen.getByText('Resend in 32s')).toBeTruthy();
  expect(screen.queryByText('Resend recovery code')).toBeNull();
});

test('password clear control empties the field and hides subsequent text', async () => {
  const screen = await render(<Harness />);
  await fireEvent.changeText(
    await screen.findByLabelText('Password'),
    'temporary-secret',
  );
  await fireEvent.press(screen.getByLabelText('Show password'));
  await fireEvent.press(screen.getByLabelText('Clear password'));
  expect(screen.getByLabelText('Password').props.value).toBe('');
  expect(screen.queryByLabelText('Clear password')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Password'), 'new-secret');
  expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
});

test('verified identity without a profile gets a dedicated recoverable setup form', async () => {
  function Incomplete() {
    const c = useCommunity(client, 'topic');
    return (
      <ProductCommunityAccess
        community={{
          ...c,
          session: {
            user: {
              id: 'verified',
              email: 'verified@example.com',
              email_confirmed_at: '2026-11-06',
            },
          },
          profile: null,
          profileLoading: false,
          profileLoadError: '',
          authReady: true,
        }}
        purpose="account"
        onSignInRequest={() => undefined}
      />
    );
  }
  const screen = await render(<Incomplete />);
  expect(screen.getByText('Finish your account setup')).toBeTruthy();
  expect(
    screen.getByLabelText('Public username (3–20 characters)'),
  ).toBeTruthy();
  expect(screen.queryByText('Set your username')).toBeNull();
  expect(screen.queryByText('Community rules')).toBeNull();
});

test('checking a restored session shows no stale identity, profile editor or community terms', async () => {
  function Checking() {
    const c = useCommunity(client, 'topic');
    return (
      <ProductCommunityAccess
        community={{
          ...c,
          authChecking: true,
          session: {
            user: {
              id: 'old',
              email: 'old@example.com',
              email_confirmed_at: '2026-11-06',
            },
          },
        }}
        purpose="account"
        onSignInRequest={() => undefined}
      />
    );
  }
  const screen = await render(<Checking />);
  expect(screen.getByLabelText('Checking your session')).toBeTruthy();
  expect(screen.queryByText(/Signed in as/)).toBeNull();
  expect(screen.queryByText('Update profile')).toBeNull();
  expect(screen.queryByText('Community rules')).toBeNull();
});
