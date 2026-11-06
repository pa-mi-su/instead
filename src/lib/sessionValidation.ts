import type { CommunityClient, CommunitySession } from './community';

export type SessionCheck =
  | { status: 'valid'; session: CommunitySession }
  | { status: 'invalid' }
  | { status: 'unavailable' };

// Coalesce simultaneous screen checks, but never cache successful validation:
// an account can be deleted between foreground visits with an unexpired JWT.
const pending = new WeakMap<
  CommunityClient,
  Map<string, Promise<SessionCheck>>
>();
export async function readStoredSession(client: CommunityClient) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      client.auth.getSession(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Session check timed out')),
          15000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export function sameSession(
  a: CommunitySession | null,
  b: CommunitySession | null,
) {
  return a?.user.id === b?.user.id && a?.access_token === b?.access_token;
}
export function validateSession(
  client: CommunityClient,
  candidate: CommunitySession,
): Promise<SessionCheck> {
  let checks = pending.get(client);
  if (!checks) {
    checks = new Map();
    pending.set(client, checks);
  }
  const key = candidate.access_token ?? candidate.user.id;
  const existing = checks.get(key);
  if (existing) return existing;
  const check = (async (): Promise<SessionCheck> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        client.auth.getUser(candidate.access_token),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Session check timed out')),
            15000,
          );
        }),
      ]);
      if (result.error) {
        const error = result.error as { status?: number; code?: string };
        if (
          error.status === 401 ||
          error.status === 403 ||
          [
            'user_not_found',
            'session_not_found',
            'bad_jwt',
            'refresh_token_not_found',
            'refresh_token_already_used',
          ].includes(error.code ?? '')
        )
          return { status: 'invalid' };
        return { status: 'unavailable' };
      }
      if (
        !result.data.user ||
        result.data.user.id !== candidate.user.id ||
        !result.data.user.email_confirmed_at ||
        result.data.user.is_anonymous
      )
        return { status: 'invalid' };
      return {
        status: 'valid',
        session: { ...candidate, user: result.data.user },
      };
    } catch {
      return { status: 'unavailable' };
    } finally {
      clearTimeout(timer);
    }
  })();
  checks.set(key, check);
  void check.finally(() => {
    if (checks!.get(key) === check) checks!.delete(key);
  });
  return check;
}

// Never revoke a newer login because an older validation finished late.
export async function clearInvalidSession(
  client: CommunityClient,
  candidate: CommunitySession,
) {
  const { data, error } = await readStoredSession(client);
  if (error || !sameSession(data.session, candidate)) return;
  await client.auth.signOut({ scope: 'local' });
}
