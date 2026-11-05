import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  usePersonalRecipes,
  refreshRecipeVisibility,
} from '../src/hooks/useRecipeVisibility';
import type { CommunityClient } from '../src/lib/community';
const row = {
  product_id: 'guide',
  recipe_id: 'builtin:recipe',
  reason: 'reported',
  title: 'Private recipe',
};
test('hiding and restoring use a server-checked account and refresh shared visibility', async () => {
  let rows: (typeof row)[] = [];
  const rpc = jest.fn(async (name: string, args?: { p_hidden: boolean }) => {
    if (name === 'community_recipe_hide') {
      rows = args?.p_hidden ? [row] : [];
      return { data: null, error: null };
    }
    return { data: rows, error: null };
  });
  const client = { rpc } as unknown as CommunityClient;
  const screen = await renderHook(() => usePersonalRecipes(client, 'owner'));
  await waitFor(() => expect(screen.result.current.loading).toBe(false));
  await act(() =>
    screen.result.current.setHidden('guide', 'builtin:recipe', true),
  );
  await waitFor(() =>
    expect(screen.result.current.isHidden('guide', 'builtin:recipe')).toBe(
      true,
    ),
  );
  expect(rpc).toHaveBeenCalledWith('community_recipe_hide', {
    p_product: 'guide',
    p_recipe: 'builtin:recipe',
    p_hidden: true,
    p_expected_user: 'owner',
  });
  await act(() =>
    screen.result.current.setHidden('guide', 'builtin:recipe', false),
  );
  await waitFor(() => expect(screen.result.current.rows).toEqual([]));
  rows = [row];
  await act(() => refreshRecipeVisibility());
  await waitFor(() => expect(screen.result.current.rows).toEqual([row]));
});
test('late responses cannot expose another account preferences and sign-out clears them', async () => {
  let finish!: (value: unknown) => void;
  const rpc = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        }),
    )
    .mockResolvedValue({ data: [], error: null });
  const client = { rpc } as unknown as CommunityClient;
  const screen = await renderHook(
    ({ user }: { user?: string }) => usePersonalRecipes(client, user),
    { initialProps: { user: 'first' } },
  );
  await screen.rerender({ user: 'second' });
  await act(() => finish({ data: [row], error: null }));
  expect(screen.result.current.rows).toEqual([]);
  await screen.rerender({ user: undefined });
  expect(screen.result.current.rows).toEqual([]);
});
test('a rejected hide does not remove a recipe locally', async () => {
  const rpc = jest.fn(async (name: string) =>
    name === 'community_recipe_hide'
      ? { data: null, error: { message: 'Not allowed' } }
      : { data: [], error: null },
  );
  const client = { rpc } as unknown as CommunityClient;
  const screen = await renderHook(() => usePersonalRecipes(client, 'owner'));
  await waitFor(() => expect(screen.result.current.loading).toBe(false));
  await act(() =>
    screen.result.current.setHidden('guide', 'builtin:recipe', true),
  );
  expect(screen.result.current.rows).toEqual([]);
  expect(screen.result.current.error).toBeTruthy();
});
