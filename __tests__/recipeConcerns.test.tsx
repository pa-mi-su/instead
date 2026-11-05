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
