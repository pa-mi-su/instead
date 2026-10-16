import {
  act,
  fireEvent,
  render,
  renderHook,
  waitFor,
} from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACKNOWLEDGEMENT_KEY,
  hasCurrentAcknowledgement,
  makeAcknowledgement,
} from '../src/disclaimer';
import { useSafetyAcknowledgement } from '../src/hooks/useSafetyAcknowledgement';
import { InfoScreen } from '../src/screens/InfoScreen';
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
const getItem = jest.mocked(AsyncStorage.getItem);
const setItem = jest.mocked(AsyncStorage.setItem);
beforeEach(() => {
  jest.clearAllMocks();
  getItem.mockResolvedValue(null);
  setItem.mockResolvedValue();
});
test('only a current, dated acknowledgement skips first-use safety', () => {
  expect(hasCurrentAcknowledgement(makeAcknowledgement())).toBe(true);
  for (const value of [
    null,
    'bad json',
    '{}',
    '{"version":"old","acceptedAt":"2026-10-16"}',
    '{"version":"2026-10-16.1","acceptedAt":"invalid"}',
  ])
    expect(hasCurrentAcknowledgement(value)).toBe(false);
});
test('first use requires acceptance and saves a versioned local receipt', async () => {
  const { result } = await renderHook(() => useSafetyAcknowledgement());
  await waitFor(() => expect(result.current.status).toBe('required'));
  await act(async () => {
    await result.current.accept();
  });
  expect(result.current.status).toBe('accepted');
  expect(setItem).toHaveBeenCalledWith(ACKNOWLEDGEMENT_KEY, expect.any(String));
  expect(hasCurrentAcknowledgement(setItem.mock.calls[0]?.[1] ?? null)).toBe(
    true,
  );
});
test('restart remembers agreement, while failed storage never silently accepts', async () => {
  getItem.mockResolvedValueOnce(makeAcknowledgement());
  const remembered = await renderHook(() => useSafetyAcknowledgement());
  await waitFor(() =>
    expect(remembered.result.current.status).toBe('accepted'),
  );
  await remembered.unmount();
  getItem.mockRejectedValueOnce(new Error('unavailable'));
  setItem.mockRejectedValueOnce(new Error('full'));
  const { result } = await renderHook(() => useSafetyAcknowledgement());
  await waitFor(() => expect(result.current.status).toBe('required'));
  await act(async () => {
    await result.current.accept();
  });
  expect(result.current.status).toBe('required');
  expect(result.current.error).toContain('could not be saved');
});
test('agreement is explicit, policies work offline, and declining keeps browsing closed', async () => {
  const accept = jest.fn();
  const screen = await render(<InfoScreen firstUse onAccept={accept} />);
  await fireEvent.press(screen.getByText('Agree & continue'));
  expect(accept).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('checkbox'));
  await fireEvent.press(screen.getByText('Agree & continue'));
  expect(accept).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByText('Terms of Use'));
  expect(screen.getByText('Medical and health information')).toBeTruthy();
  await fireEvent.press(screen.getByText('Privacy Policy'));
  expect(screen.getByText('7. Security')).toBeTruthy();
  await fireEvent.press(screen.getByText('I do not agree'));
  expect(screen.getByText('You have not agreed')).toBeTruthy();
  expect(screen.queryByText('Agree & continue')).toBeNull();
});
