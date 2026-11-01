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

Follow-ups: leaked-password protection is unavailable on the current Free plan. Secure password-change/current-password enforcement is off in the hosted project; enabling it needs coordinated testing of the app's recovery and change-password flows. The native dependency audit retains its existing exact-hash patched deepmerge exception, expiring November 3; this PR does not extend it. Web production audit reports zero vulnerabilities.
