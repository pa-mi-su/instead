# Recipe publication and concerns

Pending recipes is the admin review queue. Approving a submission removes it from that queue and makes it available under Recipes together with catalogue and admin-created recipes. Recipes supports source, publication state, search, and user-submission pagination. Rejected content remains in Trash. Source tables and recipe IDs are preserved so saves, votes, attribution, and account deletion continue to work.

The mobile guide shares one recipe controller between its published Recipes section and private submission controls. Approved submissions appear only in the published section; pending or rejected submissions stay private below. Saved recipe links target the published card. Approval becomes visible when the app refreshes recipes; this change does not add realtime subscriptions.

Every published recipe has Report or raise a concern. A verified, active account is required to submit a reason and concern. The server derives identity and verified email from the session, reads the actual recipe record, stores a private concern, and emails info@insteadtry.com. The recipient cannot be selected by the client. Catalogue records without an admin override are enriched from the fixed, public INSTEAD catalogue URL before sending. Reports are visible to MFA-authenticated admins under Recipes, including the Open reports filter.

## Deployment

Apply `supabase/recipe-concerns.sql` after the existing safeguards, recipe voting, admin catalogue, membership, and deletion migrations. Deploy `supabase/functions/report-recipe/index.ts` with platform JWT verification enabled. Set these server-only secrets: REPORT_SMTP_HOST, REPORT_SMTP_PORT, REPORT_SMTP_USER, REPORT_SMTP_PASS, REPORT_SMTP_SENDER. Never place SMTP or service credentials in mobile config, source files, or PRs.

Production uses a dedicated SES IAM user, `instead-recipe-reports-smtp`, permitted only ses:SendRawEmail for the insteadtry.com identity in us-east-1, from no-reply@insteadtry.com to info@insteadtry.com. Its derived SMTP credential is stored only in Supabase secrets. Existing authentication SMTP settings are unchanged.

The function acknowledges success only after SMTP accepts the message and the delivery timestamp is stored. Each account can create only one concern per recipe, including after review. Duplicate requests reuse the original receipt and cannot replace its reason/text; already-delivered receipts are preferred when legacy duplicates exist. Completed reports are not resent. A five-minute claim prevents simultaneous sends. A failure preserves the concern and offers retry; delivery is at least once because a failure after SMTP acceptance but before receipt storage can cause a duplicate on retry. There is no unattended email retry worker.

Deleting the reporter cascades private concern records. Deleting a recipe author redacts retained recipe snapshots in other users' concerns. Previously delivered emails and provider backups have separate retention; database deletion cannot retract an email.

## Validation and release check

Run Jest, typecheck, ESLint, safety tests, the disposable PostgreSQL suite, and the website build. SQL tests cover private report access, authenticated identity, deduplication, email claims, custom catalogue IDs, and reporter deletion. Function tests cover forged client identity/recipient, anonymous rejection, SMTP failure, completed/concurrent retries, and full catalogue snapshots.

After merge and deployment, test on the next beta: submit a recipe, approve it in Pending recipes, refresh the guide, confirm it appears once under Recipes, open it from Saved, and send a concern. Check the inbox and admin Open reports; mark the concern reviewed and confirm it leaves that filter. Test both catalogue and user recipes. Keep normal browsing available when signed out; report submission should ask the user to sign in.

Production backend verification on November 3, 2026: migration applied; JWT-protected Edge Function deployed; dedicated SMTP authentication passed; a disposable verified account submitted a real catalogue report, received HTTP 200, and produced one stored delivery timestamp after SMTP acceptance. The QA account and its private records were deleted afterward. Inbox receipt still needs the owner’s confirmation. Frontend behavior requires the merged website deployment and next mobile beta.

## Personal concerns and blocked content

Recipe pages contain recipe actions and contribution prerequisites, not account
management. Reporting keeps the recipe visible, marks it “Concern submitted” for
that signed-in user, and explains that blocking the contributor hides their
recipes. Reporting does not unpublish a recipe for other people. Existing
server-side contributor-block filters remain in force.

My INSTEAD has independent cards for Blocked recipes, Recipes submitted for
concern, and Delete your account. The blocked list names the recipe associated
with the contributor block and explains that all that contributor's recipes are
hidden for this account. Unblocking restores access through the existing scoped
RPC. Concerns list private recipe titles, reasons, and submitted/reviewed status;
no other reporter's details or email addresses are returned.

Apply `recipe-concern-history.sql` after `recipe-concerns.sql`. The authenticated
`community_my_recipe_concerns()` function derives identity from Auth, has an empty
search path, and returns only the caller's latest 500 concern summaries. Direct
table reads and anonymous function execution remain denied. Reporter deletion
continues to cascade the stored concerns. The UI clears or hides old-account
history immediately on account changes, ignores stale responses, bounds requests
to 15 seconds, and offers a retry when history cannot load. A concern update uses
a dedicated notification so it does not reload account setup or reorder recipes.

The hamburger menu destinations are Home, My INSTEAD, Saved, and Info & Safety.
The existing iOS modal-dismissal serialization is preserved.

