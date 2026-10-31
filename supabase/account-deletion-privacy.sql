-- Repeatable. Apply AFTER admin-membership.sql and builtin-recipe-admin.sql.
-- Both self-service and admin deletion hard-delete auth.users; this trigger
-- runs in that same transaction, before identifying profile data cascades away.
begin;
create or replace function public.community_audit_mentions(p_text text,p_identifiers text[])
returns boolean language sql immutable set search_path='' as $$
 select exists(select 1 from unnest(p_identifiers) identifier
 where char_length(btrim(identifier))>=3
 and strpos(lower(coalesce(p_text,'')),lower(identifier))>0);
$$;
revoke all on function public.community_audit_mentions(text,text[]) from public,anon,authenticated;

create or replace function public.community_delete_private_audit()
returns trigger language plpgsql security definer set search_path='' as $$
declare identifiers text[]; reviewer_label text; admin_initiated boolean;
begin
 select array[OLD.id::text,OLD.email,p.username,p.nickname,nullif(p.bio,'')],a.label
 into identifiers,reviewer_label
 from (select 1) one
 left join public.community_profiles p on p.user_id=OLD.id
 left join public.community_admins a on a.user_id=OLD.id;
 identifiers:=array_append(identifiers,reviewer_label);
 select exists(select 1 from public.community_admin_audit
 where subject_user=OLD.id and action='permanent_deletion_requested') into admin_initiated;

 -- Remove account-linked history, including arbitrary free-text notes.
 delete from public.community_admin_audit where actor=OLD.id or subject_user=OLD.id;
 delete from public.community_builtin_recipe_audit where actor=OLD.id;
 -- Unrelated administrators may have mentioned this account in their notes.
 -- Scrub the whole free-text field, not just an email/handle fragment.
 update public.community_admin_audit set note='[Removed during account deletion]'
 where public.community_audit_mentions(note,identifiers);
 update public.community_builtin_recipe_audit
 set note=case when public.community_audit_mentions(note,identifiers) then '[Removed during account deletion]' else note end,
 before_content=case when public.community_audit_mentions(before_content::text,identifiers) then null else before_content end,
 after_content=case when public.community_audit_mentions(after_content::text,identifiers) then null else after_content end
 where public.community_audit_mentions(note,identifiers)
 or public.community_audit_mentions(before_content::text,identifiers)
 or public.community_audit_mentions(after_content::text,identifiers);
 update public.community_moderation_audit
 set note=case when public.community_audit_mentions(note,identifiers) then '[Removed during account deletion]' else note end,
 reviewer=case when public.community_audit_mentions(reviewer,identifiers) then 'Deleted reviewer' else reviewer end
 where public.community_audit_mentions(note,identifiers) or public.community_audit_mentions(reviewer,identifiers);
 -- Moderation receipts are also embedded in surviving community content.
 update public.community_recipes set review_record=jsonb_build_object(
 'reviewer','Deleted reviewer','note','[Removed during account deletion]',
 'reviewed_at',review_record->'reviewed_at')
 where public.community_audit_mentions(review_record::text,identifiers);
 update public.community_comments set review_record=jsonb_build_object(
 'reviewer','Deleted reviewer','note','[Removed during account deletion]',
 'reviewed_at',review_record->'reviewed_at')
 where public.community_audit_mentions(review_record::text,identifiers);

 -- Minimal completion receipt: random row ID, timestamp and initiation mode.
 -- No user ID, email, handle, content ID, administrator ID or supplied note.
 insert into public.community_admin_audit(action,kind,note)
 values('account_deleted','account',case when admin_initiated
 then 'Account deletion completed; initiated by admin.'
 else 'Account deletion completed; initiated by user.' end);
 return OLD;
end $$;
revoke all on function public.community_delete_private_audit() from public,anon,authenticated;
drop trigger if exists community_delete_private_audit on auth.users;
create trigger community_delete_private_audit before delete on auth.users
for each row execute function public.community_delete_private_audit();

-- Old SET NULL records no longer identify the deleted account reliably.
-- Remove their unstructured content rather than pretending we can reconstruct it.
update public.community_admin_audit set note='[Historical account details removed]'
where kind='account' and subject_user is null and action<>'account_deleted';
update public.community_builtin_recipe_audit
set note='[Historical account details removed]',before_content=null,after_content=null
where actor is null;
commit;
