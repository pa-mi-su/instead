import { useEffect, useState } from 'react';
import { Keyboard, Platform, Text } from 'react-native';
import { AnimatedPressable as Pressable } from './AnimatedPressable';
import { styles } from '../styles';

export function KeyboardDismissControl() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, event =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (!keyboardHeight) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Dismiss keyboard"
      onPress={Keyboard.dismiss}
      style={[
        styles.keyboardDismiss,
        // The control must float immediately above the native keyboard.
        // eslint-disable-next-line react-native/no-inline-styles
        {
          bottom: Platform.OS === 'ios' ? keyboardHeight + 8 : 8,
        },
      ]}
    >
      <Text style={styles.keyboardDismissText}>DONE</Text>
    </Pressable>
  );
}
