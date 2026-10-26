# Private web administration

URL: https://insteadtry.com/admin (static S3/CloudFront shell; no additional server).

Sign in with the existing authorized owner’s email and its eight-digit Supabase code, then verify the six-digit authenticator code. First use requires the owner to enroll their own TOTP authenticator. Only explicit membership in the private community_admins table enables access. Entering the same email in a browser does not grant permissions; the verified Auth identity and current membership are checked in the database on every request. The owner approved restricting initial access to their existing account. No public profile is created.

## Operations

- Recipes → Awaiting review: read the full submission, load and inspect every photo, and write a specific review reason. Confirm the review checkbox to approve. The editor records the authenticated admin and review reason; it does not ask for reviewer qualifications or evidence-source fields.
- Built-in recipes: edit the shipped app recipes or add one to an existing topic. Saving publishes the text in the app after its next catalog refresh. The editor keeps recipe IDs stable for ratings and historical references, records every change and reason, and archives recipes without deleting their history. The editor changes text only; packaged photos remain as shipped. New admin recipes do not include photos.
- Approved / Rejected / All submissions: inspect previously reviewed content and unpublish when necessary.
- Open reports: reports are grouped by reason with counts and latest timestamps. Marking reports reviewed acknowledges only the loaded report snapshot; later reports remain open. Reports alone never delete content.
- Remove to Trash: immediately hides the content from new directory reads. It retains the submission for recovery, rather than permanently deleting data. Already issued photo links may persist for up to five minutes. Owners can still remove their own files where the existing withdrawal rules permit it.
- Trash → Restore: returns content to pending review. It does not republish automatically. Author-withdrawn recipes cannot be restored through the panel. Missing photos prevent approval.
- Restrict account: blocks contributions and hides the account's public content through existing server checks. Restoring account access does not approve content or cancel an account-deletion request. Admin accounts cannot be restricted from this panel.
- Restricted accounts & deletion requests: review current restrictions and pending cleanup. Deletion requests still use the verified-owner deletion function. There is no arbitrary permanent account deletion button.
- Activity log: records each action and reason. Deleted content's audit and report-review rows are cleaned up by triggers. Account references are cleared on Auth deletion. Keep notes factual and free of unnecessary private information.

Queues, accounts, and the activity log use 20-record pagination. Signed photo URLs expire after five minutes. Admin session tokens stay in this browser tab’s sessionStorage. The panel clears private data and signs out after 15 minutes without activity, including checking again when a background tab becomes visible. Successful logout removes the Auth session, which the database checks on every admin request. If the network is unavailable, local data is still cleared but remote logout may fail; the timeout is a browser control, not a project-wide Auth timeout. Signing out targets only that session.

## Setup and verification

1. Ensure supabase/directory-topics.sql and supabase/recipe-voting.sql are installed after community-safeguards.sql. `supabase/recipe-comments.sql` is legacy compatibility only; the app does not accept or display comments. Apply supabase/admin-panel.sql, then supabase/builtin-recipe-admin.sql. The final migration adds the protected editor and public recipe-catalog read RPC. None of these migrations grants admin membership.
2. As the Supabase project owner, grant exactly the confirmed verified account a community_admins row. Do not grant based on a client-supplied email, JWT metadata, or public signup. There is no client role-management endpoint. Keep owner email and Auth UUID out of public source.
3. After CI passes on main, GitHub Actions builds and publishes website/dist to the dedicated website bucket and invalidates CloudFront automatically. The build uses the production environment's public SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY. The builder rejects service-role and unknown key types. Check the CI deployment job if the live panel does not update.
4. Verify that anonymous and ordinary verified users cannot access the admin RPC or pending photos; verify the authorized owner can sign in. Never include a service-role key in the static site.

Run `python3 scripts/test-community-db.py` with PostgreSQL installed (or set INSTEAD_PG_BIN). It creates and tears down its own disposable cluster and runs the complete community, recipe, safeguard, voting, and admin suites; it cannot target a hosted database. Built-in recipe tests cover editor authorization, content validation, live catalog updates, archive/restore, and audit history. Browser checks use local synthetic fixtures; no real submissions are approved or removed during development.

Deployment confirmed October 16, 2026: the owner explicitly approved the final access grant, and the live transaction enabled only the existing verified owner account. No personal email or Auth identifier is stored in this source document. Anonymous live admin RPC requests are denied. PR #9 passed its required Quality and Android check. The admin panel retains its separate email-code plus authenticator sign-in.

## Authenticator enrollment and recovery

1. Refresh https://insteadtry.com/admin and sign in using the owner email and eight-digit email code.
2. Choose Set up authenticator. The owner must perform this step personally: it creates their authentication secret.
3. Scan the QR with a TOTP authenticator or enter the manual setup key privately. Do not share or screenshot real setup secrets/codes into chat or issue trackers. Keep the authenticator’s backup/recovery method available.
4. Enter its current six-digit code and choose Verify authenticator and open admin. Wrong codes leave all moderation data locked. If setup was interrupted, Replace unfinished authenticator setup only replaces the panel’s unverified INSTEAD Admin factor; the owner must scan the new QR.
5. Future email sign-ins require the authenticator challenge. Admin MFA must be verified again after eight hours even if tokens were refreshed. Ordinary contributor accounts remain email-code-only; no global session timeout is changed.

The database requires current owner membership, AAL2 signed JWT claims, a currently verified TOTP factor, a TOTP AMR timestamp within eight hours, and an existing matching auth.sessions row. Membership-only enrollment bootstrap reveals only the authorized account’s reviewer label. It cannot read queues or pending photos. Client claim decoding is a navigation hint; bypassing it cannot bypass the database.

There is no email-only MFA bypass or public reset endpoint. If the authenticator is lost, use the independently secured Supabase project-owner console for recovery after verifying identity; disabling/replacing a verified factor is a separate security-sensitive action. Supabase does not supply app recovery codes in this implementation. The owner must complete real enrollment and a real sign-in; development tests use synthetic factors/codes only.

References: https://supabase.com/docs/guides/auth/auth-mfa/totp and https://supabase.com/docs/guides/auth/sessions#how-to-ensure-an-access-token-jwt-cannot-be-used-after-a-user-signs-out

Legacy comment tables and cleanup triggers remain for account deletion and retention, but the current admin interface does not expose a comment queue. Bundled recipes have explicit stable IDs; community recipes use their existing UUIDs.
