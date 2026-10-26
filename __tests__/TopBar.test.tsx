import { fireEvent, render } from '@testing-library/react-native';
import { TopBar } from '../src/components/TopBar';

jest.mock('react-native/Libraries/Modal/Modal', () => ({
  __esModule: true,
  default: function MockModal({
    visible,
    children,
    onDismiss,
  }: {
    visible: boolean;
    children: unknown;
    onDismiss?: () => void;
  }) {
    const { useEffect, useRef } = require('react');
    const wasVisible = useRef(visible);
    useEffect(() => {
      if (wasVisible.current && !visible) onDismiss?.();
      wasVisible.current = visible;
    }, [visible, onDismiss]);
    return visible ? children : null;
  },
}));
jest.mock('lucide-react-native', () => ({
  Bookmark: () => null,
  Info: () => null,
  Menu: () => null,
  UserRound: () => null,
  X: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

async function renderTopBar() {
  const props = {
    activeView: 'home' as const,
    savedCount: 2,
    onHome: jest.fn(),
    onSaved: jest.fn(),
    onAccount: jest.fn(),
    onInfo: jest.fn(),
  };
  return { screen: await render(<TopBar {...props} />), props };
}

test('keeps the top bar focused on the brand and opens a labeled navigation drawer', async () => {
  const screen = await renderTopBar();

  expect(screen.screen.getByText('INSTEAD')).toBeTruthy();
  expect(
    screen.screen.getByRole('button', { name: 'Open navigation menu' }),
  ).toBeTruthy();
  expect(screen.screen.queryByText('My INSTEAD')).toBeNull();

  await fireEvent.press(
    screen.screen.getByRole('button', { name: 'Open navigation menu' }),
  );

  expect(screen.screen.getByText('Your spaces')).toBeTruthy();
  expect(screen.screen.getByText('My INSTEAD')).toBeTruthy();
  expect(screen.screen.getByText('Info & safety')).toBeTruthy();
  expect(
    screen.screen.getByRole('button', { name: 'Saved guides, 2 saved' }),
  ).toBeTruthy();
});

test('selecting a destination navigates and closes the drawer', async () => {
  const screen = await renderTopBar();

  await fireEvent.press(
    screen.screen.getByRole('button', { name: 'Open navigation menu' }),
  );
  await fireEvent.press(
    screen.screen.getByRole('button', { name: 'My INSTEAD' }),
  );

  expect(screen.props.onAccount).toHaveBeenCalledTimes(1);
  expect(screen.screen.queryByText('Your spaces')).toBeNull();
});

test('selecting Saved guides completes navigation after the drawer dismisses', async () => {
  const screen = await renderTopBar();

  await fireEvent.press(
    screen.screen.getByRole('button', { name: 'Open navigation menu' }),
  );
  await fireEvent.press(
    screen.screen.getByRole('button', { name: 'Saved guides, 2 saved' }),
  );

  expect(screen.props.onSaved).toHaveBeenCalledTimes(1);
  expect(screen.screen.queryByText('Your spaces')).toBeNull();
});
