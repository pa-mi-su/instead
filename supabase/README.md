# Supabase setup and upgrades

These files describe schema/RPC upgrades for Supabase. They are not automatically applied by the mobile or website workflows. Inventory the target database first; do not paste all files into an existing project's SQL Editor. **Never run `tests/` fixtures against hosted users.**

## Complete dependency order

For a new community database, apply the following as project owner:

1. `community.sql`, then `recipes.sql` — **one-time** base migrations.
2. `directory-topics.sql`, then `community-safeguards.sql` — topics, active verified accounts, policy acceptance, blocking, moderation, and photo ownership.
3. `admin-panel.sql` — protected admin operations and membership/bootstrap support; no membership is granted automatically.
4. `recipe-comments.sql` — legacy compatibility and shared recipe registry. The current app/admin do not offer a comment feed.
5. `recipe-voting.sql` — catalogue registry and voting.
6. `private-account-hub.sql`, then `profile-avatars.sql` — private saves/profiles and optional public avatars.
7. `simplify-admin-review.sql` — obsolete review-field cleanup and rejected-content Trash behavior.
8. `builtin-recipe-admin.sql` — catalogue editor, archive/restore, and audit.
9. `recipe-saves-and-admin-users.sql` — individual recipe saves and admin user directory.
10. `admin-user-deletion.sql`, then `admin-membership.sql` — authorized admin deletion and audited administrator grants.
11. `account-deletion-privacy.sql` — common Auth-deletion audit cleanup and anonymous completion receipts.
12. `recipe-concerns.sql` — private reports, immutable receipts, quotas, SMTP claims, and admin review.
13. `recipe-concern-history.sql` — caller-scoped legacy history and compatible clear/restore endpoints.
14. `personal-recipe-visibility.sql` — initial private visibility/filter schema.
15. `permanent-recipe-exclusions.sql` — **final override**: reporting/blocking permanently excludes a community contributor (or an individual catalogue recipe), removes affected account bookmarks, disables history/management reads and every restore/unblock write.

Read each file's header before applying it. The initial community/recipe scripts are one-time additions; the later upgrades are designed for repeat application. Several later scripts replace earlier RPC definitions, so reapplying an earlier file may require reapplying its dependent overrides. Avoid replaying old definitions over current behavior.

`schema.sql`/`seed.sql` concern a separate legacy `guides` table. Mobile routing starts from `src/catalog.ts`, overlaid with `builtin_recipe_catalog`; that table seed is not its content installer. Register new bundled recipe IDs in `recipe-voting.sql` after changing the shipped catalogue; the admin editor registers its own additions.

## Edge Functions and server configuration

Deploy `supabase/functions/delete-account/index.ts` as `delete-account` after the deletion migrations. Deploy `supabase/functions/report-recipe/index.ts` as `report-recipe` after concern migrations. Keep platform JWT verification enabled and preserve authoritative Auth checks in both handlers. Deployment flag names depend on the installed Supabase CLI; use its help rather than assuming an old `--project-ref` command still applies.

Both handlers use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the **server environment only**. Recipe reports additionally need `REPORT_SMTP_HOST`, `REPORT_SMTP_PORT`, `REPORT_SMTP_USER`, `REPORT_SMTP_PASS`, and `REPORT_SMTP_SENDER`. Auth SMTP, confirmation/recovery templates, code expiry, password rules, and security switches live separately in Supabase Auth settings. SQL does not configure them. See [community setup](../docs/community-setup.md) and [report delivery](../docs/recipe-publication-and-reports.md).

The mobile/static clients receive only the project URL and publishable key. Never grant broad table access or put a service-role/SMTP credential in client configuration. Admin membership must be explicitly granted to a verified account; migrations never promote ordinary signups.

## Storage, deletion, and personal visibility

- `recipe-photos` is private, with account-owned opaque folders and constrained uploads. Readers obtain short-lived signed URLs when permitted.
- `profile-avatars.sql` creates optional **public** avatar storage and owner-scoped writes. Run `node --env-file=.env scripts/check-profile-avatars.mjs` with public configuration to check readiness without uploading a photo. Both signed mobile release jobs run the same check.
- The deletion function removes recipe photos/avatars before Auth deletion. Cascades remove dependent data; `account-deletion-privacy.sql` cleans linked audit data/redacts matching snapshots and retains an anonymous completion receipt. A pending request is not proof of completed cleanup. Provider backups/logs, support mail, and other devices have separate retention; see [admin deletion](../docs/admin-panel.md).
- A concern insert creates a private hidden-recipe preference in the same transaction. Review clears legacy history but does not restore that preference or unpublish the recipe. Reporting/blocking uses account-owned exclusions. Current clients expose no history, management, restore, or unblock controls.
- The permanent migration must run last. It supersedes the earlier reversible visibility APIs and reconciles existing reports/blocks, including earlier restores. Do not replay earlier RPC definitions over it without reapplying this override. It creates no global archive/removal decisions.
- Public catalogue responses remain global. The app applies private preferences separately; server published/Saved/profile reads also filter them. This is a visibility preference, not a change to public publication.

## Disposable local database tests

```bash
python3 scripts/test-community-db.py
# If PostgreSQL tools are not discovered:
INSTEAD_PG_BIN=/path/to/postgresql/bin python3 scripts/test-community-db.py
```

Python 3 and PostgreSQL are required. Run as a normal user: `initdb` does not run as root. The harness creates its own temporary cluster/Unix socket, applies migrations in historical upgrade order, runs synthetic SQL fixtures and concurrent-report checks, and removes the cluster afterward. It does not accept a hosted database URL.

The suite verifies authorization/RLS/grants, migration repetition, moderation, votes, private saves/profiles, membership, Storage policy behavior, deletion/audit privacy, report quotas/duplicates/concurrency, and personal hiding across both recipe types. Historical upgrade tests cover the old reversible schema, then final-contract tests verify permanent exclusions, no legacy restore/unblock/history access, same-contributor cross-guide/profile scope, and private bookmark cleanup. Storage/Auth tables are local fixtures; real provider integration still needs authorized end-to-end testing.
