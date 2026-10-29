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
  savedGuideIds: [],
  savedRecipes: [],
  syncStatus: 'local' as const,
  onOpenGuide: jest.fn(),
  onOpenRecipe: jest.fn(),
  bottomInset: 0,
};
const account = (id: string) =>
  ({ session: { user: { id } } } as ReturnType<typeof useCommunity>);
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
