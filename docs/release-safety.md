# Release safety and operations

Merging to main after successful CI uploads beta builds to TestFlight and Google Play internal testing. The Android workflow fixes the track to internal; the iOS workflow uploads without submitting a public App Store release. `npm run release:check` remains the separate public-launch checklist and is intentionally not a prerequisite for beta testing. The fields are owner attestations, not legal approval supplied by software; do not mark incomplete reviews complete merely to bypass them.

## Actual remaining owner decisions

- Confirm the operating legal person/entity and state/country. Have counsel review the Terms, liability limits, governing-law/dispute choices, children/age policy, copyright complaints, acceptance evidence, and privacy obligations. No governing jurisdiction, arbitration waiver, or indemnity has been invented.
- Assign the person who will review submissions and safety/abuse reports. Review reports at least daily, prioritize imminent harm, and keep publication closed when no reviewer is available. A report does not automatically establish wrongdoing or delete another person's content.
- Verify the public Terms, Privacy, Safety, and Support URLs contain the current shared policy text, are reachable without signing in, and match store listings. Verify that info@insteadtry.com actually receives support requests. A registered domain or working outbound SES sender does not prove an inbound support inbox works.
- Review Google Play's Health apps declaration and Data safety form, Apple's privacy/age disclosures, and the store descriptions. Use the copy below only where it accurately matches the released app. No store settings were represented as updated by this branch.

## Suggested store wording

INSTEAD is an educational directory of household and personal-care information. It is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Content is not a substitute for advice, diagnosis, or treatment from a qualified healthcare professional. Consult a healthcare professional before making health decisions. Natural ingredients may cause harm. Community votes and moderation do not prove safety or effectiveness. The app is not for emergencies.

Recipe submissions and photos are held for moderation before publication. Users can report recipes and block contributors. Email-and-password accounts are optional for browsing and local saves; signing in syncs saved guides and enables recipe submissions and voting. Public usernames identify approved contributions, while email and saved guides remain private. In-app account deletion is available in My INSTEAD.

## Backend deployment

Follow the complete dependency order in [the Supabase SQL guide](../supabase/README.md): it includes the admin panel, built-in recipe editor, review cleanup, private account hub, per-recipe saves, and admin user directory migrations. Apply `recipe-voting.sql` again after adding built-in recipes so every displayed recipe is registered for vote writes. Do not re-run the one-time scripts on an existing project. New safeguards hold old comments and previously approved recipes without review records; no content is deleted by the migration. The app and admin panel do not display or accept comments.

Deploy `supabase/functions/delete-account/index.ts` as `delete-account`. Keep platform JWT verification enabled when compatible with the project's signing keys; the handler independently verifies the bearer token against Supabase Auth on every call. It accepts no target account ID and requires a recorded self-deletion request. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY remain Edge Function secrets supplied by Supabase, never app variables. If asymmetric JWTs require an alternative platform configuration, retain authoritative Auth validation; do not turn this into an anonymous deletion handler.

The deletion handler removes both legacy and opaque-folder recipe photos through Storage, then hard-deletes the authenticated Auth user. Cascades remove comments, recipes, votes, reports, agreements, blocks, folder mappings, and account controls. Content-audit cleanup triggers remove the deleted content's audit rows. If cleanup fails, the request remains pending and public content stays hidden; the user can retry or contact support. Operators must inspect `community_deletion_queue()` and resolve failures. Do not claim all deletions have completed merely because requests were recorded.

## Verification

- `npm run verify` and `npm run safety:test`
- `npm run web:test`
- Apply safeguards twice in a disposable PostgreSQL database and run `supabase/tests/safeguards.test.sql`; the fixtures must never run on production.
- Signed-in end-to-end tests require explicit tester agreement. Never accept legal terms or delete a real account on the owner's behalf for testing.
- The first-use receipt is local. Contributions additionally require account-linked, server-timestamped acceptance of policy version 2026-10-16.2. Keep the SQL version and src/policies.ts synchronized.

## Official requirements consulted

