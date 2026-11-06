# Community accounts, passwords, and profiles

Current source behavior, audited November 5, 2026. For the complete database sequence, use [the Supabase guide](../supabase/README.md); do not replay one-time community/recipe migrations in an existing project.

## Product and account boundaries

Guests can browse guides/recipes and optionally scan barcodes. **Saving requires a verified, non-anonymous account** and uses account-owned Supabase bookmarks for guides and individual recipes. The Saved screen offers registration/sign-in to guests; it does not display or import old device-wide bookmarks. My INSTEAD contains profile/submission/account controls, not a duplicate saved list.

Normal sign-in uses email/password. Signup collects a public username, password/confirmation, and optional bio; email confirmation is required. Optional public avatars are editable after sign-in. Approved community recipes link to the author's public profile; emails, saves, pending submissions, and reports stay private. The client persists Supabase sessions in AsyncStorage, not plaintext passwords. Sign-out resets auth fields and password visibility, clears the account view, and prevents late responses from restoring another account's state.

Verified active contributors must explicitly accept the current account-linked community terms before submitting or voting. Recipe submissions/photos remain unpublished until moderation. Reporting and personal recipe hiding use verified active-account checks; they are separate from publishing permission. No public comment feed is offered, although historical tables and cleanup functions remain.

## Configure a target environment

