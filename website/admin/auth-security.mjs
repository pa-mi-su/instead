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
