# Community recipe submissions and photos

Current native clients accept recipe submissions, not comments. Verified active accounts with current community-policy acceptance can submit and vote. Approved recipes link to the contributor's public username, optional bio, and optional avatar; email and pending submissions remain private. Historical comment storage/RPCs are retained for compatibility/deletion.

## Schema and Storage

Use [the ordered SQL guide](../supabase/README.md), not a direct table-edit approval workflow. `recipes.sql` is a one-time migration; safeguards/admin/voting/publication migrations provide the current authorization and review behavior.

The private `recipe-photos` bucket accepts JPEG, PNG, and WebP images, at most **5 MiB each** and **three per submission**. Native photos use the system library picker, compatible image representation, bounded dimensions, and no extra EXIF metadata requested. Upload MIME type is checked from bytes. Do not assume private information in image pixels is stripped.

New photo paths use an account-owned opaque folder rather than exposing Auth IDs. Existing objects cannot be overwritten. Pending photos are private to the owner/admins; approved-recipe photos can receive five-minute signed URLs when permitted. Removing/restricting content stops new authorized reads; previously issued URLs and downloaded copies can outlive that change. Legacy account-ID paths cannot be approved without proper Storage migration/resubmission.

Each account can submit **three recipes/hour** and change recipe votes **60 times/hour**. Votes are one -1/+1 row per account/recipe; 0 removes a vote, and repeated desired values are idempotent. Community authors cannot vote on their own recipes. Votes reflect preference, not safety.

The upload guard caps an account at 100 files and three unlinked uploads. Failed submissions attempt to remove uploaded objects. If orphaned files block further uploads, an operator must inspect/remove them through Storage APIs/dashboard; do not delete only Storage metadata in SQL. There is no scheduled orphan-cleanup worker in this repository.

## Review and publication

Use the private [admin console](admin-panel.md): **Pending recipes** for full-content/photo review, then **Recipes** for published catalogue and community content. Approval records the authenticated reviewer and a specific reason; the full-review checkbox is required. Reviewer qualifications/evidence-source fields are not part of the current form. Rejecting content moves it to Trash. Restoring returns it to review and does not automatically approve it.

Read ingredients/quantities, preparation, storage/preservation, cautions, attribution, and every photo. Publication does not certify safety or effectiveness. See [the moderation runbook](moderation-runbook.md) for review criteria and escalation.

For owner-only investigation, SQL can list pending rows:

```sql
select id, product_id, title, ingredients, instructions, storage_notes,
       cautions, source, photo_paths, created_at
from public.community_recipes
where status = 'pending' and admin_removed_at is null
order by created_at;
```

Use protected moderation/removal RPCs or the console for decisions so authorization, review receipts, and audit behavior are preserved. Do not bypass them with direct status changes.

## Concerns, private blocking, and deletion

Reports now cover catalogue/admin-created/community recipes through private `recipe_concerns`; legacy `recipe_reports` alone is not the full review queue. Use admin **Open reports** and [the report guide](recipe-publication-and-reports.md). Reporting/blocking permanently excludes the recipe for that account. For community recipes it also excludes the contributor, their recipes across guides, and their profile. There is no user-facing history, management list, or restore/unblock action. Review alone does not unpublish content or restore the reporter's personal choice; global removal requires an explicit admin action.

Authors can withdraw their own submissions, and the client attempts photo cleanup. Withdrawn records remain subject to moderation/retention until purged or removed by account deletion. Self-service/admin account deletion uses the same Storage-first Edge Function followed by permanent Auth deletion/cascades. Failed cleanup stays pending for retry/operator assistance. Do not manually delete Auth first and leave files behind.

## Verification

Run `npm run verify`, `npm run safety:test`, and `python3 scripts/test-community-db.py`. SQL fixtures use disposable local accounts/Storage tables; never run them in a hosted project. They test ownership, product separation, moderation, votes/limits, withdrawal, saves, reports, personal hiding, and deletion. Real native photo selection, authenticated uploads, signed URLs, and cross-account behavior still require physical-device/provider testing.
