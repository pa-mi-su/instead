import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, styles } from '../styles';

export function AccountDeletionConfirmation({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={local.backdrop}>
        <View accessibilityViewIsModal style={local.card}>
          <Text accessibilityRole="header" style={local.title}>
            Account deleted
          </Text>
          <Text style={local.message}>
            Your account and community data have been permanently deleted. You
            are now signed out.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onDismiss}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.actionButtonText}>Continue browsing</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
const local = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 24,
    padding: 28,
    gap: 20,
    backgroundColor: COLORS.paper,
  },
  title: { color: COLORS.ink, fontSize: 28, lineHeight: 34, fontWeight: '800' },
  message: { color: COLORS.ink, fontSize: 18, lineHeight: 28 },
});