1. Apply the ordered SQL migrations and deploy both Edge Functions from [the Supabase guide](../supabase/README.md). Source merges do not perform these operations.
2. Enable email/password signup and require email confirmation. Keep anonymous sign-in disabled for this product. Database account checks independently reject anonymous, unverified, banned, restricted, and deletion-pending writes as appropriate.
3. Match password rules to the app's minimum **10 characters**. Keep secure email-change/password-change settings consistent with the tested recovery flow. Supabase plan-dependent leaked-password protection is not replaced by a client-only check; the owner retained the Free plan in the recorded rollout.
4. Configure **eight-digit email codes with 300-second server expiry**, send limits, and confirmation/recovery templates showing `{{ .Token }}`. Supabase Auth owns real expiry; browser/app timers alone cannot enforce it. The recorded November 1 settings are described in [the Auth review](admin-auth-security-review.md); verify each target project's actual saved settings.
5. Configure custom SMTP in Supabase Auth using dedicated server-side sender credentials. Report-email SMTP is a separate Edge Function configuration. Never use a service-role or SMTP credential as client config.
6. Supply `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to native/static builds. Leaving both blank provides offline native browsing only. Follow the root README for environment generation.

The October 16 SES setup established the insteadtry.com sender in us-east-1 and custom Auth email delivery. That is dated deployment evidence, not a permanent deliverability guarantee. Keep inbound support verification separate from outbound sender verification. See [SES history](ses-audit.md) and the current [email delivery diagnostics](email-delivery-diagnostics.md). Signup confirmation has a dedicated resend action with a 60-second local cooldown; Supabase remains authoritative for send limits and expiry.

## Confirmation and recovery

Signup verifies a signup token; normal sign-in verifies a password. **Forgot password?** sends an actual Supabase recovery code using `resetPasswordForEmail`, verifies it with token type `recovery`, and opens a five-minute password-reset window. The app checks password/confirmation and expires the verified form. Older passwordless accounts can use that recovery path to establish a password. A normal email sign-in session is not treated as recovery.

The historical build 426 recovery implementation was incompatible with current-password enforcement. The owner subsequently authorized the security rollout despite that older-build interruption. Use the updated app and verify hosted switches for the target environment rather than treating an old beta or dated note as the current contract.

Account setup displays progress while profile/safeguard checks complete; failed checks offer retry. Account/profile reads are independent, bounded, and account-scoped so a slow response is not interpreted as a completed empty profile or another user's data.

## Saved, personal hiding, and deletion

Guides and recipe bookmarks synchronize through private RPCs; direct client table access is denied. Account switches/sign-out hide the previous account's data. Saved recipe links preserve both topic and recipe IDs, wait for layout, and paginate published community content when needed to locate the exact card.

Reporting or blocking permanently excludes the target for that account. A community action also excludes the contributor, all their published recipes across guides, and their profile. Catalogue recipes without a contributor are excluded individually. There is no history, blocked/hidden list, restoration, or unblock UI/API. Affected recipe bookmarks are removed privately. Other accounts retain access while admin review is pending or accepts the content; only explicit global removal changes their publication. See [permanent exclusions](permanent-recipe-exclusions.md).

My INSTEAD has a separate deletion section with confirmation. A request hides public contributions, then invokes Storage-first permanent deletion. Progress stays visible during processing. Success clears local account state and shows confirmation; failure stays pending/retryable. The admin can initiate the same cleanup for eligible non-admin users through separately authorized controls. See [admin operations](admin-panel.md) for audit/privacy and backup limitations.

## Avatar deployment

Apply `profile-avatars.sql` before releasing avatar controls. JPEG, PNG, and WebP images up to 2 MiB are accepted. The native picker requests compatible images bounded to 512×512 without extra EXIF data; bytes determine the upload MIME type. Avatar images themselves are public. Account-owner policies and active-account checks protect writes.

```bash
node --env-file=.env scripts/check-profile-avatars.mjs
```

This readiness probe uses public configuration, checks bucket readiness, and verifies anonymous avatar mutations are denied. It does not sign in or upload an image. Both signed release jobs run it before compiling.

## Account QA

Use consenting/disposable test accounts; never accept terms or delete a real account merely to test a migration.

- Guests browse but cannot save, vote, submit, or report without the relevant sign-in/verification checks.
- Signup, wrong/expired codes, resend cooldown, recovery, password validation, sign-out, restart, and offline/error retry behave clearly.
- Two accounts cannot read each other's saved items, submissions, reports, or hidden preferences; stale requests do not cross account boundaries.
- Public profiles show only eligible published content; optional public avatars are handled distinctly from private recipe photos.
- Submission/approval, Saved targeting, voting, permanent report/block exclusions and denied legacy undo calls, and global admin removal work for the applicable recipe types.
- Deletion shows progress, success clears credentials/account data, and failed cleanup remains retryable.

Run `npm run verify`, `npm run safety:test`, and `python3 scripts/test-community-db.py`. The database suite uses a disposable local cluster; fixtures must never be run in a hosted project. Real-device/provider integration remains a separate QA step.

## Signup integrity

Apply `supabase/signup-integrity.sql` after the permanent-exclusion override. Public username availability is checked before `auth.signUp`; the final case-insensitive unique index still resolves races. A profile insert/update trigger requires confirmed, non-anonymous Auth identity, including privileged or legacy profile writes. The legacy profile backfill now selects confirmed identities only. No unverified profile or pending username reservation is created by signup.

Supabase's native signup intentionally stores a pending Auth identity and password hash before email verification so it can issue and verify its challenge. That is not an authenticated session or public profile. Removing even the pending Auth row would require a different challenge/registration backend; this change retains Supabase Auth's security controls rather than introducing a custom OTP system.

If a handle becomes unavailable between preflight and verification, the verified identity stays in **Finish your account setup** with its draft, can choose another username, and can finish without another email code. Signing in after interruption also exposes the setup form for an identity with no profile. A deleted Auth account releases its public username through the existing cascading FK. Do not delete another live account merely to free a handle; identify and confirm the intended cleanup target.

Password clear buttons apply to sign-in, signup, confirmation-password, and recovery-password fields. Clearing does not submit anything and resets that field to hidden entry.

The signup preflight and verified-profile guard were deployed and checked on November 6, 2026; existing public profile records were unchanged. Mobile preflight, recovery UI, and password-clear controls require the updated binary. The production audit found no orphan profiles and no profiles belonging to unverified Auth identities.
