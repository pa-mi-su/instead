# Private web administration

URL: https://insteadtry.com/admin (static S3/CloudFront shell; no additional server).

Sign in with the existing authorized owner's email and its eight-digit Supabase code. Only explicit membership in the private community_admins table enables access. Entering the same email in a browser does not grant permissions; the verified Auth identity and current membership are checked in the database on every request. The owner approved restricting initial access to their existing account. No public profile is created.

## Operations

- Recipes / Comments → Awaiting review: read the full submission, load and inspect every photo, and write a specific review reason. Confirm the review checkbox to approve. Health and personal-care approvals additionally require actual reviewer qualifications and evidence sources; text fields do not verify professional credentials.
- Approved / Rejected / All submissions: inspect previously reviewed content and unpublish when necessary.
- Open reports: reports are grouped by reason with counts and latest timestamps. Marking reports reviewed acknowledges only the loaded report snapshot; later reports remain open. Reports alone never delete content.
- Remove to Trash: immediately hides the content from new directory reads. It retains the submission for recovery, rather than permanently deleting data. Already issued photo links may persist for up to five minutes. Owners can still remove their own files where the existing withdrawal rules permit it.
- Trash → Restore: returns content to pending review. It does not republish automatically. Author-withdrawn recipes cannot be restored through the panel. Missing photos prevent approval.
- Restrict account: blocks contributions and hides the account's public content through existing server checks. Restoring account access does not approve content or cancel an account-deletion request. Admin accounts cannot be restricted from this panel.
- Restricted accounts & deletion requests: review current restrictions and pending cleanup. Deletion requests still use the verified-owner deletion function. There is no arbitrary permanent account deletion button.
- Activity log: records each action and reason. Deleted content's audit and report-review rows are cleaned up by triggers. Account references are cleared on Auth deletion. Keep notes factual and free of unnecessary private information.

Queues, accounts, and the activity log use 20-record pagination. Signed photo URLs expire after five minutes. Admin session tokens stay in this browser tab's sessionStorage; signing out removes them and logs out only that admin session, leaving mobile sessions alone.

## Setup and verification

1. Apply the repeatable supabase/admin-panel.sql after community-safeguards.sql. It grants no admin membership by itself.
2. As the Supabase project owner, grant exactly the confirmed verified account a community_admins row. Do not grant based on a client-supplied email, JWT metadata, or public signup. There is no client role-management endpoint. Keep owner email and Auth UUID out of public source.
3. Build with npm run website:build, using the same public SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY. The builder rejects service-role and unknown key types. Upload website/dist to the dedicated website bucket; invalidate /admin and /admin/* on CloudFront.
4. Verify that anonymous and ordinary verified users cannot access the admin RPC or pending photos; verify the authorized owner can sign in. Never include a service-role key in the static site.

Run `python3 scripts/test-community-db.py` with PostgreSQL installed (or set INSTEAD_PG_BIN). It creates and tears down its own disposable cluster and runs the complete community, recipe, safeguard, and admin suites; it cannot target a hosted database. Database assertions include supabase/admin-panel.test.sql. They cover repeatable installation, non-admin/unverified/anonymous denials, private photo access, approval requirements, restrictions, audit logging, Trash restoration, report snapshots, author withdrawals, missing photos, and access revocation. Browser checks use local synthetic fixtures; no real submissions are approved or removed during development.

Deployment confirmed October 16, 2026: the owner explicitly approved the final access grant, and the live transaction enabled only the existing verified owner account. No personal email or Auth identifier is stored in this source document. Anonymous live admin RPC requests are denied. PR #9 passed its required Quality and Android check. The owner should complete the first live email-code sign-in to verify their browser session.