- https://support.google.com/googleplay/android-developer/answer/16679511
- https://developer.apple.com/app-store/review/guidelines/#user-generated-content
- https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance
- https://supabase.com/docs/guides/auth/managing-user-data

Public branding uses “INSTEAD, USA” at the owner’s request. This does not establish a legal entity or resolve the operator identification requirement. The legal-name and jurisdiction attestations remain unset pending appropriate review.

## Hosted iOS runner recovery

CI and TestFlight share a literal allowlist of four standard GitHub-hosted Mac
labels. The default is `macos-26`; Xcode stays pinned to 26.3. The host's CPU
does not change the app's supported iOS devices or remove simulator/device builds.

The repository Actions variable `IOS_RUNNER` can select `macos-15`,
`macos-15-intel`, or `macos-26-intel`. Empty, unknown, self-hosted, and larger-runner
values all fall back to the literal `macos-26` label. The raw variable is
never returned as a runner target. This does not register a runner, grant new
credentials, enable paid larger runners, or move signing credentials onto a local
machine.

If a hosted pool stops assigning runners, select an allowed label with Xcode 26.3
available and retry the failed iOS job and its dependents. Preserve passed quality
and Android results. Delete the variable to restore the default. A pool switch is
a recovery attempt, not a guarantee of capacity.

Edits to either build workflow now select both native validation jobs before
merge. The required aggregate check still rejects failed/cancelled applicable
iOS jobs. Release detection still compares against each platform's last
successful upload, preserving app changes missed during an outage.

An empty runner name, zero executed steps, and “job was not acquired” indicates
runner provisioning failed before compilation. A local build or new PR does not
replace the required hosted checks.

Official labels: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
Xcode inventory: https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md

## CI/CD performance audit — 2026-11-04

Both repository workflows were reviewed: `ci.yml` (quality, native validation,
website deployment) and `mobile-release.yml` (signed internal beta uploads).

- Default iOS execution returns to the standard ARM `macos-26` pool with Xcode
  26.3. Intel remains an explicit recovery override, not the permanent default.
  Runner scheduling remains outside the repository's control.
- Simulator validation compiles only the host architecture. Previously the generic
  destination could build both simulator architectures. Android debug validation
  similarly compiles arm64 only instead of four ABIs. Store bundles retain all
  their existing device architectures; neither optimization limits user devices.
- CocoaPods download caches are architecture scoped. Xcode DerivedData caches are
  separated by architecture, Xcode, dependency/project hashes, and Debug/Release.
  Release compilation never restores simulator compilation state. GitHub's cache
  branch isolation prevents pull-request caches being restored on main releases.
  No certificates, provisioning profiles, archives, IPA files, or API keys are
  included in these caches. Xcode still performs dependency checking on every build.
- Android validation now enables Gradle's existing build cache. npm and Gradle
  dependency caches remain enabled. No tests or applicable native checks are removed.
- Website deployment follows successful quality/security/database/web checks
  independently of unrelated mobile compilation. The branch-required aggregate
  still requires every selected native build to succeed and rejects unexpected skips.
- Manual releases now also verify successful CI for the exact main commit before
  any production job or build-number reservation starts.
- Release jobs still wait for successful main CI, use the exact tested revision,
  production environments, and independent durable build reservations. Both upload
  to internal beta tracks only. Simulator/debug output is never uploaded to stores.
- Temporary Android signing/service-account files and all temporary iOS signing
  source files are removed in always-run cleanup steps. Production material stays
  on GitHub-hosted release jobs, never a local runner.
- Quality and website deployment now have explicit 15/10 minute limits. Xcode
  prints a build timing summary so future slowdowns can be diagnosed with evidence.

The pipeline deliberately retains PR validation, main validation, and separately
signed release compilation: these test different revisions/configurations and
cannot safely be treated as interchangeable artifacts. A first uncached build
still takes longer than a warm build. No fixed end-to-end duration is promised
until hosted measurements are available; provider outages cannot be fixed by YAML.
