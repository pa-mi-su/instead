# Permanent personal recipe exclusions

This is the current product contract, superseding the reversible controls originally added in PR #63.

| User action                               | Acting account                                                                                            | Other accounts                                                             |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Report a catalogue/admin-created recipe   | Recipe permanently disappears from every guide/Saved route.                                               | Published recipe remains available.                                        |
| Report a community recipe                 | Recipe, contributor's published recipes across all guides, and contributor profile permanently disappear. | Published content remains available while review is pending or accepts it. |
| Admin reviews and keeps content           | No personal restoration.                                                                                  | Content remains published.                                                 |
| Admin explicitly archives/removes content | Still excluded.                                                                                           | Removed through normal publication filters.                                |

The recipe action is **Report or raise a concern**, with no separate block button. Guests sign in to report; confirmation thanks the reporter and says the report will be evaluated with action if necessary. No follow-up is promised.

My INSTEAD exposes **no concern history, hidden recipes, blocked contributors, review list, restore, or unblock control**. Reporting is a completed action for the user; only the admin has review work. Catalogue recipes without a community contributor are excluded individually, not as a block of all INSTEAD catalogue content.

The server derives community authors from canonical recipe rows, never a client-supplied user ID. Private blocks reference the account ID, so username changes and future published recipes do not bypass them. Affected recipe bookmarks are removed only from the acting account; guides and unrelated bookmarks remain. Excluded own published recipes do not reappear through My INSTEAD submission listings. Account deletion still cascades personal exclusions; author deletion removes references through normal cleanup.

## Backend rollout

Apply `supabase/permanent-recipe-exclusions.sql` **after** `personal-recipe-visibility.sql` and all earlier prerequisites. The override makes the report trigger contributor-aware, permits only permanent hide writes, rejects legacy restore/unblock/history-mutation calls, and returns empty legacy management/history lists. `community_recipe_exclusions()` supplies private filter IDs/public usernames to the app; it is not rendered as a user list. Earlier reversible schema functions must not be reapplied over this override without rerunning it.

A one-time reconciliation includes existing reports, even if earlier UI allowed a restore, and gives existing community recipe blocks contributor scope. Publication status, admin decisions, other users' preferences, report receipts, and mail-delivery quotas are untouched. The existing report Edge Function needs no code redeployment because its database trigger owns exclusion. Deploy SQL before distributing the new client; installing the client is required to remove old screen sections.

## Verification

Run app verification, safety checks, and the disposable PostgreSQL suite. Test both catalogue ID formats and community UUIDs, same-contributor recipes in another guide, future approved recipes, Saved, profiles, own submissions, sign-out/restart/account switching, initial-filter network failures, pending/accepted admin review, explicit global removal, and denied legacy undo calls. Confirm My INSTEAD has no report/block management UI. Check that a second account and a signed-out guest retain normal access to published content.

Do not mark this rollout deployed merely because SQL exists in a PR. Hosted application/backfill and next-beta verification are separate steps.
