# Recipe publication, reports, and personal hiding

Current source behavior, audited November 5, 2026. Catalogue (`builtin:…`), admin-created (`admin:…`), and user-submitted (UUID) recipes retain stable source IDs; approval does not copy a community submission into another table or change its identity.

## Publication and navigation

**Pending recipes** is the private admin review queue. Approval removes a submission from that queue and publishes it under **Recipes**, alongside catalogue/admin-created recipes. The unified admin list has source/publication/search filters and community pagination. Rejected/removed community content is retained in Trash until its applicable cleanup; restoring returns it to review rather than automatically publishing it.

Mobile guides show approved community submissions in the published Recipes section. Private submission controls do not repeat approved cards below it. Pending submissions are not visible to other users. The controller shares published state with submission controls, while My INSTEAD provides private submission management. Saved links retain both topic and recipe IDs, target the actual card after layout, and load additional community pages if necessary. Approval becomes visible on refresh; this is not a realtime subscription.

## Reporting and personal visibility

Every published recipe type offers **Report or raise a concern**. A verified, active account supplies a reason and details. The server derives the reporter's Auth identity and verified email, retrieves the canonical recipe snapshot, stores a private concern, and sends it to `info@insteadtry.com`. Clients cannot choose a recipient or trusted identity. Catalogue records without stored recipe text are enriched from the fixed public INSTEAD catalogue URL before email delivery.

The concern transaction also creates a private hidden-recipe preference. The mobile report confirmation remains visible until it closes, then the recipe disappears for that account. Other accounts and guests continue seeing published content while review is pending and after an admin deems it acceptable. **Only explicit admin archive/removal changes global publication.** Report counts do not automatically remove recipes.

**Report or raise a concern** is the only recipe moderation action in the app; there is no separate Block recipe or Block contributor button. Reporting permanently excludes a catalogue recipe for the reporter. For community content, reporting also excludes that contributor and their recipes across all guides and public profiles. There is no undo path and no report, hidden-content, or contributor-management section in My INSTEAD.

Published community reads apply exclusions before pagination. Saved and profiles also filter them; affected recipe bookmarks are removed only from the acting account. Future recipes by an excluded contributor stay unavailable to that account. The global catalogue cache remains public and unmodified; private filter data contains IDs/public usernames only, not displayable history. Own submissions are filtered too if the account excluded one of its own published recipes.

The final migration rejects old restore/unblock/history-mutation RPCs and returns empty legacy history/block lists. The app removes the corresponding components/hooks, rather than merely collapsing them. See [the exact permanent-exclusion contract](permanent-recipe-exclusions.md).

## Duplicate prevention and spam controls

- One immutable concern per account/recipe, including after review. Changing text or retrying does not replace the original report or create another.
- Verified active accounts only; suspended, banned, anonymous, unverified, and deletion-pending accounts cannot submit concerns.
- Per-account advisory transaction locking serializes simultaneous submissions.
- Limits: **10 new concerns per rolling hour**, **30 per rolling 24 hours**, and **30 successful submission/retry requests per hour** across recipes. Duplicate retries use the request quota without another creation slot. Rate-limited requests return HTTP 429 before mail delivery.
- A five-minute email claim prevents concurrent sends; completed receipts are not resent. Legacy duplicate rows are preserved and a delivered receipt is preferred.
- Permanent recipe exclusion verifies the expected Auth account and has its own **60 operations/hour** quota. No restore or unblock operation is allowed.

These controls do not establish one-human-per-account or immunity to coordinated account creation. Do not weaken server checks because the app disables a button.

## Admin review and resolution

MFA-authenticated admins see concerns under Recipes, including the **Open reports** filter. Multiple concerns appear in an expandable bounded list with reasons, details, and dates. Marking reviewed requires a reason and acknowledges only the displayed concern IDs/snapshot. New or unselected reports remain open. Older clients retain timestamp-cutoff compatibility.

Catalogue text IDs are never cast to UUIDs. A community reference is resolved from the actual community row; catalogue/admin-created IDs are retained as text in the audit note. Membership, live session, recent MFA, and the normal admin audit controls remain mandatory. Reviewing concerns leaves publication and the reporter's personal hiding unchanged.

## Email and deployment

Follow [the full SQL order](../supabase/README.md). Apply `recipe-concerns.sql`, `recipe-concern-history.sql`, `personal-recipe-visibility.sql`, then **`permanent-recipe-exclusions.sql`** after their prerequisites. The last file supersedes reversible behavior and privately reconciles earlier reports/blocks, including previously restored reports. It does not change any recipe's global publication. Do not remove permanent receipts or migration markers.

Deploy `supabase/functions/report-recipe/index.ts` as `report-recipe` with platform JWT verification enabled. Configure only server secrets:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `REPORT_SMTP_HOST`, `REPORT_SMTP_PORT`, `REPORT_SMTP_USER`, `REPORT_SMTP_PASS`, `REPORT_SMTP_SENDER`

Production report email uses a dedicated SES SMTP identity in us-east-1, restricted to sending from `no-reply@insteadtry.com` to `info@insteadtry.com`. Auth SMTP credentials/settings are separate. Do not copy these secrets into app config, source, PRs, or logs.

Messages have formatted HTML and plain-text bodies with recipe/reporter context and an admin link. Success requires SMTP acceptance and a stored delivery timestamp. Failure preserves the concern, and the client can retry delivery against the same receipt. A saved-but-delayed email response is distinguished from confirmed delivery. There is **no unattended retry worker**. Delivery is at least once: SMTP acceptance followed by receipt-storage failure can cause a duplicate on retry.

Deleting a reporter cascades their private concerns/preferences. Deleting a recipe author redacts affected snapshots retained in other reporters' concerns and removes recipe hiding references. Already-delivered mail and provider backups/logs are outside that database transaction.

## Deployment evidence and QA

On November 3, the report function and SMTP path were exercised with a disposable verified account; SMTP accepted the message and one delivery timestamp was stored. The fixture account/records were removed. This was provider acceptance, not proof of permanent inbox deliverability.

On November 5, the personal-visibility migration was deployed with explicit owner approval. RLS/private grants, report/review triggers, one-time backfill, and reviewed-history cleanup were verified; global recipe publication state was unchanged. New UI behavior still requires the merged code and installed updated beta.

Run `npm run verify`, `npm run safety:test`, `python3 scripts/test-community-db.py`, and website checks when admin/site source changes. Local SQL tests cover both recipe types, other-account isolation, Saved/profile filtering, review versus global archive, immutable duplicates, rate limits, concurrent requests, deletion cleanup, and rejection of legacy undo/history calls. Handler tests cover forged client identity/recipient, SMTP failures/claims/retries, and catalogue enrichment.

On physical devices, test submission → approval → refresh → exact Saved opening; report each recipe type; verify the confirmation/keyboard behavior, private disappearance, second-account visibility, review without archive, explicit global archive, irreversible contributor exclusion, absence of management UI, and account deletion. Check both admin Open reports and actual support inbox delivery. Use disposable accounts for deletion tests and keep reviewer credentials usable.
