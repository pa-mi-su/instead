-- Disposable local database only; all fixtures are rolled back.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('aa000000-0000-0000-0000-000000000001','delete-admin@example.invalid',now()),
 ('aa000000-0000-0000-0000-000000000002','delete-target@example.invalid',now()),
 ('aa000000-0000-0000-0000-000000000003','other-admin@example.invalid',now());
insert into public.community_admins(user_id,label,enabled) values
 ('aa000000-0000-0000-0000-000000000001','Deletion test admin',true),
 ('aa000000-0000-0000-0000-000000000003','Disabled test admin',false);
insert into auth.mfa_factors values('ab000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000001','totp','verified');
insert into auth.sessions values('ac000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000001');
insert into public.community_profiles(user_id,nickname,username,bio) values
 ('aa000000-0000-0000-0000-000000000002','Target','DeleteTarget','Test bio');
insert into public.community_recipes(id,product_id,user_id,title,ingredients,instructions,storage_notes,cautions) values
 ('ad000000-0000-0000-0000-000000000001','natural-glass-cleaner','aa000000-0000-0000-0000-000000000002','Deletion fixture','Test ingredients','Test instructions','Test storage','Test cautions');
insert into public.recipe_votes(recipe_id,user_id,value) values
 ('ad000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000001',1);
insert into public.recipe_reports(recipe_id,user_id,reason) values
 ('ad000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000001','Other');
insert into public.community_saved_guides(user_id,product_id) values
 ('aa000000-0000-0000-0000-000000000002','natural-glass-cleaner');
insert into public.community_saved_recipes(user_id,product_id,recipe_id,recipe_title) values
 ('aa000000-0000-0000-0000-000000000002','natural-glass-cleaner','test-recipe','Test recipe');
insert into public.community_comments(id,product_id,user_id,body) values
 ('ae000000-0000-0000-0000-000000000001','natural-glass-cleaner','aa000000-0000-0000-0000-000000000002','Legacy comment');
insert into public.community_policy_acceptances(user_id,version) values
 ('aa000000-0000-0000-0000-000000000002','test');
insert into public.community_photo_folders(user_id) values
 ('aa000000-0000-0000-0000-000000000002');
create function pg_temp.must_reject(q text) returns void language plpgsql as $$
begin begin execute q; exception when others then return; end; raise exception 'Expected rejection: %',q; end $$;
set local role anon;
select pg_temp.must_reject($q$select public.community_admin_prepare_deletion('aa000000-0000-0000-0000-000000000002','delete-target@example.invalid','Delete test account')$q$);
set local role authenticated;
select set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000002',true);
-- A normal verified account must still be able to upload after this migration.
insert into storage.objects(bucket_id,name) values('profile-avatars','aa000000-0000-0000-0000-000000000002/avatar.png');
select pg_temp.must_reject($q$select public.community_admin_prepare_deletion('aa000000-0000-0000-0000-000000000002','delete-target@example.invalid','Delete test account')$q$);
select set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
select pg_temp.must_reject($q$select public.community_admin_prepare_deletion('aa000000-0000-0000-0000-000000000002','delete-target@example.invalid','Delete test account')$q$);
select set_config('request.jwt.claims',jsonb_build_object('aal','aal2','session_id','ac000000-0000-0000-0000-000000000001','amr',jsonb_build_array(jsonb_build_object('method','totp','timestamp',extract(epoch from now()))))::text,true);
select pg_temp.must_reject($q$select public.community_admin_prepare_deletion('aa000000-0000-0000-0000-000000000001','delete-admin@example.invalid','Delete self')$q$);
select pg_temp.must_reject($q$select public.community_admin_prepare_deletion('aa000000-0000-0000-0000-000000000003','other-admin@example.invalid','Delete admin')$q$);
select pg_temp.must_reject($q$select public.community_admin_prepare_deletion('aa000000-0000-0000-0000-000000000002','wrong@example.invalid','Delete target')$q$);
select pg_temp.must_reject($q$select public.community_admin_prepare_deletion('aa000000-0000-0000-0000-000000000002','delete-target@example.invalid',' ' )$q$);
select public.community_admin_prepare_deletion('aa000000-0000-0000-0000-000000000002','delete-target@example.invalid','Delete test account');
reset role;
do $$ begin
 if not exists(select 1 from public.community_account_controls where user_id='aa000000-0000-0000-0000-000000000002' and deletion_requested_at is not null) then raise exception 'Deletion must hide target immediately'; end if;
 if not exists(select 1 from public.community_admin_audit where subject_user='aa000000-0000-0000-0000-000000000002' and action='permanent_deletion_requested' and note='Delete test account') then raise exception 'Missing deletion audit'; end if;
 if not exists(select 1 from auth.users where id='aa000000-0000-0000-0000-000000000002') then raise exception 'Auth must remain until storage cleanup'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000002',true);
select pg_temp.must_reject($q$insert into storage.objects(bucket_id,name) values('profile-avatars','aa000000-0000-0000-0000-000000000002/avatar.jpeg')$q$);
reset role;
delete from auth.users where id='aa000000-0000-0000-0000-000000000002';
do $$ begin
 if exists(select 1 from public.community_account_controls where user_id='aa000000-0000-0000-0000-000000000002') then raise exception 'Account controls must cascade'; end if;
 if exists(select 1 from public.community_profiles where user_id='aa000000-0000-0000-0000-000000000002')
 or exists(select 1 from public.community_recipes where user_id='aa000000-0000-0000-0000-000000000002')
 or exists(select 1 from public.community_comments where user_id='aa000000-0000-0000-0000-000000000002')
 or exists(select 1 from public.community_saved_guides where user_id='aa000000-0000-0000-0000-000000000002')
 or exists(select 1 from public.community_saved_recipes where user_id='aa000000-0000-0000-0000-000000000002')
 or exists(select 1 from public.community_policy_acceptances where user_id='aa000000-0000-0000-0000-000000000002')
 or exists(select 1 from public.community_photo_folders where user_id='aa000000-0000-0000-0000-000000000002')
 or exists(select 1 from public.recipe_votes where recipe_id='ad000000-0000-0000-0000-000000000001')
 or exists(select 1 from public.recipe_reports where recipe_id='ad000000-0000-0000-0000-000000000001')
 then raise exception 'Personal data must cascade on Auth deletion'; end if;
 if not exists(select 1 from auth.users where id='aa000000-0000-0000-0000-000000000001') then raise exception 'Admin must remain'; end if;
 if not exists(select 1 from public.community_admin_audit where action='permanent_deletion_requested' and subject_user is null) then raise exception 'Audit must retain action without deleted account link'; end if;
end $$;
rollback;
