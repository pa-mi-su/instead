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

Repeatable scripts can be applied again when their contents change. The two initial community migrations are one-time additions; never replay them on an existing project. Existing databases may have already applied some or all of these changes, so check the exact migration headers and [community setup](../docs/community-setup.md), [admin panel](../docs/admin-panel.md), and [release safety](../docs/release-safety.md) before using the Supabase SQL Editor. After adding or changing built-in recipes, rerun `recipe-voting.sql` to register the catalog for voting. None of these scripts grants admin membership.

`schema.sql` and `seed.sql` set up the separate guide catalog for a new project. They are unrelated to community recipes and should not be rerun on an existing database.

## Local database tests

`profile-avatars.sql` creates the public `profile-avatars` bucket and owner-scoped upload/update/delete policies. Avatar images are intentionally public when used on a public profile. The migration does not modify existing profile photos or recipe photos.

The `tests/*.test.sql` files use synthetic accounts and roll back their fixtures. They are never production migrations. Run the full ordered migration and test suite with `python3 scripts/test-community-db.py`; it creates a temporary local PostgreSQL cluster and removes it when finished. Do not run the fixture files in a hosted Supabase project.
