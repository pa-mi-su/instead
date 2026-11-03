# Recipe publication and concerns

Pending recipes is the admin review queue. Approving a submission removes it from that queue and makes it available under Recipes together with catalogue and admin-created recipes. Recipes supports source, publication state, search, and user-submission pagination. Rejected content remains in Trash. Source tables and recipe IDs are preserved so saves, votes, attribution, and account deletion continue to work.

The mobile guide shares one recipe controller between its published Recipes section and private submission controls. Approved submissions appear only in the published section; pending or rejected submissions stay private below. Saved recipe links target the published card. Approval becomes visible when the app refreshes recipes; this change does not add realtime subscriptions.

Every published recipe has Report or raise a concern. A verified, active account is required to submit a reason and concern. The server derives identity and verified email from the session, reads the actual recipe record, stores a private concern, and emails info@insteadtry.com. The recipient cannot be selected by the client. Catalogue records without an admin override are enriched from the fixed, public INSTEAD catalogue URL before sending. Reports are visible to MFA-authenticated admins under Recipes, including the Open reports filter.

## Deployment

Apply `supabase/recipe-concerns.sql` after the existing safeguards, recipe voting, admin catalogue, membership, and deletion migrations. Deploy `supabase/functions/report-recipe/index.ts` with platform JWT verification enabled. Set these server-only secrets: REPORT_SMTP_HOST, REPORT_SMTP_PORT, REPORT_SMTP_USER, REPORT_SMTP_PASS, REPORT_SMTP_SENDER. Never place SMTP or service credentials in mobile config, source files, or PRs.

Production uses a dedicated SES IAM user, `instead-recipe-reports-smtp`, permitted only ses:SendRawEmail for the insteadtry.com identity in us-east-1, from no-reply@insteadtry.com to info@insteadtry.com. Its derived SMTP credential is stored only in Supabase secrets. Existing authentication SMTP settings are unchanged.

The function acknowledges success only after SMTP accepts the message and the delivery timestamp is stored. Duplicate retries reuse the concern for ten minutes and completed reports are not resent. A five-minute claim prevents simultaneous sends. A failure preserves the concern and offers retry; delivery is at least once because a failure after SMTP acceptance but before receipt storage can cause a duplicate on retry. There is no unattended email retry worker.

Deleting the reporter cascades private concern records. Deleting a recipe author redacts retained recipe snapshots in other users' concerns. Previously delivered emails and provider backups have separate retention; database deletion cannot retract an email.

## Validation and release check

Run Jest, typecheck, ESLint, safety tests, the disposable PostgreSQL suite, and the website build. SQL tests cover private report access, authenticated identity, deduplication, email claims, custom catalogue IDs, and reporter deletion. Function tests cover forged client identity/recipient, anonymous rejection, SMTP failure, completed/concurrent retries, and full catalogue snapshots.

After merge and deployment, test on the next beta: submit a recipe, approve it in Pending recipes, refresh the guide, confirm it appears once under Recipes, open it from Saved, and send a concern. Check the inbox and admin Open reports; mark the concern reviewed and confirm it leaves that filter. Test both catalogue and user recipes. Keep normal browsing available when signed out; report submission should ask the user to sign in.

Production backend verification on November 3, 2026: migration applied; JWT-protected Edge Function deployed; dedicated SMTP authentication passed; a disposable verified account submitted a real catalogue report, received HTTP 200, and produced one stored delivery timestamp after SMTP acceptance. The QA account and its private records were deleted afterward. Inbox receipt still needs the owner’s confirmation. Frontend behavior requires the merged website deployment and next mobile beta.
