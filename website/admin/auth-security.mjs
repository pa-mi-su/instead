export const ADMIN_IDLE_MS = 15 * 60 * 1000;
export const ADMIN_MFA_MS = 8 * 60 * 60 * 1000;
export function isIdle(session, now = Date.now()) {
  return (
    !Number.isFinite(session?.last_activity) ||
    session.last_activity > now + 60000 ||
    now - session.last_activity >= ADMIN_IDLE_MS
  );
}
// Navigation hint only. The database independently verifies signed JWT claims,
// current membership, a verified factor, and the live Auth session.
export function hasRecentMfa(accessToken, now = Date.now()) {
  try {
    const payload = accessToken
      .split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const claims = JSON.parse(atob(payload));
    return (
      claims.aal === 'aal2' &&
      Array.isArray(claims.amr) &&
      claims.amr.some(
        method =>
          method.method === 'totp' &&
          Number.isFinite(method.timestamp) &&
          method.timestamp * 1000 <= now + 60000 &&
          now - method.timestamp * 1000 < ADMIN_MFA_MS,
      )
    );
  } catch {
    return false;
  }
}

export const ADMIN_EMAIL_CODE_MS = 5 * 60 * 1000;
// UX deadline only: Supabase must also enforce mailer_otp_exp=300 server-side.
export class EmailChallenge {
  reset() {
    this.email = null;
    this.expiresAt = 0;
  }
  start(email, now = Date.now()) {
    this.email = email;
    this.expiresAt = now + ADMIN_EMAIL_CODE_MS;
  }
  current(now = Date.now()) {
    return this.email &&
      now < this.expiresAt &&
      now >= this.expiresAt - ADMIN_EMAIL_CODE_MS
      ? { email: this.email }
      : null;
  }
}
export function resetLoginForm($) {
  $('email-form').reset();
  $('code-form').reset();
  $('mfa-form').reset();
  $('code-form').hidden = true;
  for (const id of ['email', 'code', 'mfa-code']) $(id).value = '';
  for (const id of ['email-form', 'code-form', 'mfa-form'])
    for (const control of $(id).querySelectorAll('button, input'))
      control.disabled = false;
  $('mfa-start').disabled = false;
  $('send').textContent = 'Send sign-in code';
}
