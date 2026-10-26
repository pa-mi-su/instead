import { CommunityAccountControls } from './CommunityAccountControls';
import type { ReactNode } from 'react';
import { Linking, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedPressable as Pressable } from './AnimatedPressable';
import type { useCommunity } from '../hooks/useCommunity';
import { COLORS, styles } from '../styles';

export function ProductCommunityAccess({
  community: c,
  renderRecipes,
  onSignInRequest,
  purpose = 'community',
}: {
  community: ReturnType<typeof useCommunity>;
  renderRecipes?: (
    community: ReturnType<typeof useCommunity>,
    onSignInRequest: () => void,
  ) => ReactNode;
  onSignInRequest: () => void;
  purpose?: 'community' | 'account';
}) {
  const signupCode = c.pendingAuth === 'signup' && c.sentEmail;
  const recoveryCode = c.pendingAuth === 'recovery' && c.sentEmail;
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
  const field = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    options: {
      password?: boolean;
      email?: boolean;
      multiline?: boolean;
      maxLength?: number;
      autocomplete?:
        | 'email'
        | 'username'
        | 'current-password'
        | 'new-password'
        | 'one-time-code';
      keyboard?: 'email-address' | 'default' | 'number-pad';
    } = {},
  ) => (
    <View>
      <Text style={local.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={COLORS.muted}
        selectionColor={COLORS.sage}
        autoCapitalize={options.email ? 'none' : 'sentences'}
        autoCorrect={!options.email && !options.password}
        autoComplete={options.autocomplete}
        keyboardType={options.keyboard ?? 'default'}
        secureTextEntry={options.password}
        multiline={options.multiline}
        maxLength={options.maxLength}
        editable={!c.busy}
        style={[local.authInput, options.multiline && local.bioInput]}
      />
    </View>
  );

  return (
    <View style={styles.optionList}>
      <Text style={styles.optionDetail}>
        {purpose === 'account'
          ? 'Create a profile to share recipes, keep saved guides in sync, and manage your submissions. Your email stays private.'
          : 'Sign in to vote or share a recipe. Your public username identifies approved recipes; your email stays private.'}
      </Text>
      {!c.configured && <Text>Community features are not configured yet.</Text>}
      {!!c.error && <Text accessibilityRole="alert">{c.error}</Text>}
      {!!c.notice && <Text accessibilityLiveRegion="polite">{c.notice}</Text>}
      {!!c.error && button('Retry', c.retry)}
      {c.configured &&
        c.authReady &&
        !c.session &&
        !signupCode &&
        !recoveryCode && (
          <View style={styles.optionCard}>
            <Text style={styles.optionName}>
              {c.authMode === 'signup'
                ? 'Create your INSTEAD account'
                : c.authMode === 'recovery'
                ? 'Set or reset your password'
                : 'Sign in to INSTEAD'}
            </Text>
            <Text style={styles.optionDetail}>
              Email and password sign-in. New accounts confirm their email. Use
              password recovery if you used an email code in an earlier version.
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
            {c.authMode === 'signup' ? (
              <>
                {field('Email address', c.email, c.setEmail, {
                  email: true,
                  autocomplete: 'email',
                  keyboard: 'email-address',
                  maxLength: 254,
                })}
                {field('Password (10+ characters)', c.password, c.setPassword, {
                  password: true,
                  autocomplete: 'new-password',
                })}
                {field(
                  'Confirm password',
                  c.passwordConfirmation,
                  c.setPasswordConfirmation,
                  { password: true, autocomplete: 'new-password' },
                )}
                {field(
                  'Public username (3–20 characters)',
                  c.username,
                  c.setUsername,
                  { autocomplete: 'username', maxLength: 20 },
                )}
                {field('Short bio (optional)', c.bio, c.setBio, {
                  multiline: true,
                  maxLength: 280,
                })}
                {button(
                  c.busy ? 'Creating account…' : 'Create account',
                  c.signUp,
                  c.busy,
                )}
                {button('Back to sign in', () => c.setAuthMode('signin'))}
              </>
            ) : c.authMode === 'recovery' ? (
              <>
                {field('Account email', c.email, c.setEmail, {
                  email: true,
                  autocomplete: 'email',
                  keyboard: 'email-address',
                  maxLength: 254,
                })}
                {button(
                  c.busy ? 'Sending…' : 'Email recovery code',
                  c.sendCode,
                  c.busy || !c.email.trim(),
                )}
                {button('Back to sign in', () => c.setAuthMode('signin'))}
              </>
            ) : (
              <>
                {field('Email address', c.email, c.setEmail, {
                  email: true,
                  autocomplete: 'email',
                  keyboard: 'email-address',
                  maxLength: 254,
                })}
                {field('Password', c.password, c.setPassword, {
                  password: true,
                  autocomplete: 'current-password',
                })}
                {button(
                  c.busy ? 'Signing in…' : 'Sign in',
                  c.signIn,
                  c.busy || !c.email.trim() || !c.password,
                )}
                {button('Create account', () => c.setAuthMode('signup'))}
                {button('Forgot or set password', () =>
                  c.setAuthMode('recovery'),
                )}
              </>
            )}
          </View>
        )}
      {(signupCode || recoveryCode) && !c.passwordSetupReady && (
        <View style={styles.optionCard}>
          <Text style={styles.optionName}>
            {signupCode ? 'Confirm your email' : 'Verify your email'}
          </Text>
          <Text>Enter the code sent to {c.sentEmail}.</Text>
          {field(
            signupCode ? 'Confirmation code' : 'Recovery code',
            c.code,
            value => c.setCode(value.replace(/\D/g, '')),
            {
              keyboard: 'number-pad',
              autocomplete: 'one-time-code',
              maxLength: 10,
            },
          )}
          {button(
            signupCode ? 'Verify and create profile' : 'Verify code',
            c.verifyCode,
            c.busy || !c.code.trim(),
          )}
          {recoveryCode &&
            button(
              c.resendSeconds
                ? `Resend in ${c.resendSeconds}s`
                : 'Resend recovery code',
              c.sendCode,
              c.busy || c.resendSeconds > 0,
            )}
          {button('Cancel', c.changeEmail)}
        </View>
      )}
      {c.passwordSetupReady && (
        <View style={styles.optionCard}>
          <Text style={styles.optionName}>Choose a password</Text>
          {field('New password (10+ characters)', c.password, c.setPassword, {
            password: true,
            autocomplete: 'new-password',
          })}
          {field(
            'Confirm new password',
            c.passwordConfirmation,
            c.setPasswordConfirmation,
            { password: true, autocomplete: 'new-password' },
          )}
          {button('Save password', c.setNewPassword, c.busy)}
        </View>
      )}
      {!!c.session && !c.passwordSetupReady && (
        <View style={styles.optionCard}>
          <Text>
            Signed in{c.session.user.email ? ` as ${c.session.user.email}` : ''}
            . Your email is private.
          </Text>
          {purpose === 'account' && (
            <>
              {field('Public username', c.username, c.setUsername, {
                autocomplete: 'username',
                maxLength: 20,
              })}
              {field('Short bio (optional)', c.bio, c.setBio, {
                multiline: true,
                maxLength: 280,
              })}
              {button('Save profile', c.saveProfile, c.busy || !c.accountReady)}
            </>
          )}
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
  bioInput: { minHeight: 96, textAlignVertical: 'top' },
  fieldLabel: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
  },
});
