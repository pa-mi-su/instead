# Release safety and operations

PRs from any branch targeting `main` validate affected platforms. Merging a PR runs
CI on the merged revision, then calls the reusable mobile release workflow for
only the selected platforms. No `workflow_run` history lookup or second automatic
workflow trigger is needed. Signing uses the protected `production` environment.
iOS archives upload to App Store Connect and become available in TestFlight and
for App Store submission; uploading does not bypass Apple's review.

Android uploads use `ANDROID_PLAY_TRACK` from the production environment:
`internal`, `alpha` (closed), `beta` (open), or `production`. The existing setting
remains `internal` until deliberately changed. If unset, the workflow defaults to
`production`. Set `ANDROID_PLAY_RELEASE_STATUS` to `completed`, `draft`, or
`inProgress`; staged rollouts also require `ANDROID_PLAY_USER_FRACTION` strictly
between 0 and 1. The uploader validates the Play edit before committing it and
fails visibly if Play rejects the release. Store permissions, app review, and
required testing still apply. The recovery dispatch supports selecting one
platform and an explicit Android track, and requires green CI for the exact main
commit. Normal merge deployments do not require dispatch or manual build steps.

The public-launch checklist remains `npm run release:check`. Do not mark incomplete
owner attestations complete to bypass the checklist.

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

## CI/CD routing and hosted builds

| Changed files                              | Native builds/uploads | Web validation   | S3/CloudFront deployment                           |
| ------------------------------------------ | --------------------- | ---------------- | -------------------------------------------------- |
| `ios/`, `*.ios.tsx`, Gemfile               | iOS                   | No               | No                                                 |
| `android/`, `*.android.tsx`, Play uploader | Android               | No               | No                                                 |
| `web/`                                     | Neither               | Yes              | No: separate Next.js app has no hosting configured |
| `website/`, static-site builder            | Neither               | No               | Yes                                                |
| Shared `src/`, assets, root dependencies   | Both as applicable    | Shared consumers | Catalog/policy/dependency changes                  |
| Markdown/text documentation only           | Neither               | No               | No                                                 |

`src/policies.ts` is consumed by mobile, web, and the public policy builder, so it
must rebuild all consumers. Workflow and routing changes validate their affected
platforms. Rename detection is disabled so moving a file between platforms selects
both its old and new consumers. PR comparisons use the merge base; push comparisons
use the actual before/after commits, including multi-commit pushes.

The stable required status remains `Quality and Android` for compatibility with
existing branch protection. It validates change detection, quality, and every
selected native build, rejects unexpected skips, and succeeds for documentation
changes without running builds. Quality retains authorization/deletion tests,
security auditing, PostgreSQL policy tests, linting, type checks and unit tests.
Web and static-site builds run only when their inputs change. The existing static
website deploys after successful quality checks; unrelated mobile builds do not
hold it up. No new hosting service is created.

The standard hosted iOS default is Apple Silicon `macos-26`. Recent ARM jobs
reported capacity warnings and were cancelled before executing steps; runner
provisioning failures must be reported as infrastructure failures. `IOS_RUNNER` may override with one of the literal
allowlisted standard hosted labels; unknown values fall back to Apple Silicon. Xcode is
pinned to 26.3. Hosted capacity and store availability cannot be guaranteed by YAML.

CI validates one simulator/Android ABI; signed store builds retain existing device
architectures. CocoaPods downloads and architecture/configuration-scoped native
compilation are cached. Signing files are excluded and removed after release jobs.
Build numbers are reserved durably per platform and never reused after failures.

Main and release concurrency queues use `queue: max` and do not cancel in-progress
runs. This avoids the default single-pending queue discarding intermediate merges
with changes to a different platform. Up to 100 runs can queue; overflow is visible
as cancellation. Each release checks out its tested SHA. Failed releases can be
retried from their failed jobs, preserving successful platform uploads.

Official references:

- [GitHub runner labels](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [Intel macOS 26 image inventory](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md)
- [GitHub concurrency queues](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
