-- Repeatable. Apply after private-account-hub.sql.
-- Profile photos are public, optional avatars. Users can only manage their own object.
begin;

alter table public.community_profiles
 add column if not exists avatar_path text;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-avatars','profile-avatars',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set
 public=true,
 file_size_limit=excluded.file_size_limit,
 allowed_mime_types=excluded.allowed_mime_types;

-- Policy callers cannot execute the private account guard directly.
create or replace function public.community_avatar_owner() returns uuid
language sql security definer set search_path='' as $$
 select public.community_require_user();
$$;
revoke all on function public.community_avatar_owner() from public,anon,authenticated;
grant execute on function public.community_avatar_owner() to authenticated;

drop policy if exists profile_avatars_public_read on storage.objects;
create policy profile_avatars_public_read on storage.objects for select to anon,authenticated
 using(bucket_id='profile-avatars');
drop policy if exists profile_avatars_owner_insert on storage.objects;
create policy profile_avatars_owner_insert on storage.objects for insert to authenticated
 with check(bucket_id='profile-avatars'
  and split_part(name,'/',1)=public.community_avatar_owner()::text
  and split_part(name,'/',2) ~ '^avatar\.(jpeg|png|webp)$'
  and name not like '%/%/%');
drop policy if exists profile_avatars_owner_update on storage.objects;
create policy profile_avatars_owner_update on storage.objects for update to authenticated
 using(bucket_id='profile-avatars' and split_part(name,'/',1)=public.community_avatar_owner()::text)
 with check(bucket_id='profile-avatars'
  and split_part(name,'/',1)=public.community_avatar_owner()::text
  and split_part(name,'/',2) ~ '^avatar\.(jpeg|png|webp)$'
  and name not like '%/%/%');
drop policy if exists profile_avatars_owner_delete on storage.objects;
create policy profile_avatars_owner_delete on storage.objects for delete to authenticated
 using(bucket_id='profile-avatars' and split_part(name,'/',1)=public.community_avatar_owner()::text);

create or replace function public.community_profile_avatar_set(p_avatar_path text)
returns void language plpgsql security definer set search_path='' as $$
declare who uuid:=public.community_require_user();
begin
 if p_avatar_path is not null and (
   split_part(p_avatar_path,'/',1)<>who::text
   or split_part(p_avatar_path,'/',2) !~ '^avatar\.(jpeg|png|webp)$'
   or p_avatar_path like '%/%/%'
   or not exists(select 1 from storage.objects where bucket_id='profile-avatars' and name=p_avatar_path)
 ) then raise exception 'Choose a profile photo uploaded to your own account.'; end if;
 update public.community_profiles set avatar_path=p_avatar_path where user_id=who;
 if not found then raise exception 'Complete account setup before updating your profile.'; end if;
end $$;

drop function if exists public.community_profile_me();
create function public.community_profile_me()
returns table(username text,bio text,avatar_path text)
language sql stable security definer set search_path='' as $$
 select p.username,p.bio,p.avatar_path from public.community_profiles p
 where p.user_id=public.community_require_user();
$$;

drop function if exists public.community_profile_public(text);
create function public.community_profile_public(p_username text)
returns table(username text,bio text,avatar_path text,recipes jsonb)
language sql stable security definer set search_path='' as $$
 select p.username,p.bio,p.avatar_path,coalesce((
  select jsonb_agg(jsonb_build_object('id',r.id,'title',r.title,'product_id',r.product_id,'created_at',r.created_at)
                   order by r.created_at desc,r.id)
  from public.community_recipes r
  where r.user_id=p.user_id and r.status='approved' and public.community_author_visible(r.user_id)
 ),'[]'::jsonb)
 from public.community_profiles p
 where lower(p.username)=lower(btrim(p_username)) and public.community_author_visible(p.user_id)
 limit 1;
$$;

revoke all on function public.community_profile_avatar_set(text),public.community_profile_me(),public.community_profile_public(text)
 from public,anon,authenticated;
grant execute on function public.community_profile_avatar_set(text),public.community_profile_me() to authenticated;
grant execute on function public.community_profile_public(text) to anon,authenticated;

notify pgrst,'reload schema';
commit;
