-- Repeatable; apply after permanent-recipe-exclusions.sql.
begin;
-- A public-username preflight reveals only availability, never Auth identity.
-- This is advisory: the case-insensitive unique index remains authoritative.
create or replace function public.community_username_available(p_username text)
returns boolean language sql stable security definer set search_path='' as $$
 select btrim(coalesce(p_username,'')) ~ '^[A-Za-z0-9_]{3,20}$'
 and not exists(select 1 from public.community_profiles p
   where lower(p.username)=lower(btrim(p_username)) and p.user_id is distinct from auth.uid());
$$;
revoke all on function public.community_username_available(text) from public;
grant execute on function public.community_username_available(text) to anon,authenticated;
-- Even privileged legacy inserts must not create a public profile for a
-- pending Auth identity. Supabase itself owns the unconfirmed Auth challenge.
create or replace function public.community_profile_verified_guard()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users where id=new.user_id and email_confirmed_at is not null
   and email is not null and not coalesce(is_anonymous,false))
 then raise exception 'Verify your email before creating a profile.' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function public.community_profile_verified_guard() from public,anon,authenticated;
drop trigger if exists community_profile_verified_guard on public.community_profiles;
create trigger community_profile_verified_guard before insert or update on public.community_profiles
 for each row execute function public.community_profile_verified_guard();
commit;
