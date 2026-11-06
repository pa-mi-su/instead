begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('93000000-0000-0000-0000-000000000001','live-session@example.invalid',now()),
 ('93000000-0000-0000-0000-000000000002','pending-session@example.invalid',null);
select set_config('request.jwt.claim.sub','93000000-0000-0000-0000-000000000001',true);
select public.community_profile_set('SessionLive','');
select public.community_accept_policy(public.community_policy_version());
do $$ begin
 if not exists(select 1 from public.community_account_state() where policy_accepted and not suspended) then raise exception 'Live account unavailable'; end if;
 if not public.recipe_photo_owned('93000000-0000-0000-0000-000000000001/photo.jpg') then raise exception 'Live legacy ownership lost'; end if;
end $$;
insert into public.community_account_controls(user_id,suspended) values('93000000-0000-0000-0000-000000000001',true);
do $$ begin
 if not exists(select 1 from public.community_account_state() where suspended) then raise exception 'Suspended account status hidden'; end if;
end $$;
delete from auth.users where id='93000000-0000-0000-0000-000000000001';
-- Keep the old JWT subject after Auth deletion, matching the reported bug.
do $$ begin
 if exists(select 1 from public.community_account_state()) then raise exception 'Deleted JWT has phantom account state'; end if;
 if public.recipe_photo_owned('93000000-0000-0000-0000-000000000001/photo.jpg') then raise exception 'Deleted JWT retains media ownership'; end if;
 begin perform public.community_saved_guides_set('natural-toothpaste',true); raise exception 'Deleted user saved'; exception when raise_exception then if sqlerrm not like 'Sign in with an active verified email account.%' then raise; end if; end;
 begin perform public.community_profile_set('DeletedSession',''); raise exception 'Deleted user recreated profile'; exception when raise_exception then if sqlerrm not like 'Sign in with an active verified email account.%' then raise; end if; end;
 begin perform public.community_accept_policy(public.community_policy_version()); raise exception 'Deleted user accepted terms'; exception when raise_exception then if sqlerrm not like 'Sign in with an active verified email account.%' then raise; end if; end;
 begin perform public.builtin_recipe_vote('natural-toothpaste','builtin:naturalToothpasteRecipe',1::smallint); raise exception 'Deleted user voted'; exception when raise_exception then if sqlerrm not like 'Sign in with an active verified email account.%' then raise; end if; end;
 begin perform public.recipe_concern_submit('natural-toothpaste','builtin:naturalToothpasteRecipe','Other','Deleted token concern'); raise exception 'Deleted user reported'; exception when raise_exception then if sqlerrm not like 'Sign in with an active verified email account.%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','93000000-0000-0000-0000-000000000002',true);
do $$ begin if exists(select 1 from public.community_account_state()) then raise exception 'Unverified JWT has account state'; end if; end $$;
select set_config('request.jwt.claim.sub','',true);
do $$ begin if exists(select 1 from public.community_account_state()) then raise exception 'Guest has account state'; end if; end $$;
rollback;
