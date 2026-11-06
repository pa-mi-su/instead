-- Repeatable; apply after signup-integrity.sql.
begin;
-- A cryptographically valid but old JWT must not create a phantom account.
-- Restricted live accounts still receive status so deletion/help remains usable.
create or replace function public.community_account_state()
returns table(policy_accepted boolean,suspended boolean,deletion_requested_at timestamptz)
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_policy_acceptances p where p.user_id=u.id and p.version=public.community_policy_version()),
 coalesce(c.suspended,false) or coalesce(u.banned_until>now(),false),c.deletion_requested_at
 from auth.users u left join public.community_account_controls c on c.user_id=u.id
 where u.id=auth.uid() and u.email_confirmed_at is not null and u.email is not null and not coalesce(u.is_anonymous,false);
$$;
-- Public published media remains readable. Private ownership requires a live
-- verified identity, even for legacy folders named directly after the Auth ID.
create or replace function public.recipe_photo_owned(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null
 and u.email is not null and not coalesce(u.is_anonymous,false))
 and (p_path like auth.uid()::text||'/%' or exists(
 select 1 from public.community_photo_folders f where f.user_id=auth.uid() and p_path like f.folder_id::text||'/%'));
$$;
drop policy if exists profile_avatars_owner_delete on storage.objects;
create policy profile_avatars_owner_delete on storage.objects for delete to authenticated
 using(bucket_id='profile-avatars' and split_part(name,'/',1)=public.community_avatar_owner()::text);
notify pgrst,'reload schema';
commit;
