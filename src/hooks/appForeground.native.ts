import { AppState } from 'react-native';

export function subscribeToForeground(callback: () => void) {
  const subscription = AppState.addEventListener('change', state => {
    if (state === 'active') callback();
  });
  return () => subscription.remove();
}
