import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, styles } from '../styles';

/** Keep render failures out of React Native's fatal exception handler. */
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={local.container}>
        <Text accessibilityRole="header" style={styles.optionName}>
          Something went wrong
        </Text>
        <Text style={styles.optionDetail}>
          This screen could not load. Return home to try again.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => this.setState({ failed: false })}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.actionButtonText}>Return home</Text>
        </Pressable>
      </View>
    );
  }
}

const local = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
    gap: 16,
    backgroundColor: COLORS.paper,
  },
});
