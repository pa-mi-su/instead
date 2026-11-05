import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  usePersonalRecipes,
  refreshRecipeVisibility,
} from '../src/hooks/useRecipeVisibility';
import type { CommunityClient } from '../src/lib/community';
const row = {
  product_id: 'guide',
  recipe_id: 'recipe',
  author_username: 'Contributor',
};
test('blocking sends only the permanent hide state and offers no restore/list interface', async () => {
  let excluded = false;
  const rpc = jest.fn(async (name: string) => {
    if (name === 'community_recipe_hide') {
      excluded = true;
      return { data: null, error: null };
    }
    return { data: excluded ? [row] : [], error: null };
  });
  const client = { rpc } as unknown as CommunityClient;
  const hook = await renderHook(() => usePersonalRecipes(client, 'owner'));
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  await act(() =>
    hook.result.current.blockRecipe('guide', 'recipe', 'Contributor'),
  );
  expect(rpc).toHaveBeenCalledWith('community_recipe_hide', {
    p_product: 'guide',
    p_recipe: 'recipe',
    p_hidden: true,
    p_expected_user: 'owner',
  });
  expect(hook.result.current.isHidden('guide', 'recipe')).toBe(true);
  expect(
    hook.result.current.isHidden('other-guide', 'other-recipe', 'Contributor'),
  ).toBe(true);
  expect(hook.result.current.isContributorHidden('contributor')).toBe(true);
  expect(hook.result.current).not.toHaveProperty('setHidden');
  expect(hook.result.current).not.toHaveProperty('rows');
  await hook.unmount();
  const remount = await renderHook(() => usePersonalRecipes(client, 'owner'));
  await waitFor(() =>
    expect(remount.result.current.isContributorHidden('Contributor')).toBe(
      true,
    ),
  );
});
test('successful report suppression immediately excludes cached cards by the same contributor', async () => {
  const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
  const client = { rpc } as unknown as CommunityClient;
  const hook = await renderHook(() => usePersonalRecipes(client, 'owner'));
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  await act(() =>
    hook.result.current.acceptReport('guide', 'recipe', 'Contributor'),
  );
  expect(
    hook.result.current.isHidden(
      'other-guide',
      'different-recipe',
      'Contributor',
    ),
  ).toBe(true);
  expect(
    hook.result.current.isHidden('other-guide', 'unrelated', 'SomeoneElse'),
  ).toBe(false);
});
test('stale reads cannot cross accounts; sign-out restores the public browsing view', async () => {
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
  const hook = await renderHook(
    ({ user }: { user?: string }) => usePersonalRecipes(client, user),
    { initialProps: { user: 'first' } },
  );
  expect(hook.result.current.isHidden('guide', 'recipe')).toBe(true);
  await hook.rerender({ user: 'second' });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  await act(() => finish({ data: [row], error: null }));
  expect(hook.result.current.isHidden('guide', 'recipe')).toBe(false);
  await hook.rerender({ user: undefined });
  expect(hook.result.current.isHidden('guide', 'recipe')).toBe(false);
});
test('failed block does not suppress a recipe; failed initial filtering does not show excluded content', async () => {
  const rpc = jest.fn(async (name: string) =>
    name === 'community_recipe_hide'
      ? { data: null, error: { message: 'Denied' } }
      : { data: [], error: null },
  );
  const client = { rpc } as unknown as CommunityClient;
  const hook = await renderHook(() => usePersonalRecipes(client, 'owner'));
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  await act(() => hook.result.current.blockRecipe('guide', 'recipe'));
  expect(hook.result.current.isHidden('guide', 'recipe')).toBe(false);
  rpc.mockResolvedValue({ data: null, error: { message: 'Offline' } });
  const next = await renderHook(() => usePersonalRecipes(client, 'new-owner'));
  await waitFor(() => expect(next.result.current.error).toBeTruthy());
  expect(next.result.current.ready).toBe(false);
  expect(next.result.current.isHidden('guide', 'recipe')).toBe(true);
  rpc.mockResolvedValue({ data: [], error: null });
  await act(() => refreshRecipeVisibility());
  await waitFor(() => expect(next.result.current.ready).toBe(true));
});
