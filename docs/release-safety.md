# Release safety and operations

Merging to main after successful CI uploads beta builds to TestFlight and Google Play internal testing. The Android workflow fixes the track to internal; the iOS workflow uploads without submitting a public App Store release. `npm run release:check` remains the separate public-launch checklist and is intentionally not a prerequisite for beta testing. The fields are owner attestations, not legal approval supplied by software; do not mark incomplete reviews complete merely to bypass them.

## Actual remaining owner decisions

- Confirm the operating legal person/entity and state/country. Have counsel review the Terms, liability limits, governing-law/dispute choices, children/age policy, copyright complaints, acceptance evidence, and privacy obligations. No governing jurisdiction, arbitration waiver, or indemnity has been invented.
- Assign the person who will review submissions and safety/abuse reports. Review reports at least daily, prioritize imminent harm, and keep publication closed when no reviewer is available. A report does not automatically establish wrongdoing or delete another person's content.
- Verify the public Terms, Privacy, Safety, and Support URLs contain the current shared policy text, are reachable without signing in, and match store listings. Verify that info@insteadtry.com actually receives support requests. A registered domain or working outbound SES sender does not prove an inbound support inbox works.
- Review Google Play's Health apps declaration and Data safety form, Apple's privacy/age disclosures, and the store descriptions. Use the copy below only where it accurately matches the released app. No store settings were represented as updated by this branch.

## Suggested store wording

INSTEAD is an educational directory of household and personal-care information. It is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Content is not a substitute for advice, diagnosis, or treatment from a qualified healthcare professional. Consult a healthcare professional before making health decisions. Natural ingredients may cause harm. Community votes and moderation do not prove safety or effectiveness. The app is not for emergencies.

User comments, recipe submissions, and photos are held for moderation before publication. Users can report content and block contributors without creating a public profile. Accounts use email-code sign-in; browsing needs no account. In-app account deletion is available from the signed-in account controls on each topic.

## Backend deployment

Apply in order: community.sql (once), recipes.sql (once), directory-topics.sql (repeatable), community-safeguards.sql (repeatable), recipe-comments.sql (repeatable), and recipe-voting.sql (repeatable). Apply `recipe-voting.sql` again after adding built-in recipes so every displayed recipe is registered for vote writes. Do not re-run the one-time scripts on an existing project. New safeguards hold old comments and previously approved recipes without review records; no content is deleted by the migration.

Deploy `supabase/functions/delete-account/index.ts` as `delete-account`. Keep platform JWT verification enabled when compatible with the project's signing keys; the handler independently verifies the bearer token against Supabase Auth on every call. It accepts no target account ID and requires a recorded self-deletion request. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY remain Edge Function secrets supplied by Supabase, never app variables. If asymmetric JWTs require an alternative platform configuration, retain authoritative Auth validation; do not turn this into an anonymous deletion handler.

The deletion handler removes both legacy and opaque-folder recipe photos through Storage, then hard-deletes the authenticated Auth user. Cascades remove comments, recipes, votes, reports, agreements, blocks, folder mappings, and account controls. Content-audit cleanup triggers remove the deleted content's audit rows. If cleanup fails, the request remains pending and public content stays hidden; the user can retry or contact support. Operators must inspect `community_deletion_queue()` and resolve failures. Do not claim all deletions have completed merely because requests were recorded.

## Verification

- `npm run verify` and `npm run safety:test`
- `npm run web:test`
- Apply safeguards twice in a disposable PostgreSQL database and run `supabase/safeguards.test.sql`; the fixtures must never run on production.
- Signed-in end-to-end tests require explicit tester agreement. Never accept legal terms or delete a real account on the owner's behalf for testing.
- The first-use receipt is local. Contributions additionally require account-linked, server-timestamped acceptance of policy version 2026-10-16.2. Keep the SQL version and src/policies.ts synchronized.

## Official requirements consulted

- https://support.google.com/googleplay/android-developer/answer/16679511
- https://developer.apple.com/app-store/review/guidelines/#user-generated-content
- https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance
- https://supabase.com/docs/guides/auth/managing-user-data

Public branding uses “INSTEAD, USA” at the owner’s request. This does not establish a legal entity or resolve the operator identification requirement. The legal-name and jurisdiction attestations remain unset pending appropriate review.
