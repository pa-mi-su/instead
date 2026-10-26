-- Disposable database only; checks ownership, profile RPC exposure, and public visibility.
begin;
create or replace function pg_temp.must_reject(q text) returns void language plpgsql as $$
begin begin execute q; exception when others then return; end; raise exception 'Expected rejection: %',q; end $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('76000000-0000-0000-0000-000000000001','avatar-owner@example.invalid',now()),
 ('76000000-0000-0000-0000-000000000002','other-avatar@example.invalid',now());

set local role authenticated;
select set_config('request.jwt.claim.sub','76000000-0000-0000-0000-000000000001',true);
select public.community_profile_set('AvatarOwner','Photo profile.');
insert into storage.objects(bucket_id,name) values('profile-avatars','76000000-0000-0000-0000-000000000001/avatar.jpeg');
select public.community_profile_avatar_set('76000000-0000-0000-0000-000000000001/avatar.jpeg');
do $$ begin
 if not exists(select 1 from public.community_profile_me() where username='AvatarOwner' and avatar_path='76000000-0000-0000-0000-000000000001/avatar.jpeg') then raise exception 'Owner profile should return its avatar path'; end if;
 if not exists(select 1 from storage.objects where bucket_id='profile-avatars') then raise exception 'Public avatar should be readable'; end if;
end $$;
select pg_temp.must_reject($q$insert into storage.objects(bucket_id,name) values('profile-avatars','76000000-0000-0000-0000-000000000002/avatar.jpeg')$q$);
select pg_temp.must_reject($q$select public.community_profile_avatar_set('76000000-0000-0000-0000-000000000002/avatar.jpeg')$q$);
select public.community_profile_avatar_set(null);
do $$ begin
 if exists(select 1 from public.community_profile_me() where avatar_path is not null) then raise exception 'Avatar removal should clear the profile path'; end if;
 if has_function_privilege('anon','public.community_profile_avatar_set(text)','execute') then raise exception 'Anonymous users must not update profile avatars'; end if;
end $$;
rollback;
