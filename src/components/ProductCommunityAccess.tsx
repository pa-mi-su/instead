import { CommunityAccountControls } from './CommunityAccountControls';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Linking, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedPressable as Pressable } from './AnimatedPressable';
import type { useCommunity } from '../hooks/useCommunity';
import { COLORS, styles } from '../styles';

export function ProductCommunityAccess({
  community: c,
  renderRecipes,
  onSignInRequest,
}: {
  community: ReturnType<typeof useCommunity>;
  renderRecipes?: (
    community: ReturnType<typeof useCommunity>,
    onSignInRequest: () => void,
  ) => ReactNode;
  onSignInRequest: () => void;
}) {
  const emailInput = useRef<TextInput>(null);
  const codeInput = useRef<TextInput>(null);
  const [focusedField, setFocusedField] = useState<'email' | 'code' | null>(
    null,
  );
  const button = (label: string, action: () => unknown, disabled = c.busy) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={action}
      style={({ pressed }) => [
        styles.chip,
        disabled && local.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.optionList}>
      <Text style={styles.optionDetail}>
        Sign in with an email code to vote or submit a recipe. Email addresses
        stay private; approved community recipes are public and reviewed before
        publication. Votes show preferences, not safety or effectiveness.
      </Text>
      {!c.configured && <Text>Community features are not configured yet.</Text>}
      {!!c.error && <Text accessibilityRole="alert">{c.error}</Text>}
      {!!c.notice && <Text accessibilityLiveRegion="polite">{c.notice}</Text>}
      {!!c.error && button('Retry', c.retry)}
      {c.configured && c.authReady && !c.session && (
        <View style={styles.optionCard}>
          <Text style={styles.optionName}>
            Sign in to vote or share a recipe
          </Text>
          <Text style={styles.optionDetail}>
            No password or public profile needed. By continuing, you agree to
            our Terms and Privacy Policy.
          </Text>
          {button(
            'Terms',
            () =>
              Linking.openURL('https://insteadtry.com/terms').catch(
                () => undefined,
              ),
            false,
          )}
          {button(
            'Privacy Policy',
            () =>
              Linking.openURL('https://insteadtry.com/privacy').catch(
                () => undefined,
              ),
            false,
          )}
          {!c.sentEmail ? (
            <>
              <Text style={local.fieldLabel}>Email address</Text>
              <TextInput
                ref={emailInput}
                accessibilityLabel="Email address"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                maxLength={254}
                value={c.email}
                onChangeText={c.setEmail}
                autoCorrect={false}
                placeholderTextColor={COLORS.muted}
                selectionColor={COLORS.sage}
                returnKeyType="send"
                editable={!c.busy}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={() => {
                  if (c.email.trim() && !c.busy) c.sendCode();
                }}
                style={[
                  local.authInput,
                  focusedField === 'email' && local.authInputFocused,
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send sign-in code"
                disabled={c.busy || !c.email.trim()}
                onPress={c.sendCode}
                style={({ pressed }) => [
                  local.authAction,
                  (c.busy || !c.email.trim()) && local.authActionDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={local.authActionText}>
                  {c.busy ? 'Sending…' : 'Send sign-in code'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text>Enter the code sent to {c.sentEmail}.</Text>
              <Text style={local.fieldLabel}>Sign-in code</Text>
              <TextInput
                ref={codeInput}
                accessibilityLabel="Email code"
                placeholder="8-digit code"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={10}
                value={c.code}
                onChangeText={value => c.setCode(value.replace(/\D/g, ''))}
                placeholderTextColor={COLORS.muted}
                selectionColor={COLORS.sage}
                returnKeyType="done"
                editable={!c.busy}
                onFocus={() => setFocusedField('code')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={() => {
                  if (c.code.trim() && !c.busy) c.verifyCode();
                }}
                style={[
                  local.authInput,
                  focusedField === 'code' && local.authInputFocused,
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Verify code"
                disabled={c.busy || !c.code.trim()}
                onPress={c.verifyCode}
                style={({ pressed }) => [
                  local.authAction,
                  (c.busy || !c.code.trim()) && local.authActionDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={local.authActionText}>
                  {c.busy ? 'Verifying…' : 'Verify code'}
                </Text>
              </Pressable>
              {button(
                c.resendSeconds
                  ? `Resend in ${c.resendSeconds}s`
                  : 'Resend code',
                c.sendCode,
                c.busy || c.resendSeconds > 0,
              )}
              {button('Use a different email', c.changeEmail)}
            </>
          )}
        </View>
      )}
      {!!c.session && (
        <View style={styles.optionCard}>
          <Text>Signed in · Your email is private.</Text>
          {button('Sign out', c.signOut)}
          <CommunityAccountControls community={c} />
          {!c.canContribute && (
            <Text>
              A verified, active account and current community agreement are
              required to contribute.
            </Text>
          )}
        </View>
      )}
      {renderRecipes?.(c, onSignInRequest)}
    </View>
  );
}

const local = StyleSheet.create({
  disabled: { opacity: 0.5 },
  authInput: {
    width: '100%',
    minHeight: 54,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: COLORS.ink,
  },
  authInputFocused: { borderColor: COLORS.sage },
  fieldLabel: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
  },
  authAction: {
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: COLORS.sage,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  authActionDisabled: { backgroundColor: '#C5C1B7' },
  authActionText: { color: COLORS.ink, fontWeight: '800', fontSize: 15 },
});
