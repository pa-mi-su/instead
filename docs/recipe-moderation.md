# Community recipe submissions and photos

Recipes are attached to product IDs and approved recipes link to the contributor's public username and optional bio. Email-and-password accounts are required to submit, vote, report, and withdraw; email addresses remain private. INSTEAD has no comment feed. Historical comment records and their backend tables remain hidden for account-deletion cleanup and are not part of current user workflows.

## Database and storage

`supabase/recipes.sql` is a one-time additive migration after `community.sql`. Recipe text, votes, and reports are accessible through scoped RPCs. The private `recipe-photos` bucket accepts JPEG, PNG, and WebP, at most 5 MiB per photo and three photos per submission. Only the owner can upload in their own folder. Existing objects cannot be overwritten. Pending photos are private to the owner and administrators; approved-recipe photos are readable using five-minute signed URLs. Hiding a recipe stops new public links; existing links can persist for their short lifetime.

Each account may submit three recipes per rolling hour and change recipe votes 60 times/hour. One row per account/recipe stores -1 or +1; 0 removes the vote. Repeated desired vote values are idempotent. The private storage upload guard caps each account at 100 files and three unlinked uploads; failed submissions attempt to remove uploaded photos. If a network failure leaves three unattached files, an administrator must remove those orphaned objects through the Storage API/dashboard before further uploads. Do not delete storage metadata directly in SQL.

## Review queue (Supabase owner dashboard)

The admin review queue is in Supabase, not a public profile or client admin page. Inspect both the recipe and each photo before publication, including quantities, instructions, ingredient compatibility, storage and preservation, attribution, and product-specific risks. Publication is not a safety certification; votes reflect user preference only.

```sql
select id, product_id, title, ingredients, instructions, storage_notes,
       cautions, source, photo_paths, created_at
from public.community_recipes where status = 'pending'
order by created_at;
-- Use the Storage dashboard to inspect the listed private recipe-photos files.
-- Approve or reject through community_moderate with documented reviewer metadata.
-- See docs/moderation-runbook.md; direct approval without a review record is rejected.
```

For reports, join `recipe_reports` to `community_recipes` in the owner dashboard. To hide an approved recipe, change its status to rejected; public reads and new photo links then stop. Authors can withdraw their recipes and the client attempts to remove photo files. Withdrawn text remains for moderation until an administrator purges it. On an account-deletion request, delete its photo files through the Storage API first, then delete the Auth account (recipe rows/votes/reports cascade). A missed photo cleanup may leave private orphan files; the public policy does not expose those files. Schedule/manual orphan cleanup is an operations responsibility for now.

## Client behavior and validation

Both native and web provide title, ingredients with quantities, instructions, storage/shelf life, cautions, optional credit, and optional photos with previews/removal. Text limits and photo counts are checked in clients and SQL/bucket policy. Browser photos are re-encoded and resized before upload; native photos use the system library picker with bounded dimensions and no extra EXIF metadata requested. Users should still avoid faces, addresses and private information in image pixels. Native picker requires rebuilding the app; iOS Pods are installed and the photo-library usage description is configured.

`supabase/recipes.test.sql` runs only in a disposable local database. It tests moderation visibility, private-photo RLS, foreign ownership, product separation, vote changes and idempotency, withdrawal and submission rate limits. Client tests cover field/photo limits, submission state, and cleanup after failure. Real-device photo selection and a real signed-in user upload still require an end-to-end device/browser check.

## Current safeguards

`community-safeguards.sql` supersedes the original approval procedure. Current apps accept and display recipes but no comments; legacy comment tables and moderation data remain only for cleanup and account deletion. An authenticated admin and a specific review reason are recorded for each decision; separate qualifications and evidence-source fields are not required. New photo folders are opaque and privately mapped to their owner. Legacy account-ID photo paths must be migrated before publication. Contributors can block authors and cannot vote on their own content. Account deletion removes legacy and opaque photo folders before Auth deletion through the deployed `delete-account` function; failed requests remain pending for retry or operator action.
