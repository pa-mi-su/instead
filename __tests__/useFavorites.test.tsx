import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useFavorites } from '../src/hooks/useFavorites';
import { supabase } from '../src/lib/supabase';
import { savedRecipeKey } from '../src/lib/savedRecipes';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../src/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
const rpc = supabase!.rpc as jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  rpc.mockImplementation(async (name: string) => ({
    data: name.endsWith('_list') ? [] : null,
    error: null,
  }));
});

test('guests cannot read or write device saves or account saves', async () => {
  const hook = await renderHook(() => useFavorites());
  await act(() => {
    hook.result.current.toggleFavorite('dish-cleaner');
    hook.result.current.toggleRecipeFavorite(
      'dish-cleaner',
      'recipe',
      'Recipe',
    );
  });
  expect(hook.result.current.favorites).toEqual([]);
  expect(rpc).not.toHaveBeenCalled();
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('loads account guides and recipes, then hides them on sign-out', async () => {
  rpc.mockImplementation(async (name: string) => ({
    data:
      name === 'community_saved_guides_list'
        ? [{ product_id: 'dish-cleaner' }]
        : [
            {
              product_id: 'dish-cleaner',
              recipe_id: 'recipe',
              recipe_title: 'My recipe',
            },
          ],
    error: null,
  }));
  const hook = await renderHook(
    ({ user }: { user?: string }) => useFavorites(user),
    { initialProps: { user: 'first' } },
  );
  await waitFor(() => expect(hook.result.current.syncStatus).toBe('synced'));
  expect(hook.result.current.favorites).toContain('dish-cleaner');
  expect(hook.result.current.savedRecipes[0]?.title).toBe('My recipe');
  await hook.rerender({ user: undefined });
  expect(hook.result.current.favorites).toEqual([]);
  expect(hook.result.current.savedRecipes).toEqual([]);
});

test('a late old-account load cannot appear in the next account or migrate saves', async () => {
  let resolveOld!: (v: unknown) => void;
  rpc.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveOld = resolve;
      }),
  );
  const hook = await renderHook(
    ({ user }: { user: string }) => useFavorites(user),
    {
      initialProps: { user: 'first' },
    },
  );
  await hook.rerender({ user: 'second' });
  await waitFor(() => expect(hook.result.current.syncStatus).toBe('synced'));
  await act(() =>
    resolveOld({ data: [{ product_id: 'first-private-save' }], error: null }),
  );
  expect(hook.result.current.favorites).toEqual([]);
  expect(rpc.mock.calls.every(([name]) => name.endsWith('_list'))).toBe(true);
});

test('saves and unsaves both types, rolling back failed writes', async () => {
  const hook = await renderHook(() => useFavorites('first'));
  await waitFor(() => expect(hook.result.current.syncStatus).toBe('synced'));
  await act(() => hook.result.current.toggleFavorite('dish-cleaner'));
  expect(rpc).toHaveBeenCalledWith('community_saved_guides_set', {
    p_product: 'dish-cleaner',
    p_saved: true,
  });
  await act(() =>
    hook.result.current.toggleRecipeFavorite('dish-cleaner', 'recipe', 'Title'),
  );
  expect(hook.result.current.favorites).toContain(
    savedRecipeKey('dish-cleaner', 'recipe'),
  );
  await act(() => hook.result.current.toggleFavorite('dish-cleaner'));
  expect(hook.result.current.favorites).not.toContain('dish-cleaner');
  rpc.mockResolvedValueOnce({ data: null, error: { message: 'Unavailable' } });
  await act(() =>
    hook.result.current.toggleRecipeFavorite('dish-cleaner', 'recipe', 'Title'),
  );
  expect(hook.result.current.savedRecipes[0]?.title).toBe('Title');
  expect(hook.result.current.syncStatus).toBe('error');
});

test('a late save completion cannot restore the previous account after switching', async () => {
  const hook = await renderHook(
    ({ user }: { user: string }) => useFavorites(user),
    { initialProps: { user: 'first' } },
  );
  await waitFor(() => expect(hook.result.current.syncStatus).toBe('synced'));
  let finish!: (v: unknown) => void;
  rpc.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  await act(() => hook.result.current.toggleFavorite('first-private-save'));
  await hook.rerender({ user: 'second' });
  await waitFor(() => expect(hook.result.current.syncStatus).toBe('synced'));
  await act(() => finish({ data: null, error: null }));
  expect(hook.result.current.favorites).toEqual([]);
});
