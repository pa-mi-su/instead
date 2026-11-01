# Admin authentication review — 2026-11-01

## Changes

- Ending a session immediately clears credentials, MFA setup material, private queue data, session storage, email challenge state, and resend/expiry timers. The login remains hidden until the session-ended dialog is dismissed, then opens at a blank email field.
- Email challenges are bound to the address that requested them and expire after five minutes using an absolute deadline. Editing the address invalidates pending responses. Late email verification, MFA verification, and refresh responses cannot restore an ended session; returned sessions are revoked locally at Supabase.
- Requests have a 20-second network deadline. Email resend UI uses elapsed wall time instead of timer ticks. Supabase rate limits remain authoritative.
- Unauthorized responses end the local session and attempt remote revocation. The existing database authorization independently checks membership, verified TOTP, AAL2, live Auth session, restrictions, and the eight-hour MFA limit.

## Hosted settings applied and verified

In Supabase Authentication → Sign In / Providers → Email:

- Email OTP expiration: changed from 600 to **300 seconds**. This is project-wide, including email authentication/confirmation/recovery links, not just the admin panel. Eight-digit codes remain enabled.
- Minimum password length: changed from 6 to **10**, matching the app's existing signup/reset validation. Existing passwords are not changed.
- Confirm email and secure email change remain enabled; anonymous sign-in and manual identity linking remain disabled.

These settings live in Supabase, independently of the website PR. For another environment, apply them there too; the browser deadline alone is not a server security boundary.

## Validation and remaining scope

Regression tests cover clean reset before/after dialog acknowledgement, duplicate timeout calls, five-minute boundaries, invalid challenge timestamps, reset invalidation, late verification after reset, inactivity boundaries, and MFA claim validation. Website build, admin ESLint, safety tests, and production dependency audits were run.

The 15-minute inactivity timer is enforced by this admin client; server authorization independently enforces live session and eight-hour MFA age. It is not a server-enforced 15-minute inactivity policy. Session tokens remain in sessionStorage, so preventing same-origin script injection remains essential; the existing CSP restricts scripts to self and the admin renders user strings as text. This review does not claim a full penetration test.

## Follow-up work completed

- The app now requests an actual Supabase recovery code (`resetPasswordForEmail`) and verifies it as `recovery`, rather than treating a normal sign-in code as password recovery. Only verified recovery opens the password form, and that form expires after five minutes. Fresh recovery sessions are compatible with Supabase's current-password enforcement without asking users for a password they have forgotten.
- The hosted recovery email template now displays the eight-digit code and five-minute lifetime. Secure password change is enabled and its saved state was verified. Current-password enforcement is a separate rollout switch: do not enable it before the updated beta is available unless the owner explicitly accepts interrupting password reset in build 426. The old build uses email sign-in sessions and is incompatible with that switch.
- The expiring deepmerge exception and patch-package patch have been removed. A private, maintained local fork contains the reviewed fix, with exact implementation hashes and resolution checked at install and audit. Registry advisories now fail the production audit without exceptions; local fork behavior and integrity have dedicated regression tests. This is INSTEAD-patched code, not an upstream security release.
- The owner chose to remain on the Free plan. Supabase's built-in leaked-password protection remains unavailable on that plan; no paid upgrade was performed, and no client-only check is represented as server protection.

The expanded audit also updates the development-tool Zod dependency to patched 4.6.6; no high/critical development-tree findings remain. Moderate legacy lint/test minimatch findings remain documented in the dependency review.

Full app verification passes 102 tests and the safety suite passes 31 tests. Native and web production audits report no findings, and the native gate has zero advisory exceptions. Both mobile platforms must validate this expanded PR; merging it may upload beta builds as authorized by the owner.
