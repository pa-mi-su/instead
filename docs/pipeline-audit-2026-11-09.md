# Release pipeline audit — November 9, 2026

Scope: prepare an unmerged PR. No production configuration, IAM policy, store
metadata, live website or current App Review submission changed by this work.

| Area | Finding | PR correction / evidence |
| --- | --- | --- |
| Google rejection recovery | Build 445 compiled successfully, but API commit required changesNotSentForReview=true | Same-edit fallback for only that explicit HTTP 400; tested through actual uploader with mocked OAuth/Play endpoints; no duplicate upload |
| Google active review | Default commit behavior can cancel an existing review | ERROR_IF_IN_REVIEW on normal and fallback commits; review conflicts remain errors |
| Google configuration | Missing track silently selected production | Early preflight rejects missing/invalid track, rollout or review mode before build reservation |
| Google reporting | API success implied release availability; errors had no bounded request time | Stage/commit summary distinguishes Console action from approval; bounded OAuth/Play timeouts; version code must match reserved build |
| iOS profile/export | No explicit expiry/distribution check; wildcard IPA upload; raw XML interpolation | Profile expiry/team/app/name/distribution checks, exactly-one-IPA and metadata checks, escaped export plist, server validation before upload |
| iOS cleanup | Partial keychain/profile setup could fail before cleanup paths were recorded | Cleanup paths exported before imports/copy; always cleanup retained |
| iOS status | Upload receipt and later Apple processing are distinct | Job summary explicitly reports processing/review still pending |
| Website generation | Old generated files could survive a rebuild | Clean generated dist before build; commit marker and mandatory-output preflight |
| Website publishing | S3 sync skips metadata-only changes; invalidation request alone does not prove deployed content | Recursive copy with no-cache metadata, invalidation, bounded exact-content checks on public unversioned URLs |
| Website permissions | Existing deploy role permits CreateInvalidation but not GetInvalidation | Read-only IAM audit; no permissions changed; verify actual public content instead of adding a failing waiter |
| Routing | New platform/deploy helpers need appropriate validation consumers | iOS helper routes iOS; web helper routes website; regression tests cover routing, main-only credentials, required gates and shell syntax |
| Apple guides | Three guides remained in the iOS catalog | iOS overrides exclude only Sunburn care, Bug bite care, Cough comfort and their empty category tabs; remaining guide objects match Android; admin/community unchanged |

Existing controls retained: per-platform append-only build reservations, exact
merged SHA checkout, required quality/applicable native builds before automatic
release, main-only manual releases with exact-commit CI verification, protected
production environment, preserved signed artifacts, queued releases, always-run
credential cleanup, and backend authorization independent of the public admin
shell.

Local validation: npm run verify passed (184 app tests), safety:test passed (42 tests),
pipeline regression tests passed, iOS metadata fixtures passed, production iOS
JavaScript bundle built, and website build/preflight passed. The existing signed
iOS 444 IPA also passes the new exact-version/export checks; its decoded
embedded distribution-profile metadata passes the new profile checks. No Apple
certificate-chain validation was asserted by the offline metadata test.
Workflow YAML parsed and every shell block passed bash -n. Hosted native CI
results are recorded on the PR. All store/API tests use fake credentials
and mocked remote responses; no real uploads are used to test failure paths.
Native CI builds validate compilation, not real-device operation or store
approval. Signed TestFlight upload and live S3/Play deployment deliberately do
not run on this PR. Third-party availability, expiring credentials, reviewer
judgment and all possible failures cannot be guaranteed by pipeline code.

Operational recovery: a committed Play edit saved for review needs a Console
submission, not a new build. An ambiguous network/upload failure must be checked
in the store before another upload. Use retained artifacts when a store/UI
recovery is needed. Do not blindly rerun a whole workflow to repair one platform.

References checked:

- https://developers.google.com/android-publisher/api-ref/rest/v3/edits/commit
- https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds
- https://developer.apple.com/help/app-store-connect/manage-builds/view-builds-and-metadata
