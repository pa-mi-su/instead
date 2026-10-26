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
  const button = (
    label: string,
    action: () => unknown,
    disabled = c.busy,
    primary = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={action}
      style={({ pressed }) => [
        local.authButton,
        primary && local.authButtonPrimary,
        disabled && local.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[local.authButtonText, primary && local.authButtonTextPrimary]}
      >
        {label}
      </Text>
    </Pressable>
  );
  const link = (label: string, url: string) => (
    <Pressable
      accessibilityRole="link"
      key={label}
      onPress={() => Linking.openURL(url).catch(() => undefined)}
      style={({ pressed }) => [local.policyLink, pressed && styles.pressed]}
    >
      <Text style={local.policyLinkText}>{label}</Text>
    </Pressable>
  );
  const modeTab = (label: string, mode: 'signin' | 'signup') => {
    const selected = c.authMode === mode;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => c.setAuthMode(mode)}
        style={[local.modeTab, selected && local.modeTabSelected]}
      >
        <Text
          style={[local.modeTabText, selected && local.modeTabTextSelected]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };
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
      {!!c.error && (
        <View style={local.errorBox}>
          <Text accessibilityRole="alert" style={local.errorText}>
            {c.error}
          </Text>
          {c.errorSource !== 'auth' &&
            button('Reload account and community', c.retry, false)}
        </View>
      )}
      {!!c.notice && (
        <Text accessibilityLiveRegion="polite" style={local.noticeText}>
          {c.notice}
        </Text>
      )}
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
              {c.authMode === 'signup'
                ? 'Create a profile to share recipes and keep saved guides in sync. Your email stays private.'
                : c.authMode === 'recovery'
                ? 'Get an email code to set or reset your account password.'
                : 'Use your email and password. Your email stays private; your public username appears with approved recipes.'}
            </Text>
            <View style={local.policyLinks}>
              {link('Terms of Use', 'https://insteadtry.com/terms')}
              {link('Privacy Policy', 'https://insteadtry.com/privacy')}
            </View>
            {c.authMode !== 'recovery' && (
              <View
                style={local.modeSwitch}
                accessibilityLabel="Account options"
              >
                {modeTab('Sign in', 'signin')}
                {modeTab('Create account', 'signup')}
              </View>
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
                <View style={local.actionStack}>
                  {button(
                    c.busy
                      ? 'Creating account…'
                      : c.errorSource === 'auth'
                      ? 'Try creating account again'
                      : 'Create account',
                    c.signUp,
                    c.busy,
                    true,
                  )}
                </View>
              </>
            ) : c.authMode === 'recovery' ? (
              <>
                {field('Account email', c.email, c.setEmail, {
                  email: true,
                  autocomplete: 'email',
                  keyboard: 'email-address',
                  maxLength: 254,
                })}
                <View style={local.actionStack}>
                  {button(
                    c.busy ? 'Sending…' : 'Email recovery code',
                    c.sendCode,
                    c.busy || !c.email.trim(),
                    true,
                  )}
                  {button('Back to sign in', () => c.setAuthMode('signin'))}
                </View>
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
                <View style={local.actionStack}>
                  {button(
                    c.busy
                      ? 'Signing in…'
                      : c.errorSource === 'auth'
                      ? 'Try signing in again'
                      : 'Sign in',
                    c.signIn,
                    c.busy || !c.email.trim() || !c.password,
                    true,
                  )}
                  {button('Forgot or set password', () =>
                    c.setAuthMode('recovery'),
                  )}
                </View>
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
          <View style={local.actionStack}>
            {button(
              signupCode ? 'Verify and create profile' : 'Verify code',
              c.verifyCode,
              c.busy || !c.code.trim(),
              true,
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
          <View style={local.actionStack}>
            {button('Save password', c.setNewPassword, c.busy, true)}
          </View>
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
  errorBox: {
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFF0EB',
    borderWidth: 1,
    borderColor: '#E7B9AC',
  },
  errorText: { color: '#8A2F20', fontSize: 14, lineHeight: 20 },
  noticeText: { color: COLORS.ink, fontSize: 14, lineHeight: 20 },
  policyLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 22,
    marginTop: 4,
    marginBottom: 16,
  },
  policyLink: { paddingVertical: 6 },
  policyLinkText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  modeSwitch: {
    flexDirection: 'row',
    gap: 6,
    padding: 5,
    marginBottom: 4,
    borderRadius: 16,
    backgroundColor: '#F0F2E9',
  },
  modeTab: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  modeTabSelected: {
    backgroundColor: COLORS.white,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  modeTabText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  modeTabTextSelected: { color: COLORS.ink, fontWeight: '900' },
  actionStack: { gap: 10, marginTop: 16 },
  authButton: {
    width: '100%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 16,
    backgroundColor: COLORS.white,
  },
  authButtonPrimary: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  authButtonText: { color: COLORS.ink, fontSize: 15, fontWeight: '800' },
  authButtonTextPrimary: { color: COLORS.white },
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
