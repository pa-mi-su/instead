-- Disposable database only; the transaction rolls every fixture back.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('73000000-0000-0000-0000-000000000001','recipe-admin@example.invalid',now()),
 ('73000000-0000-0000-0000-000000000002','saved-user@example.invalid',now()),
 ('73000000-0000-0000-0000-000000000003','other-user@example.invalid',now());
insert into public.community_admins(user_id,label)
 values('73000000-0000-0000-0000-000000000001','Recipe admin');
insert into auth.mfa_factors values
 ('73000000-0000-0000-0000-000000000004','73000000-0000-0000-0000-000000000001','totp','verified');
insert into auth.sessions values
 ('73000000-0000-0000-0000-000000000005','73000000-0000-0000-0000-000000000001');
insert into public.community_profiles(user_id,nickname,username,bio) values
 ('73000000-0000-0000-0000-000000000002','Kitchen friend','kitchen_friend','');
insert into public.community_recipes(id,product_id,user_id,title,ingredients,instructions,storage_notes,cautions,status,review_record) values
 ('73000000-0000-0000-0000-000000000006','natural-toothpaste','73000000-0000-0000-0000-000000000002','Published community toothpaste','Coconut oil and baking soda','Mix into a paste','Keep covered','Stop if irritation occurs','approved',jsonb_build_object('reviewer','Fixture admin','note','Reviewed test recipe','reviewed_at',now())),
 ('73000000-0000-0000-0000-000000000007','natural-toothpaste','73000000-0000-0000-0000-000000000002','Pending community toothpaste','Coconut oil and baking soda','Mix into a paste','Keep covered','Stop if irritation occurs','pending',null);

create or replace function pg_temp.must_reject(q text) returns void language plpgsql as $$
begin begin execute q; exception when others then return; end; raise exception 'Expected rejection: %',q; end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','73000000-0000-0000-0000-000000000002',true);
select public.community_saved_recipes_set('natural-toothpaste','builtin:toothpasteRecipe','Mineral toothpaste',true);
select public.community_saved_recipes_set('natural-deodorant','builtin:tallowDeodorantRecipe','Tallow deodorant',true);
select public.community_saved_recipes_set('natural-toothpaste','73000000-0000-0000-0000-000000000006','Published community toothpaste',true);
select public.community_saved_recipes_set('natural-toothpaste','builtin:toothpasteRecipe','Forged title',true);
do $$ begin
 if (select count(*) from public.community_saved_recipes_list())<>3 then raise exception 'Recipe saves must be independent from category saves'; end if;
 if exists(select 1 from public.community_saved_guides_list()) then raise exception 'Saving recipes must not save their product guide'; end if;
 if not exists(select 1 from public.community_saved_recipes_list() where product_id='natural-toothpaste' and recipe_id='builtin:toothpasteRecipe' and recipe_title='Zero-Sweetener Coconut Toothpaste') then raise exception 'Recipe save should keep canonical recipe identity and title'; end if;
 if has_table_privilege('authenticated','public.community_saved_recipes','select') then raise exception 'Recipe saves must remain private behind the RPC'; end if;
end $$;
select pg_temp.must_reject($q$select public.community_saved_recipes_set('natural-toothpaste','73000000-0000-0000-0000-000000000007','Pending community toothpaste',true)$q$);
select public.community_saved_recipes_set('natural-toothpaste','builtin:toothpasteRecipe','Mineral toothpaste',false);
do $$ begin if (select count(*) from public.community_saved_recipes_list())<>2 then raise exception 'Unsave should remove only the selected recipe'; end if; end $$;

select set_config('request.jwt.claim.sub','73000000-0000-0000-0000-000000000003',true);
do $$ begin if exists(select 1 from public.community_saved_recipes_list()) then raise exception 'Another account must not see saved recipes'; end if; end $$;
select pg_temp.must_reject($q$select public.community_admin_users('',0)$q$);

select set_config('request.jwt.claim.sub','73000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims',jsonb_build_object(
 'aal','aal2','session_id','73000000-0000-0000-0000-000000000005',
 'amr',jsonb_build_array(jsonb_build_object('method','totp','timestamp',extract(epoch from now())))
)::text,true);
do $$ declare users jsonb; begin
 users:=public.community_admin_users('kitchen_friend',0);
 if jsonb_array_length(users->'items')<>1 then raise exception 'Admin user search should return the matching user'; end if;
 if users->'items'->0->>'email'<>'saved-user@example.invalid' then raise exception 'Admin user screen must identify the account email'; end if;
 if users->'items'->0->>'username'<>'kitchen_friend' then raise exception 'Admin user screen must include the username'; end if;
end $$;
select pg_temp.must_reject($q$select public.community_admin_users('',-1)$q$);
select pg_temp.must_reject($q$select public.community_admin_users(repeat('x',101),0)$q$);
select pg_temp.must_reject($q$select public.community_saved_recipes_set('natural-toothpaste','invented','Recipe',true)$q$);
rollback;
