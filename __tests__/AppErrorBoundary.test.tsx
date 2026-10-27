import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { AppErrorBoundary } from '../src/components/AppErrorBoundary';

function NavigatorFixture() {
  const [failed, setFailed] = useState(false);
  if (failed) throw new Error('Synthetic screen render failure');
  return (
    <Pressable accessibilityRole="button" onPress={() => setFailed(true)}>
      <Text>Open failing screen</Text>
    </Pressable>
  );
}

test('recovers from repeated render failures by remounting navigation', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    const screen = await render(
      <AppErrorBoundary>
        <NavigatorFixture />
      </AppErrorBoundary>,
    );
    await fireEvent.press(screen.getByText('Open failing screen'));
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.queryByText('Open failing screen')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Return home' }));
    expect(screen.getByText('Open failing screen')).toBeTruthy();
    expect(screen.queryByText('Something went wrong')).toBeNull();
    // A second failure still has a usable fallback; recovery never loops.
    await fireEvent.press(screen.getByText('Open failing screen'));
    expect(screen.getByRole('button', { name: 'Return home' })).toBeTruthy();
  } finally {
    log.mockRestore();
  }
});
