# Supabase SQL files

This directory contains database setup and upgrade scripts for the hosted Supabase project. The `tests/` subdirectory contains disposable local test fixtures. The scripts are kept separate because they upgrade databases at different points in the app's history and have different prerequisites; do not paste every file into the SQL Editor.

For a new community database, use this dependency order:

1. Run `community.sql` once, then `recipes.sql` once.
2. Run `directory-topics.sql`, then `community-safeguards.sql`.
3. Run `admin-panel.sql`.
4. Run `recipe-comments.sql` for legacy database compatibility. The current app does not accept or show comments, but later recipe registry migrations depend on it.
5. Run `recipe-voting.sql`.
6. Run `private-account-hub.sql`, then `profile-avatars.sql`, and `simplify-admin-review.sql`.
7. Run `builtin-recipe-admin.sql`.
8. Run `recipe-saves-and-admin-users.sql`.
9. Run `admin-user-deletion.sql` and redeploy the `delete-account` Edge Function before publishing the admin deletion UI.

10. Run `admin-membership.sql` before publishing the admin role labels and Add admin controls. It adds an MFA-protected, audited grant operation; running the migration does not add any admins.

11. Run `recipe-concerns.sql` and deploy the `report-recipe` Edge Function before publishing report-email controls. Configure its server-only SMTP secrets as described in [recipe publication and reports](../docs/recipe-publication-and-reports.md).

12. Run `recipe-concern-history.sql` after `recipe-concerns.sql` before releasing the My INSTEAD private concern-history UI. This adds authenticated, caller-scoped history reads and reversible clear/restore controls. Reapply the current file to add `hidden_at` and the visibility RPC before releasing those controls; submitted reports and email delivery remain intact.

Repeatable scripts can be applied again when their contents change. The two initial community migrations are one-time additions; never replay them on an existing project. Existing databases may have already applied some or all of these changes, so check the exact migration headers and [community setup](../docs/community-setup.md), [admin panel](../docs/admin-panel.md), and [release safety](../docs/release-safety.md) before using the Supabase SQL Editor. After adding or changing built-in recipes, rerun `recipe-voting.sql` to register the catalog for voting. None of these scripts grants admin membership.

`schema.sql` and `seed.sql` set up the separate guide catalog for a new project. They are unrelated to community recipes and should not be rerun on an existing database.

## Local database tests

`profile-avatars.sql` creates the public `profile-avatars` bucket and owner-scoped upload/update/delete policies. Avatar images are intentionally public when used on a public profile. The migration does not modify existing profile photos or recipe photos.

The `tests/*.test.sql` files use synthetic accounts and roll back their fixtures. They are never production migrations. Run the full ordered migration and test suite with `python3 scripts/test-community-db.py`; it creates a temporary local PostgreSQL cluster and removes it when finished. Do not run the fixture files in a hosted Supabase project.

### Account deletion audit privacy

After `admin-membership.sql` and `builtin-recipe-admin.sql`, apply the repeatable `account-deletion-privacy.sql`. Both admin and self-service permanent Auth deletion then run the same transactional audit cleanup. See `docs/admin-panel.md` for rollout, historical limitations, backup/log retention and restore reconciliation. This migration must be applied separately; merging frontend code does not apply database migrations.

13. Run `personal-recipe-visibility.sql` after all files above, before releasing personal recipe hiding. Reports hide the target only for the reporter; reviewed concerns automatically leave legacy history, and personal hiding persists until restored. Both catalogue and community recipes support the same private block/restore flow. This migration does not archive or unpublish recipes. Its one-time backfill includes existing concerns and will not re-hide restored recipes on later deployments.
