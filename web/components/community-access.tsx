'use client';

import Link from 'next/link';
import type { useCommunity } from '../../src/hooks/useCommunity';
import { CommunityAccountControls } from './community-account-controls';

export function CommunityAccess({
  community: c,
  purpose,
}: {
  community: ReturnType<typeof useCommunity>;
  purpose: 'community' | 'account';
}) {
  const signupCode = c.pendingAuth === 'signup' && c.sentEmail;
  const passwordRecovery = c.pendingAuth === 'recovery';

  return (
    <section className="community-access" aria-label="INSTEAD account">
      <p>
        {purpose === 'account'
          ? 'Create a profile to share recipes, keep your saved guides in sync, and manage your submissions. Your email stays private.'
          : 'Sign in to vote or share a recipe. Your public username identifies approved recipes; your email stays private.'}
      </p>
      {!c.configured && <p>Account features are not configured yet.</p>}
      {c.error && (
        <p role="alert">
          {c.error}{' '}
          <button type="button" disabled={c.busy} onClick={c.retry}>
            Retry
          </button>
        </p>
      )}
      {c.notice && <p role="status">{c.notice}</p>}
      {c.configured && c.authReady && !c.session && !signupCode && (
        <section aria-label="Account sign-in">
          <p>
            Email and password sign-in. New accounts confirm their email. Use
            password recovery if you already used an email code in an earlier
            version. By continuing, you agree to our{' '}
            <Link href="/terms">Terms</Link> and{' '}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
          {c.authMode === 'signup' ? (
            <form onSubmit={event => { event.preventDefault(); c.signUp(); }}>
              <label htmlFor="community-email-signup">Email address</label>
              <input id="community-email-signup" type="email" autoComplete="email" required maxLength={254} value={c.email} onChange={event => c.setEmail(event.target.value)} />
              <label htmlFor="community-password-signup">Password</label>
              <input id="community-password-signup" type="password" autoComplete="new-password" required minLength={10} value={c.password} onChange={event => c.setPassword(event.target.value)} />
              <label htmlFor="community-password-confirm">Confirm password</label>
              <input id="community-password-confirm" type="password" autoComplete="new-password" required minLength={10} value={c.passwordConfirmation} onChange={event => c.setPasswordConfirmation(event.target.value)} />
              <label htmlFor="community-username">Public username</label>
              <input id="community-username" autoComplete="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" value={c.username} onChange={event => c.setUsername(event.target.value)} />
              <label htmlFor="community-bio">Short bio (optional)</label>
              <textarea id="community-bio" maxLength={280} value={c.bio} onChange={event => c.setBio(event.target.value)} />
              <button disabled={c.busy}>{c.busy ? 'Creating…' : 'Create account'}</button>
              <button type="button" disabled={c.busy} onClick={() => c.setAuthMode('signin')}>Back to sign in</button>
            </form>
          ) : c.authMode === 'recovery' && !c.sentEmail ? (
            <form onSubmit={event => { event.preventDefault(); c.sendCode(); }}>
              <label htmlFor="community-email-recovery">Account email</label>
              <input id="community-email-recovery" type="email" autoComplete="email" required maxLength={254} value={c.email} onChange={event => c.setEmail(event.target.value)} />
              <button disabled={c.busy || !c.email.trim()}>{c.busy ? 'Sending…' : 'Email a recovery code'}</button>
              <button type="button" disabled={c.busy} onClick={() => c.setAuthMode('signin')}>Back to sign in</button>
            </form>
          ) : (
            <form onSubmit={event => { event.preventDefault(); c.signIn(); }}>
              <label htmlFor="community-email-login">Email address</label>
              <input id="community-email-login" type="email" autoComplete="email" required maxLength={254} value={c.email} onChange={event => c.setEmail(event.target.value)} />
              <label htmlFor="community-password-login">Password</label>
              <input id="community-password-login" type="password" autoComplete="current-password" required value={c.password} onChange={event => c.setPassword(event.target.value)} />
              <button disabled={c.busy || !c.password}>{c.busy ? 'Signing in…' : 'Sign in'}</button>
              <button type="button" disabled={c.busy} onClick={() => c.setAuthMode('signup')}>Create account</button>
              <button type="button" disabled={c.busy} onClick={() => c.setAuthMode('recovery')}>Forgot or set password</button>
            </form>
          )}
        </section>
      )}
      {signupCode && (
        <form onSubmit={event => { event.preventDefault(); c.verifyCode(); }}>
          <p>Enter the confirmation code sent to {c.sentEmail}.</p>
          <label htmlFor="community-code-signup">Email confirmation code</label>
          <input id="community-code-signup" inputMode="numeric" autoComplete="one-time-code" maxLength={10} required value={c.code} onChange={event => c.setCode(event.target.value.replace(/\D/g, ''))} />
          <button disabled={c.busy || !c.code.trim()}>{c.busy ? 'Verifying…' : 'Verify email and create profile'}</button>
          <button type="button" disabled={c.busy} onClick={c.changeEmail}>Cancel sign-up</button>
        </form>
      )}
      {passwordRecovery && c.sentEmail && !c.passwordSetupReady && !c.session && (
        <form onSubmit={event => { event.preventDefault(); c.verifyCode(); }}>
          <p>Enter the recovery code sent to {c.sentEmail}.</p>
          <label htmlFor="community-code-recovery">Recovery code</label>
          <input id="community-code-recovery" inputMode="numeric" autoComplete="one-time-code" maxLength={10} required value={c.code} onChange={event => c.setCode(event.target.value.replace(/\D/g, ''))} />
          <button disabled={c.busy || !c.code.trim()}>{c.busy ? 'Verifying…' : 'Verify code'}</button>
          <button type="button" disabled={c.busy || c.resendSeconds > 0} onClick={c.sendCode}>{c.resendSeconds ? `Resend in ${c.resendSeconds}s` : 'Resend recovery code'}</button>
          <button type="button" disabled={c.busy} onClick={c.changeEmail}>Cancel</button>
        </form>
      )}
      {c.passwordSetupReady && (
        <form onSubmit={event => { event.preventDefault(); c.setNewPassword(); }}>
          <label htmlFor="community-password-new">New password</label>
          <input id="community-password-new" type="password" autoComplete="new-password" required minLength={10} value={c.password} onChange={event => c.setPassword(event.target.value)} />
          <label htmlFor="community-password-new-confirm">Confirm new password</label>
          <input id="community-password-new-confirm" type="password" autoComplete="new-password" required minLength={10} value={c.passwordConfirmation} onChange={event => c.setPasswordConfirmation(event.target.value)} />
          <button disabled={c.busy}>{c.busy ? 'Saving…' : 'Save password'}</button>
        </form>
      )}
      {c.session && !c.passwordSetupReady && (
        <section aria-label="Your account">
          <p>
            Signed in{c.session.user.email ? ` as ${c.session.user.email}` : ''}.
            Your email is private.
          </p>
          {purpose === 'account' && (
            <form onSubmit={event => { event.preventDefault(); c.saveProfile(); }}>
              <label htmlFor="community-profile-username">Public username</label>
              <input id="community-profile-username" autoComplete="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" value={c.username} onChange={event => c.setUsername(event.target.value)} />
              <label htmlFor="community-profile-bio">Short bio (optional)</label>
              <textarea id="community-profile-bio" maxLength={280} value={c.bio} onChange={event => c.setBio(event.target.value)} />
              <button disabled={c.busy || !c.canManage}>{c.busy ? 'Saving…' : 'Save profile'}</button>
            </form>
          )}
          <button type="button" disabled={c.busy} onClick={c.signOut}>Sign out</button>
          <CommunityAccountControls community={c} />
        </section>
      )}
    </section>
  );
}
