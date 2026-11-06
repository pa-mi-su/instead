# Restored-session and deleted-account audit

## November 6, 2026 finding

After the owner-authorized deletion of the Outlook test account, the phone still had its previous Supabase session in AsyncStorage. `getSession()` restores local session material; it does not establish that the Auth user still exists. The old UI immediately displayed the cached email, failed to load the deleted profile, and offered account terms. The database account-state RPC also returned a default row for any non-null JWT subject, even when the Auth row had been deleted.

There was no orphan profile in the production audit. The deleted Auth identity remained absent. Existing `community_require_user` guards already looked up the live, confirmed, non-anonymous, unrestricted account for protected operations; no evidence of access to another user's private data was found. An account deletion does not immediately expire an already-issued signed JWT, so UI fixes alone are insufficient.

## Implemented behavior

- Restored sessions, Auth changes, and foreground visits validate the candidate with server `getUser(access_token)` before exposing its identity to app consumers. The live user must match the stored subject and be verified/non-anonymous. Public navigation changes alone do not trigger checks.
- Both stored-session loading/refresh and live-user validation have 15-second UI deadlines. Simultaneous checks for the same client/token share an in-flight lookup, but successful results are not cached across foreground checks.
- Private account/profile/author-only comment data and contribution controls are gated while validation is pending or unavailable. Saved already scopes its state to the exposed verified user. Recipe visibility also stays gated during validation so personal exclusions do not momentarily become guest lists.
- A terminal invalid/deleted identity clears the hook's account, profile, comments, password/signup/recovery drafts and starts local SDK sign-out. The stored token is compared before sign-out so late rejection of an older session does not intentionally clear a newer login. Failed transport/5xx checks do not delete genuine saved credentials: the UI shows an explicit retry state with private data hidden.
- Auth callbacks schedule validation without awaiting another Auth method inside the SDK callback lock. Generation checks ignore late results after sign-out, account changes, and unmount. Existing self-deletion keeps its dedicated progress and successful-deletion screens.
- `session-account-state.sql` returns account status only for an existing, verified, non-anonymous identity. Live suspended/deletion-pending accounts retain status for recovery/deletion controls. Legacy private recipe-photo ownership requires a live verified identity, and avatar deletion uses the same guarded owner helper as other avatar writes.

The server migration was deployed on November 6 with existing Auth accounts unchanged. The original deleted identity was verified absent. The mobile fix requires the new merged beta; server deployment cannot replace old client rendering behavior.

## Verification

App coverage includes delayed startup lookup, deleted-user local cleanup, foreground deletion, transient network failures and retry, finite deadlines, coalescing, user/token mismatch, unverified identities, stale successes after sign-out, stale rejection after a newer login, clean checking UI, and preserving unsaved edits across successful foreground validation. Navigation coverage verifies recipes remain gated during the check. Existing signup, recovery, sign-out, deletion, Saved and visibility tests continue to run.

The disposable PostgreSQL suite keeps an old JWT subject after deleting its Auth row: no account-status row or private photo ownership survives; profile creation, saves, terms acceptance, votes and reporting fail at the live-account guard. It also checks live/suspended status, anonymous/unverified denial, and repeatable migration deployment. Production verification inspects definitions/permissions and confirms account rows are unchanged; it does not forge JWTs or delete an additional real account.

Physical-device QA: sign in with a disposable account, background the app, delete that exact account through admin, reopen the app and expect a clean sign-in screen rather than cached identity/terms. Repeat on cold launch; test airplane mode/retry without losing a real account, account switching, recovery, and ordinary self-deletion. Keep the Apple reviewer account intact.

## Limits

This audit covers the relevant mobile session, account status, deletion and private ownership paths; it is not a claim that the entire application has no possible bugs. A disconnected client cannot learn of a remote deletion until it contacts the server. Existing JWT expiry/refresh behavior is unchanged; live-account database checks remain essential. Diagnostic/provider backups and logs are governed by their own retention, not a claim of immediate global erasure.

References: [Supabase user deletion and outstanding JWTs](https://supabase.com/docs/guides/auth/managing-user-data), [getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [getSession](https://supabase.com/docs/reference/javascript/auth-getsession).
