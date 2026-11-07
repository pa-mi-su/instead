import { useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { COLORS } from '../styles';

/** Keep the clear control directly inside the positioned input container. */
export function ClearableTextInput({
  onClear,
  style,
  ...props
}: TextInputProps & { onClear?: () => void }) {
  const input = useRef<TextInput>(null);
  return (
    <View style={local.container}>
      <TextInput ref={input} {...props} style={[style, local.input]} />
      {!!props.value?.length && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Clear ${(
            props.accessibilityLabel ?? 'field'
          ).toLowerCase()}`}
          accessibilityState={{ disabled: props.editable === false }}
          disabled={props.editable === false}
          onPress={() => {
            props.onChangeText?.('');
            onClear?.();
            input.current?.focus();
          }}
          style={local.clear}
        >
          <Text style={local.symbol}>×</Text>
        </Pressable>
      )}
    </View>
  );
}

const local = StyleSheet.create({
  container: { position: 'relative' },
  input: { paddingRight: 52 },
  clear: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { color: COLORS.muted, fontSize: 25, fontWeight: '600' },
});
