import { AccountSection, accountStyles as a } from './AccountSection';
import { useState } from 'react';
import { ActivityIndicator, Modal, Text, View } from 'react-native';
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
  const [reading, setReading] = useState(false);
  const button = (label: string, action: () => unknown, disabled = c.busy) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={action}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.optionList}>
      {c.accountLoading ? (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Checking your account"
          accessibilityLiveRegion="polite"
          style={local.loadFailure}
        >
          <ActivityIndicator />
          <Text>Checking your account…</Text>
          <Text>
            We’re checking your account status and community terms. Please keep
            this screen open.
          </Text>
        </View>
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
          Your account is pending deletion. Your public contributions remain
          hidden until deletion is complete. Manage deletion in My INSTEAD, or
          contact info@insteadtry.com if you need help.
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

export function CommunityAccountManagement({
  community: c,
}: {
  community: ReturnType<typeof useCommunity>;
}) {
  const [deleting, setDeleting] = useState(false);
  const button = (
    label: string,
    action: () => unknown,
    disabled = c.busy,
    destructive = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={action}
      style={[a.button, destructive && a.dangerButton, disabled && a.disabled]}
    >
      <Text style={[a.buttonText, destructive && a.dangerText]}>{label}</Text>
    </Pressable>
  );
  return (
    <AccountSection
      title="Delete your account"
      summary="Permanently delete your account and its data. This cannot be undone."
      danger
    >
      {c.account?.deletion_requested_at ? (
        button('Retry account deletion', c.requestDeletion, c.busy, true)
      ) : !deleting ? (
        button('Delete account', () => setDeleting(true), c.busy, true)
      ) : (
        <View style={a.content}>
          <Text style={a.body}>
            Delete your account, saved items, recipes, votes, reports, and
            uploaded photos? Your public contributions will be hidden
            immediately.
          </Text>
          {button(
            'Confirm account deletion request',
            c.requestDeletion,
            c.busy,
            true,
          )}
          {button('Cancel', () => setDeleting(false))}
        </View>
      )}
    </AccountSection>
  );
}
