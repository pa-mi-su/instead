'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import type { useCommunity } from '../../src/hooks/useCommunity';
import type { AvatarUpload } from '../../src/lib/community';
import { CommunityAccountControls } from './community-account-controls';

export function CommunityAccess({
  community: c,
  purpose,
}: {
  community: ReturnType<typeof useCommunity>;
  purpose: 'community' | 'account';
}) {
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const deletionDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (c.deletionComplete && !deletionDialog.current?.open) deletionDialog.current?.showModal();
  }, [c.deletionComplete]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const signupCode = c.pendingAuth === 'signup' && c.sentEmail;
  const passwordRecovery = c.pendingAuth === 'recovery';

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  function passwordField(
    id: string,
    label: string,
    key: string,
    value: string,
    onChange: (value: string) => void,
    autoComplete: 'current-password' | 'new-password',
    minimumLength = 0,
  ) {
    const visible = Boolean(visiblePasswords[key]);
    return <div className="community-password-field">
      <label htmlFor={id}>{label}</label>
      <div className="community-password-row">
        <input id={id} type={visible ? 'text' : 'password'} autoComplete={autoComplete} required minLength={minimumLength || undefined} value={value} onChange={event => onChange(event.target.value)} />
        <button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisiblePasswords(current => ({ ...current, [key]: !current[key] }))}>{visible ? 'Hide' : 'Show'}</button>
      </div>
      {minimumLength > 0 && value.length > 0 && value.length < minimumLength && <p className="password-hint" role="alert">Password needs at least {minimumLength} characters. Add {minimumLength - value.length} more.</p>}
      {c.errorSource === 'validation' && c.error.toLowerCase().includes('password') && key !== 'signin' && <p className="password-hint" role="alert">{c.error}</p>}
    </div>;
  }

  function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setPhotoError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Choose a JPEG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Choose an image smaller than 2 MB.');
      event.target.value = '';
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemoveAvatar(false);
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      let upload: AvatarUpload | undefined;
      if (avatarFile) {
        upload = {
          bytes: await avatarFile.arrayBuffer(),
          contentType: avatarFile.type as AvatarUpload['contentType'],
        };
      }
      const saved = await c.saveProfile(upload, removeAvatar);
      if (saved) {
        setAvatarFile(null);
        setAvatarPreview(null);
        setRemoveAvatar(false);
        setEditingProfile(false);
      }
    } catch {
      setPhotoError('Could not read that photo. Choose it again and retry.');
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <section className="community-access" aria-label="INSTEAD account">
      {c.deletionComplete && <dialog ref={deletionDialog} onClose={c.dismissDeletionConfirmation} onCancel={c.dismissDeletionConfirmation} aria-labelledby="deletion-complete-title" className="deletion-complete-dialog">
        <h2 id="deletion-complete-title">Account deleted</h2>
        <p>Your account and community data have been permanently deleted. You are now signed out.</p>
        <button type="button" onClick={c.dismissDeletionConfirmation}>Continue browsing</button>
      </dialog>}
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
              {passwordField('community-password-signup', 'Password (10+ characters)', 'signup', c.password, c.setPassword, 'new-password', 10)}
              {passwordField('community-password-confirm', 'Confirm password', 'signup-confirm', c.passwordConfirmation, c.setPasswordConfirmation, 'new-password', 10)}
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
              {passwordField('community-password-login', 'Password', 'signin', c.password, c.setPassword, 'current-password')}
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
          {passwordField('community-password-new', 'New password (10+ characters)', 'recovery', c.password, c.setPassword, 'new-password', 10)}
          {passwordField('community-password-new-confirm', 'Confirm new password', 'recovery-confirm', c.passwordConfirmation, c.setPasswordConfirmation, 'new-password', 10)}
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
            <div className="profile-summary">
              {c.avatarUrl ? <span className="profile-avatar-image" role="img" aria-label="Your profile avatar" style={{ backgroundImage: `url("${c.avatarUrl}")` }} /> : <span className="profile-avatar-placeholder">{(c.profile?.username ?? c.username ?? '?')[0]?.toUpperCase() ?? '?'}</span>}
              <div><strong>{c.profile?.username ? `@${c.profile.username}` : 'Set your username'}</strong><p>{c.profile?.bio || 'Add a short bio if you like.'}</p></div>
              {c.profileLoadError && <p role="alert">Could not load your profile. You can still update it here.</p>}
              <button type="button" disabled={c.busy || !c.canEditProfile} onClick={() => setEditingProfile(true)}>Update profile</button>
            </div>
          )}
          <button type="button" disabled={c.busy} onClick={c.signOut}>Sign out</button>
          <CommunityAccountControls community={c} />
        </section>
      )}
      {editingProfile && purpose === 'account' && (
        <div className="profile-editor-backdrop">
          <section className="profile-editor" role="dialog" aria-modal="true" aria-labelledby="profile-editor-title">
            <button type="button" className="profile-editor-close" onClick={() => setEditingProfile(false)}>Close</button>
            <h2 id="profile-editor-title">Update your profile</h2>
            <p>Your username, optional bio, and avatar appear with approved recipes. Your email stays private.</p>
            <form onSubmit={updateProfile}>
              {(avatarPreview || (!removeAvatar && c.avatarUrl)) && <span className="profile-editor-avatar" role="img" aria-label="Profile avatar preview" style={{ backgroundImage: `url("${avatarPreview ?? c.avatarUrl}")` }} />}
              <label htmlFor="community-profile-avatar">Profile avatar (optional)</label>
              <input id="community-profile-avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} />
              {avatarFile && <p>Selected: {avatarFile.name}</p>}
              {(avatarFile || c.avatarUrl) && <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null); setRemoveAvatar(true); }}>Remove avatar</button>}
              {photoError && <p role="alert" className="password-hint">{photoError}</p>}
              <label htmlFor="community-profile-username">Public username</label>
              <input id="community-profile-username" autoComplete="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" value={c.username} onChange={event => c.setUsername(event.target.value)} />
              <label htmlFor="community-profile-bio">Short bio (optional)</label>
              <textarea id="community-profile-bio" maxLength={280} value={c.bio} onChange={event => c.setBio(event.target.value)} />
              <p>{c.bio.length}/280 characters</p>
              {!!c.error && <p role="alert" className="password-hint">{c.error}</p>}
              <button disabled={savingProfile || c.busy || !c.canEditProfile}>{savingProfile || c.busy ? 'Updating…' : 'Update profile'}</button>
              <button type="button" disabled={savingProfile || c.busy} onClick={() => setEditingProfile(false)}>Cancel</button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
