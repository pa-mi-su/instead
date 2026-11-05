jest.mock('lucide-react-native', () => ({
  ChevronDown: 'ChevronDown',
  ChevronUp: 'ChevronUp',
}));
import { act, render, waitFor } from '@testing-library/react-native';
import { AccountScreen } from '../src/screens/AccountScreen';
import { supabase } from '../src/lib/supabase';
import { notifyCommunityChanged } from '../src/lib/communityUpdates';
import type { useCommunity } from '../src/hooks/useCommunity';

jest.mock('../src/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));
jest.mock('../src/components/ProductCommunityAccess', () => ({
  ProductCommunityAccess: () => null,
}));
jest.mock('../src/components/GuideCard', () => ({ GuideCard: () => null }));
jest.mock('../src/components/AnimatedPressable', () => ({
  AnimatedPressable: require('react-native').Pressable,
}));
const props = {
  guides: [],
  bottomInset: 0,
};
const account = (id: string) =>
  ({
    session: { user: { id } },
    blocks: [],
    busy: false,
    canManage: true,
  } as unknown as ReturnType<typeof useCommunity>);
const recipe = {
  id: 'private-recipe',
  product_id: 'natural-toothpaste',
  title: 'Private first-account submission',
  status: 'pending',
  moderation_note: '',
  created_at: '',
};

test('a late private submission response cannot appear in a different account', async () => {
  const rpc = supabase!.rpc as jest.Mock;
  let resolveOld!: (value: unknown) => void;
  rpc.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveOld = resolve;
      }),
  );
  rpc.mockResolvedValue({ data: [], error: null });
  const screen = await render(
    <AccountScreen community={account('first')} {...props} />,
  );
  await screen.rerender(
    <AccountScreen community={account('second')} {...props} />,
  );
  await act(async () => {
    resolveOld({ data: [recipe], error: null });
  });
  expect(screen.queryByText(recipe.title)).toBeNull();
  expect(screen.getByText('You have no submissions yet.')).toBeTruthy();
  await screen.unmount();
  rpc.mockReset();
});

test('submission changes elsewhere refresh the open account page', async () => {
  const rpc = supabase!.rpc as jest.Mock;
  rpc.mockResolvedValue({ data: [], error: null });
  const screen = await render(
    <AccountScreen community={account('first')} {...props} />,
  );
  await waitFor(() =>
    expect(screen.getByText('You have no submissions yet.')).toBeTruthy(),
  );
  rpc.mockResolvedValue({ data: [recipe], error: null });
  await act(() => notifyCommunityChanged());
  expect(await screen.findByText(recipe.title)).toBeTruthy();
  await screen.unmount();
  rpc.mockReset();
});

test('My INSTEAD has account management without duplicate saved lists', async () => {
  const rpc = supabase!.rpc as jest.Mock;
  rpc.mockResolvedValue({ data: [], error: null });
  const screen = await render(
    <AccountScreen community={account('first')} {...props} />,
  );
  expect(screen.queryByText('Saved guides')).toBeNull();
  expect(screen.queryByText('Saved recipes')).toBeNull();
  expect(screen.getByText('My account.')).toBeTruthy();
  await screen.unmount();
  rpc.mockReset();
});

test('deletion hides submissions and ignores a read that fails after records are removed', async () => {
  const rpc = supabase!.rpc as jest.Mock;
  let finish!: (value: unknown) => void;
  rpc.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  const screen = await render(
    <AccountScreen community={account('first')} {...props} />,
  );
  await screen.rerender(
    <AccountScreen
      community={{ ...account('first'), deletionInProgress: true }}
      {...props}
    />,
  );
  await act(() => {
    finish({ data: null, error: new Error('Account deleted') });
  });
  expect(screen.queryByText('My recipe submissions')).toBeNull();
  expect(screen.queryByText('Refresh submissions')).toBeNull();
  expect(screen.queryByRole('alert')).toBeNull();
  await screen.unmount();
  rpc.mockReset();
});

test('My INSTEAD never offers report history, hidden-content lists, or restore/unblock controls', async () => {
  const rpc = supabase!.rpc as jest.Mock;
  rpc.mockResolvedValue({ data: [], error: null });
  const screen = await render(
    <AccountScreen community={account('owner')} {...props} />,
  );
  await waitFor(() =>
    expect(screen.getByText('My recipe submissions')).toBeTruthy(),
  );
  for (const label of [
    /Hidden recipes/i,
    /Blocked contributors/i,
    /Recipe concerns/i,
    /Show recipe again/i,
    /Unblock contributor/i,
    /Clear.*history/i,
  ])
    expect(screen.queryByText(label)).toBeNull();
});
