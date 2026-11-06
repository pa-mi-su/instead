begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('94000000-0000-0000-0000-000000000001','signup-one@example.invalid',now()),
 ('94000000-0000-0000-0000-000000000002','signup-two@example.invalid',now()),
 ('94000000-0000-0000-0000-000000000003','pending@example.invalid',null);
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000001',true);
select public.community_profile_set('SignupOne','');
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ begin
 if public.community_username_available('signupone') then raise exception 'Existing public username reported available'; end if;
 if not public.community_username_available('NewSignup') then raise exception 'New username should be available'; end if;
 if public.community_username_available('!') or public.community_username_available(null) then raise exception 'Invalid handle available'; end if;
 if has_table_privilege('anon','public.community_profiles','select') then raise exception 'Preflight exposed profile table'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000003',true);
do $$ begin
 begin
  perform public.community_profile_set('PendingSignup','');
  raise exception 'Unverified identity created a public profile';
 exception when raise_exception then
  if sqlerrm='Unverified identity created a public profile' then raise; end if;
 end;
 begin
  insert into public.community_profiles(user_id,nickname,username,bio)
   values('94000000-0000-0000-0000-000000000003','PendingSignup','PendingSignup','');
  raise exception 'Privileged insert bypassed verification';
 exception when insufficient_privilege then null;
 end;
end $$;
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000002',true);
do $$ begin
 begin
  perform public.community_profile_set('SIGNUPONE','');
  raise exception 'Final uniqueness check did not stop race';
 exception when unique_violation then null;
 end;
end $$;
select public.community_profile_set('NewSignup','');
-- Deletion releases a handle through the Auth->profile FK cascade.
delete from auth.users where id='94000000-0000-0000-0000-000000000001';
do $$ begin
 if not public.community_username_available('SignupOne') then raise exception 'Deleted account still reserves handle'; end if;
 if exists(select 1 from public.community_profiles where user_id='94000000-0000-0000-0000-000000000001') then raise exception 'Orphan profile retained'; end if;
end $$;
rollback;
