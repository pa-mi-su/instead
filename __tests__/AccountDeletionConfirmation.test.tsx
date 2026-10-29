import { fireEvent, render } from '@testing-library/react-native';
import { AccountDeletionConfirmation } from '../src/components/AccountDeletionConfirmation';

jest.mock('react-native/Libraries/Modal/Modal', () => ({
  __esModule: true,
  default: ({ visible, children }: { visible: boolean; children: unknown }) =>
    visible ? children : null,
}));
test('permanent deletion has a prominent explicit confirmation and dismiss action', async () => {
  const onDismiss = jest.fn();
  const screen = await render(
    <AccountDeletionConfirmation visible onDismiss={onDismiss} />,
  );
  expect(screen.getByRole('header', { name: 'Account deleted' })).toBeTruthy();
  expect(screen.getByText(/permanently deleted.*signed out/)).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Continue browsing' }),
  );
  expect(onDismiss).toHaveBeenCalledTimes(1);
  await screen.rerender(
    <AccountDeletionConfirmation visible={false} onDismiss={onDismiss} />,
  );
  expect(screen.queryByText('Account deleted')).toBeNull();
});
