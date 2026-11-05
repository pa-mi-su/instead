import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  useRecipeConcerns,
  notifyRecipeConcernChanged,
} from '../src/hooks/useRecipeConcerns';
import type { CommunityClient } from '../src/lib/community';
const row = {
  id: 'report',
  recipe_id: 'recipe',
  product_id: 'guide',
  title: 'A reported recipe',
  reason: 'Other',
  created_at: '',
  reviewed_at: null,
};
test('concern history survives remount and refreshes after a successful report', async () => {
  const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
  const client = { rpc } as unknown as CommunityClient;
  const first = await renderHook(() => useRecipeConcerns(client, 'account'));
  await waitFor(() => expect(first.result.current.loading).toBe(false));
  rpc.mockResolvedValue({ data: [row], error: null });
  await act(() => notifyRecipeConcernChanged());
  await waitFor(() => expect(first.result.current.concerns).toEqual([row]));
  await first.unmount();
  const next = await renderHook(() => useRecipeConcerns(client, 'account'));
  await waitFor(() => expect(next.result.current.concerns).toEqual([row]));
});
test('late history from another account cannot appear after switching accounts or signing out', async () => {
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
    ({ user }: { user?: string }) => useRecipeConcerns(client, user),
    { initialProps: { user: 'first' } },
  );
  await screen.rerender({ user: 'second' });
  await act(() => finish({ data: [row], error: null }));
  expect(screen.result.current.concerns).toEqual([]);
  await screen.rerender({ user: undefined });
  expect(screen.result.current.concerns).toEqual([]);
});

test('clearing and restoring persist through the scoped server function without removing the report', async () => {
  let hidden_at: string | null = null;
  const rpc = jest.fn(async (name: string, args: { p_hidden?: boolean }) => {
    if (name === 'community_concern_history_visibility') {
      hidden_at = args.p_hidden ? '2026-11-05' : null;
      return { data: null, error: null };
    }
    return { data: [{ ...row, hidden_at }], error: null };
  });
  const client = { rpc } as unknown as CommunityClient;
  const screen = await renderHook(() => useRecipeConcerns(client, 'account'));
  await waitFor(() => expect(screen.result.current.concerns).toHaveLength(1));
  await act(() => screen.result.current.setHidden(['recipe'], true));
  expect(screen.result.current.concerns[0]?.hidden_at).toBeTruthy();
  expect(rpc).toHaveBeenCalledWith('community_concern_history_visibility', {
    p_recipes: ['recipe'],
    p_hidden: true,
    p_only_reviewed: false,
    p_expected_user: 'account',
  });
  await act(() => screen.result.current.setHidden(['recipe'], false));
  expect(screen.result.current.concerns).toHaveLength(1);
  expect(screen.result.current.concerns[0]?.hidden_at).toBeNull();
});

test('a failed clear keeps the report visible and offers an error instead of pretending success', async () => {
  const rpc = jest.fn(async (name: string) =>
    name === 'community_concern_history_visibility'
      ? { data: null, error: { message: 'Request failed' } }
      : { data: [{ ...row, hidden_at: null }], error: null },
  );
  const client = { rpc } as unknown as CommunityClient;
  const screen = await renderHook(() => useRecipeConcerns(client, 'account'));
  await waitFor(() => expect(screen.result.current.concerns).toHaveLength(1));
  await act(() => screen.result.current.setHidden(['recipe'], true));
  expect(screen.result.current.concerns[0]?.hidden_at).toBeNull();
  expect(screen.result.current.error).toMatch(
    /Could not update concern history/,
  );
});
test('a late clear failure cannot affect a different signed-in account', async () => {
  let finish!: (value: unknown) => void;
  const rpc = jest.fn((name: string) =>
    name === 'community_concern_history_visibility'
      ? new Promise(resolve => {
          finish = resolve;
        })
      : Promise.resolve({ data: [], error: null }),
  );
  const client = { rpc } as unknown as CommunityClient;
  const screen = await renderHook(
    ({ user }: { user: string }) => useRecipeConcerns(client, user),
    { initialProps: { user: 'first' } },
  );
  let changing: Promise<void> | undefined;
  await act(() => {
    changing = screen.result.current.setHidden(['recipe'], true);
  });
  await screen.rerender({ user: 'second' });
  await act(async () => {
    finish({ data: null, error: { message: 'Old account request failed' } });
    await changing;
  });
  expect(screen.result.current.error).toBe('');
  expect(screen.result.current.saving).toBe(false);
  expect(screen.result.current.concerns).toEqual([]);
});
