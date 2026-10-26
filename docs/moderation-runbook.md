# Private moderation runbook

Authorized moderators can use the private website admin panel described in docs/admin-panel.md. The Supabase project owner can also use the SQL editor, or a trusted server can use the service role. Never ship service-role credentials in mobile/web or give them to a contributor. Public RPCs expose no author account IDs. Blocking uses a content ID; opaque upload folders avoid exposing Auth UUIDs in public photo paths.

## Review queues (owner SQL editor)

```sql
select id, product_id, title, ingredients, instructions, storage_notes, cautions, source, photo_paths, created_at
from public.community_recipes where status='pending' order by created_at;
select recipe_id,reason,created_at from public.recipe_reports order by created_at desc;
select * from public.community_deletion_queue();
```

The current apps accept and display recipe submissions, not comments. Historical comment rows are retained only in legacy tables and are handled through account deletion/cleanup; they are not an active review queue.

Before approval: confirm permitted subject, quantities/ingredient grade and concentration, credible evidence, compatibility, preservation/storage, contraindications, and no cure guarantees or individualized treatment. Verify image ownership, private information, inappropriate images, and that images match the content. Do not approve a formula simply because it includes a disclaimer, is popular, or was AI-generated. Preserve internal provenance and evidence even where no public links are displayed.

Reject personalized diagnosis/dosing, advice to stop prescribed care, unsupported cure/antibacterial claims, dangerous chemical combinations, concentrated-acid shortcuts, inappropriate child/pet use, unsubstantiated shelf-life claims, spam, and private information. Review health-related claims carefully; community approval and votes do not establish safety or effectiveness. At the owner’s request, bundled personal-care formulas and the salt weed spray remain visible in src/catalog.ts with safety context. They have not received independent qualified review; do not represent otherwise.

## Record an actual review

```sql
-- Fill in actual content ID, decision, specific reasoning, and reviewer label.
-- select public.community_moderate('recipe','<uuid>','approved',
--   '<specific review reasoning>','<reviewer name>');
-- To reject content, use the same RPC with decision 'rejected'.
```

Approval requires an authorized admin to confirm they reviewed the full submission and every photo, and to enter a reason. The private audit records the admin, decision, reason, and time. Votes and admin approval do not establish safety or effectiveness. Rejecting content moves it directly to Trash. Legacy photos containing account UUIDs cannot be approved; migrate via Storage or request a resubmission in an opaque folder rather than editing paths only.

To stop an abusive account, an owner can insert/update community_account_controls.suspended=true for that user's internal Auth ID. Existing tokens cannot bypass contribution checks, and public content is hidden. Keep moderation notes factual and avoid unnecessary personal or medical details. Users can block/unblock privately; no public contributor profile is needed.

Do not automatically remove content based on report counts: coordinated reports could otherwise silence users. Human triage and timely response are operational requirements. When reviewers are unavailable, pending submissions remain unpublished.
