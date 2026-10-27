-- Repeatable. Apply after recipe-saves-and-admin-users.sql.
-- Authorizes deletion only; the Edge Function removes storage before Auth.
begin;
create or replace function public.community_admin_prepare_deletion(p_user uuid,p_email text,p_note text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target_email text;
begin
 if not public.community_is_admin() then
  raise exception 'Administrator access with recent MFA required.' using errcode='42501';
 end if;
 if p_user is null or p_user=actor or exists(select 1 from public.community_admins where user_id=p_user) then
  raise exception 'Administrator accounts cannot be deleted here.';
 end if;
 if char_length(btrim(coalesce(p_note,''))) not between 3 and 2000 then
  raise exception 'Enter a deletion reason between 3 and 2000 characters.';
 end if;
 select email into target_email from auth.users where id=p_user for update;
 if not found then raise exception 'Account no longer exists. Refresh the user list.'; end if;
 if target_email is null or lower(btrim(coalesce(p_email,'')))<>lower(target_email) then
  raise exception 'Type the account email exactly to confirm deletion.';
 end if;
 insert into public.community_account_controls(user_id,deletion_requested_at)
 values(p_user,now()) on conflict(user_id) do update
 set deletion_requested_at=coalesce(public.community_account_controls.deletion_requested_at,now());
 insert into public.community_admin_audit(actor,action,kind,subject_user,note)
 values(actor,'permanent_deletion_requested','account',p_user,btrim(p_note));
 return p_user;
end $$;
revoke all on function public.community_admin_prepare_deletion(uuid,text,text) from public,anon,authenticated;
grant execute on function public.community_admin_prepare_deletion(uuid,text,text) to authenticated;
-- Stop new avatar uploads as soon as cleanup is pending, including requests
-- made with a previously issued access token.
drop policy if exists profile_avatars_owner_insert on storage.objects;
create policy profile_avatars_owner_insert on storage.objects for insert to authenticated
 with check(bucket_id='profile-avatars'
  and split_part(name,'/',1)=public.community_require_user()::text
  and split_part(name,'/',2) ~ '^avatar\.(jpeg|png|webp)$'
  and name not like '%/%/%');
drop policy if exists profile_avatars_owner_update on storage.objects;
create policy profile_avatars_owner_update on storage.objects for update to authenticated
 using(bucket_id='profile-avatars' and split_part(name,'/',1)=public.community_require_user()::text)
 with check(bucket_id='profile-avatars'
  and split_part(name,'/',1)=public.community_require_user()::text
  and split_part(name,'/',2) ~ '^avatar\.(jpeg|png|webp)$'
  and name not like '%/%/%');
notify pgrst,'reload schema';
commit;
