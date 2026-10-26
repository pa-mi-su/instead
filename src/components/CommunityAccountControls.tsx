import { useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { AnimatedPressable as Pressable } from './AnimatedPressable';
import type { useCommunity } from '../hooks/useCommunity';
import { communityRules } from '../disclaimer';
import { InfoScreen } from '../screens/InfoScreen';
import { styles } from '../styles';
export function CommunityAccountControls({
  community: c,
}: {
  community: ReturnType<typeof useCommunity>;
}) {
  const [checked, setChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reading, setReading] = useState(false);
  const button = (label: string, action: () => unknown, disabled = c.busy) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={action}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.optionList}>
      {c.accountLoading ? (
        <Text>Loading account safeguards…</Text>
      ) : !c.accountReady ? (
        <View style={local.loadFailure}>
          <Text accessibilityRole="alert">
            Could not load account safeguards. Contributions stay paused until
            the account status is confirmed.
          </Text>
          <Text>
            {c.accountLoadError || 'Check your connection and try again.'}
          </Text>
          {button('Retry account check', c.retryAccount, c.busy)}
        </View>
      ) : c.account?.deletion_requested_at ? (
        <Text>
          Deletion requested. Your public contributions are hidden. Permanent
          deletion is being processed; contact info@insteadtry.com if you need
          help.
        </Text>
      ) : c.account?.suspended ? (
        <Text>
          Contributions are suspended. Contact info@insteadtry.com for
          assistance.
        </Text>
      ) : !c.account?.policy_accepted ? (
        <>
          <Text style={styles.optionName}>Community rules</Text>
          <Text style={styles.optionDetail}>{communityRules}</Text>
          {button(
            'Read Safety, Terms & Privacy',
            () => setReading(true),
            false,
          )}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked, disabled: c.busy }}
            disabled={c.busy}
            onPress={() => setChecked(!checked)}
            style={styles.chip}
          >
            <Text style={styles.optionDetail}>
              {checked ? '☑' : '☐'} I agree to the current Terms and community
              rules and acknowledge Safety and Privacy. Record this agreement
              for my account.
            </Text>
          </Pressable>
          {button(
            'Accept community terms',
            c.acceptPolicy,
            c.busy || !checked || !c.canManage,
          )}
        </>
      ) : (
        <Text>Your account has accepted the current community terms.</Text>
      )}
      {!!c.blocks.length && (
        <View>
          <Text style={styles.optionName}>Blocked contributors</Text>
          {c.blocks.map(block => (
            <View key={block.id}>
              <Text>{block.label}</Text>
              {button(
                'Unblock contributor',
                () => c.unblock(block.id),
                c.busy || !c.canManage,
              )}
            </View>
          ))}
        </View>
      )}
      {!!c.account?.deletion_requested_at &&
        button('Retry account deletion', c.requestDeletion)}
      {!c.account?.deletion_requested_at &&
        button('Delete account', () => setDeleting(true))}
      {deleting && !c.account?.deletion_requested_at && (
        <View>
          <Text>
            Request permanent deletion of your account, saved guides, recipes,
            votes, reports, agreements, and uploaded photos? Your public
            contributions will be hidden immediately. Deletion cannot be undone
            once processed.
          </Text>
          {button('Confirm account deletion request', c.requestDeletion)}
          {button('Cancel', () => setDeleting(false))}
        </View>
      )}
      <Modal
        visible={reading}
        onRequestClose={() => setReading(false)}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.app}>
          {button('Close policies', () => setReading(false), false)}
          <InfoScreen />
        </View>
      </Modal>
    </View>
  );
}

const local = {
  loadFailure: { gap: 10 },
};
