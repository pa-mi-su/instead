# Community accounts, passwords, and profiles

Current product behavior: email-and-password accounts have a public username, optional short bio, and optional public avatar. Supabase Auth stores and verifies passwords; the app never stores plaintext passwords. Confirmed users can sync saved guides, submit recipes, and vote. Approved recipes show their author's public profile; email, pending submissions, and saved guides remain private. Comments are not accepted or displayed. Older comment rows and protected cleanup paths remain for account deletion and retention. Apply `supabase/private-account-hub.sql`, then `supabase/profile-avatars.sql`, after the existing community, recipe, safeguards, topic, and voting migrations. Apply `supabase/recipe-saves-and-admin-users.sql` after its listed prerequisites to enable per-recipe saves and the separate admin user directory. Both scripts are repeatable and preserve historical content. See [the Supabase SQL guide](../supabase/README.md) for the full dependency order.

## Current project status (October 16, 2026)

The existing project was resumed and the community migration has been applied. Email signups are enabled; confirmation is required and anonymous sign-ins are disabled. The app uses passwords for normal sign-in. Email codes confirm new addresses or establish a password for accounts created by the older passwordless flow.

SES is verified for insteadtry.com in us-east-1 (DKIM SUCCESS). Custom SMTP and code email templates are active, and the owner confirmed receipt of a test email. Do not rerun the one-time migration or generate duplicate keys.

## Activate the backend

1. Run `supabase/community.sql` once in the existing Supabase project's SQL editor (project-owner privileges required). This adds separate tables and RPCs; it does not modify guides. This is a one-time transactional migration, not a repeatable seed script.
2. Enable Email sign-in and user signups in Authentication → Providers. Disable anonymous sign-in unless needed for another feature; community writes reject anonymous accounts anyway.
3. In Authentication → Settings, require at least 10 characters for passwords and enable breached-password protection if available on the project plan. In Authentication → Email Templates → Confirm signup, use a token-code template:

   ```html
   <h2>Confirm your INSTEAD account</h2>
   <p>Enter this code in INSTEAD: {{ .Token }}</p>
   <p>If you did not request this, ignore this email.</p>
   ```

   Keep email confirmation enabled and set reasonable code expiry and send limits. Configure the Magic Link template to display `{{ .Token }}` for recovery codes instead of requiring a browser redirect. Normal sign-in uses the account password.

4. Configure custom SMTP for real users. Supabase's default sender is restricted and is unsuitable for a public launch. Keep sender credentials in Supabase, never in the app.
5. Keep the existing public URL/key in native `.env` and web `.env.local`. The browser uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Do not put service-role keys in either client.
6. Run `npm run verify`, `npm run web:test`, then test on a native device and two independent browsers with real email addresses. No test emails are sent by automated checks.

Official references: [Email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Current behavior and limits

Browsing and device-local saves work without an account. Email-and-password accounts sync saved-guide identifiers across devices and allow recipe submissions, recipe voting, and private submission management in My INSTEAD. Usernames and optional bios are public through profile and approved-recipe RPCs; emails and account IDs are not shown publicly. Recipe submissions and photos require administrator review before publication. Votes express preference and do not prove safety or effectiveness. Email verification does not ensure one human per account; enable Supabase CAPTCHA protection before a large public launch.

The account hub's saved-guide and recipe-list RPCs verify the authenticated account and expose no direct table access. RLS is enabled with no client table policies or grants. Only scoped RPCs have client execute permission. Private security-definer helpers have no client execute permission and an empty search path. Do not grant direct client writes to these tables. Signed-in account controls record deletion requests and invoke the `delete-account` Edge Function. It removes photos before deleting Auth and cascading community records; failures remain pending for retry or operator assistance. No admin key is shipped.

## Release checklist

- Confirm a guest can browse and save locally without an account.
- Confirm a signed-in account syncs saves across devices, and a second account cannot see the first account's cloud saves.
- Confirm a signed-in user can see and withdraw only their own recipe submissions.
- Confirm recipe voting is tied to the signed-in account and is independent across users.
- Verify incorrect/expired code errors, resend cooldown, policy acceptance, sign-out, app restart, offline retry, and rate limits.
- Private-account integration assertions are in `supabase/tests/private-account-hub.test.sql`; run only in a disposable local database after the migration. They roll back their fixtures.

## Current safeguards

After the original community, recipes, and directory-topics migrations, apply the repeatable `supabase/community-safeguards.sql`. It adds account-linked policy acceptance, pre-publication moderation, contributor blocking, suspension and deletion controls, and opaque photo folders. Deploy the `delete-account` Edge Function. These safeguards and the function were applied October 16, 2026. See `docs/moderation-runbook.md` for current review procedures and `docs/release-safety.md` for release requirements. The original SQL tests target the original schema; run `supabase/tests/safeguards.test.sql` after the safeguards in a disposable database.

After `supabase/community-safeguards.sql` and `supabase/admin-panel.sql`, apply `supabase/simplify-admin-review.sql` to existing projects. It removes the obsolete qualification and evidence-source audit fields, clears those legacy keys from review records, and moves previously rejected entries into Trash. Rejection in the admin panel now sends content directly to Trash.


## Profile photo deployment check

Apply `supabase/profile-avatars.sql` to the hosted database before shipping profile photos on either Android or iOS. This repeatable migration creates the avatar column, public avatar bucket, protected upload policies, and avatar save/read RPCs. A code release alone does not apply it. Newly verified accounts can upload JPEG, PNG, and WebP avatars up to 2 MB; suspended and deletion-pending accounts cannot upload.

Run `node --env-file=.env scripts/check-profile-avatars.mjs` after deployment. The check uses only the publishable/anon key, verifies that the bucket exists, and confirms that anonymous avatar updates are denied. It does not upload a photo or sign into an account. Both mobile release jobs now run this check before building, so missing backend setup blocks releases.
