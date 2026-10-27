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
    data: name === 'community_list' ? [] : null,
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