Backend rollout November 5, 2026: the private history function was applied and
its authenticated-only execute permissions verified. No report fixtures or
account mutations were run in production. The frontend requires the merged PR
and next beta; verify report, block/unblock, history, and deletion on that build.

## Duplicate prevention, spam limits, and concern resolution

Multiple reporters' concerns belong to the same recipe and are shown in an
expandable, bounded list with reason, text, and date. An account cannot create a
second concern for that recipe by changing text, waiting, or retrying after admin
review. Existing historical rows are preserved. The app disables the report action
once its concern is submitted; the server enforces the rule independently of UI.

Verified, active accounts are required. Per-account advisory transaction locking
serializes simultaneous submissions. Limits are 10 new concerns per rolling hour,
30 per rolling 24 hours, and 30 successful submission/retry requests per hour.
Limits apply across recipes; duplicate retries consume the separate request quota
without consuming another creation slot. Rate-limited requests return HTTP 429
without attempting email. Existing in-flight mail claims prevent concurrent sends,
and an already-delivered receipt produces no additional email. Delivery remains
at least once if SMTP accepts a message but storing its receipt fails; we do not
claim provider-level exactly-once delivery or immunity to coordinated new-account
abuse. Suspended, banned, and deletion-pending accounts cannot submit.

Resolving catalogue text IDs no longer casts those IDs to UUIDs, including in the
audit insert. Community UUID references are looked up from the actual recipe row;
catalogue/admin-created recipes retain text IDs in the audit note. MFA/admin
requirements, mandatory review notes, and the reviewed-snapshot cutoff remain.
The updated admin client also sends the exact displayed concern IDs, so a capped
list cannot resolve unseen reports. Older clients retain the timestamp-cutoff
behavior for compatibility. Tests cover all three ID formats, preserve newer
concerns when an older snapshot is marked reviewed, and leave unselected concerns
open.

November 5 rollout: repeatable report SQL and the report Edge Function were
redeployed; JWT verification stayed enabled. No production concern was marked
reviewed during verification. Admin presentation requires the PR website deploy;
mobile button changes require the next beta. All changes remain in PR #61.

## Account layout and personal history controls

My INSTEAD uses spaced sections with compact headings, distinct recipe entries,
and separate primary/secondary/destructive actions. Blocked recipes and concern
history start collapsed with counts. Concern history renders ten entries at a
time with Show more, groups historical duplicate reports only when their actual
recipe IDs match, and retains separate recipes that happen to share a title.
Account deletion stays at the bottom in its own warning section; its confirmation
and permanent-deletion behavior are unchanged.

Clear from history and Clear reviewed archive personal history entries after
confirmation. Cleared entries can be shown and restored. They do not cancel a
report, change moderation/email state, or remove the permanent duplicate guard.
`recipe-concern-history.sql` now adds nullable `hidden_at`, returns it alongside
existing summary fields, and adds the authenticated
`community_concern_history_visibility` function. Apply this repeatable migration
before releasing the updated app. The extra response field is compatible with
older clients, which do not expose these controls.

Writes derive the owner from Auth, check the expected signed-in account, limit
batch sizes, and enforce an independent 60-updates/hour quota. Only the caller's
history can change; clearing reviewed entries cannot hide a pending report that
shares the same recipe. Existing report data and all one-report/hourly/daily
protections remain. The mobile mutation state rejects stale account responses
and retains history when an update fails. Clearing is a reversible visibility
change, not erasure of the underlying submitted report; account deletion still
removes the user's records through the existing cascade.

Backend rollout November 5: the visibility column and clear/restore function were
applied, and authenticated-only write permissions were verified. No production
history entries were cleared during deployment. The layout and controls require
the merged app release and physical-device verification.

## Personal hiding replaces concern history

Apply `supabase/personal-recipe-visibility.sql` after the existing concern and history migrations. My INSTEAD no longer displays report history. It shows **Hidden recipes**, with a restore action, and a separate **Blocked contributors** section. Both use chevrons for expansion.

- Reporting either a catalogue or community recipe inserts a private hidden preference in the same database transaction as the concern. The confirmation closes before the app removes the card.
- Blocking a recipe uses the same account-owned preferences and does not submit a report. Community contributor blocking still hides all that contributor’s recipes for the blocker.
- Other accounts and guests continue seeing published recipes while a concern is pending or reviewed. Only explicit admin archive/remove changes global publication.
- Reviewing a concern clears its legacy history entry, without restoring the reporter’s recipe or deleting the report receipt. Restoring a hidden recipe does not allow another report or another email.
- Saved bookmarks remain stored but hidden recipes are filtered out of Saved, published lists, and public profile recipe lists. Restoring makes eligible bookmarks visible again. Catalogue publication data remains global; private preferences are never included in its cache.
- Old private-history endpoints remain compatible with installed builds. Immutable report receipts, email retry claims, account checks, duplicate locks, and reporting quotas are retained.

Validation: `npm run verify`, `npm run safety:test`, and the disposable database suite `python3 scripts/test-community-db.py`. Physical-device checks should cover each recipe type, a second account, review without archive, archive, restore, Saved, and closing the report sheet with the keyboard open.
