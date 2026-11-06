begin;
create function pg_temp.must_reject(q text) returns void language plpgsql as $$
begin begin execute q; exception when others then return; end; raise exception 'Expected rejection: %',q; end $$;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('aa110000-0000-0000-0000-000000000001','activity-admin@example.invalid',now(),'{"private":"never expose"}'),
 ('aa110000-0000-0000-0000-000000000002','activity-reporter@example.invalid',now(),'{}'),
 ('aa110000-0000-0000-0000-000000000003','activity-author@example.invalid',now(),'{}'),
 ('aa110000-0000-0000-0000-000000000004','activity-observer@example.invalid',now(),'{}'),
 ('aa110000-0000-0000-0000-000000000005','activity-pending@example.invalid',null,'{}');
insert into public.community_admins(user_id,label) values('aa110000-0000-0000-0000-000000000001','Activity admin');
insert into auth.mfa_factors values('aa120000-0000-0000-0000-000000000001','aa110000-0000-0000-0000-000000000001','totp','verified');
insert into auth.sessions values('aa130000-0000-0000-0000-000000000001','aa110000-0000-0000-0000-000000000001');
insert into public.community_profiles(user_id,nickname,username,bio) values('aa110000-0000-0000-0000-000000000003','ActivityAuthor','ActivityAuthor','Fixture author');
insert into public.community_builtin_recipes(id,product_id,title,is_active) values('builtin:activity','natural-glass-cleaner','Activity catalogue',true);
insert into public.community_recipes(id,product_id,user_id,title,ingredients,instructions,storage_notes,cautions,status,review_record) values
 ('aa140000-0000-0000-0000-000000000001','natural-glass-cleaner','aa110000-0000-0000-0000-000000000003','Activity one','Water and soap','Mix carefully','Store safely','Do not eat','approved','{"reviewer":"Fixture","note":"Reviewed","reviewed_at":"2026-11-06T00:00:00Z"}'),
 ('aa140000-0000-0000-0000-000000000002','natural-toothpaste','aa110000-0000-0000-0000-000000000003','Activity two','Water and soap','Mix carefully','Store safely','Do not eat','approved','{"reviewer":"Fixture","note":"Reviewed","reviewed_at":"2026-11-06T00:00:00Z"}');
select set_config('request.jwt.claim.sub','aa110000-0000-0000-0000-000000000002',true);
select public.recipe_concern_submit('natural-glass-cleaner','aa140000-0000-0000-0000-000000000001','Other','Please review this fixture');
select public.recipe_concern_submit('natural-glass-cleaner','builtin:activity','Other','Catalogue fixture concern');
insert into public.recipe_votes(recipe_id,user_id,value) values('aa140000-0000-0000-0000-000000000002','aa110000-0000-0000-0000-000000000002',-1);
set local role anon;
select pg_temp.must_reject($q$select public.community_admin_user_directory()$q$);
select pg_temp.must_reject($q$select public.community_admin_user_activity('aa110000-0000-0000-0000-000000000002')$q$);
select pg_temp.must_reject($q$select public.community_admin_restore_exclusion('aa110000-0000-0000-0000-000000000002','activity-reporter@example.invalid','contributor',null,null,'aa110000-0000-0000-0000-000000000003','User requested')$q$);
set local role authenticated;
select pg_temp.must_reject($q$select public.community_admin_user_directory()$q$);
select pg_temp.must_reject($q$select public.community_admin_user_activity('aa110000-0000-0000-0000-000000000002')$q$);
select pg_temp.must_reject($q$select public.community_admin_restore_exclusion('aa110000-0000-0000-0000-000000000002','activity-reporter@example.invalid','contributor',null,null,'aa110000-0000-0000-0000-000000000003','User requested')$q$);
select pg_temp.must_reject($q$select * from public.community_admin_exclusion_rows('aa110000-0000-0000-0000-000000000002')$q$);
select set_config('request.jwt.claim.sub','aa110000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
select pg_temp.must_reject($q$select public.community_admin_user_directory()$q$);
select pg_temp.must_reject($q$select public.community_admin_user_activity('aa110000-0000-0000-0000-000000000002')$q$);
select pg_temp.must_reject($q$select public.community_admin_restore_exclusion('aa110000-0000-0000-0000-000000000002','activity-reporter@example.invalid','recipe','natural-glass-cleaner','builtin:activity',null,'User requested')$q$);
select set_config('request.jwt.claims',jsonb_build_object('aal','aal2','session_id','aa130000-0000-0000-0000-000000000001','amr',jsonb_build_array(jsonb_build_object('method','totp','timestamp',extract(epoch from now()))))::text,true);
do $$ declare result jsonb; section text; begin
 result:=public.community_admin_user_directory('activity-',0,'all');
 if (result->>'total')::int<>5 or jsonb_array_length(result->'items')<>5 then raise exception 'Directory incomplete'; end if;
 if result::text like '%raw_user_meta_data%' or result::text like '%never expose%' then raise exception 'Private Auth metadata leaked'; end if;
 if (public.community_admin_user_directory('activity-',0,'pending')->>'total')::int<>1 then raise exception 'Unverified accounts missing'; end if;
 if (public.community_admin_user_directory('activity-',0,'excluded')->>'total')::int<>1 then raise exception 'Exclusion filter incorrect'; end if;
 if jsonb_array_length(public.community_admin_user_directory('activity-',20,'all')->'items')<>0 then raise exception 'Pagination ignored'; end if;
 result:=public.community_admin_user_activity('aa110000-0000-0000-0000-000000000002');
 if result->'stats'->>'hidden_recipes'<>'3' or result->'stats'->>'votes'<>'1' or result->'stats'->>'downvotes'<>'1' or result->'stats'->>'reports'<>'2' then raise exception 'Incorrect stats: %',result; end if;
 foreach section in array array['recipes','votes','reports','exclusions','saves','comments','terms','audit'] loop
 result:=public.community_admin_user_activity('aa110000-0000-0000-0000-000000000002',section);
 if result->>'section'<>section or result->>'limit'<>'20' then raise exception 'Section failed: %',section; end if;
 end loop;
 result:=public.community_admin_user_activity('aa110000-0000-0000-0000-000000000002','exclusions');
 if (select count(*) from jsonb_array_elements(result->'items') e where e->>'scope'='contributor' and e->>'affected_recipes'='2')<>2 then raise exception 'Contributor scope missing'; end if;
end $$;
reset role;
insert into auth.users(id,email,email_confirmed_at) select md5('activity-page-'||n)::uuid,'activity-page-'||n||'@example.invalid',now() from generate_series(1,21)n;
set local role authenticated;
do $$ declare first_page jsonb; second_page jsonb; begin
 first_page:=public.community_admin_user_directory('activity-page-',0,'all');
 second_page:=public.community_admin_user_directory('activity-page-',20,'all');
 if first_page->>'total'<>'21' or jsonb_array_length(first_page->'items')<>20 or jsonb_array_length(second_page->'items')<>1 then raise exception 'Directory pagination unbounded or incomplete'; end if;
 if exists(select 1 from jsonb_array_elements(first_page->'items')a join jsonb_array_elements(second_page->'items')b on a->>'user_id'=b->>'user_id') then raise exception 'Directory pages overlap'; end if;
end $$;
select pg_temp.must_reject($q$select public.community_admin_user_activity('aa110000-0000-0000-0000-000000000002','invalid')$q$);
select pg_temp.must_reject($q$select public.community_admin_user_directory('',-1,'all')$q$);
select pg_temp.must_reject($q$select public.community_admin_restore_exclusion('aa110000-0000-0000-0000-000000000002','wrong@example.invalid','recipe','natural-glass-cleaner','builtin:activity',null,'User requested')$q$);
select pg_temp.must_reject($q$select public.community_admin_restore_exclusion('aa110000-0000-0000-0000-000000000002','activity-reporter@example.invalid','recipe','natural-glass-cleaner','builtin:activity',null,'')$q$);
select pg_temp.must_reject($q$select public.community_admin_restore_exclusion('aa110000-0000-0000-0000-000000000002','activity-reporter@example.invalid','recipe','natural-glass-cleaner','aa140000-0000-0000-0000-000000000001',null,'User requested')$q$);
select public.community_admin_restore_exclusion('aa110000-0000-0000-0000-000000000002','activity-reporter@example.invalid','recipe','natural-glass-cleaner','builtin:activity',null,'Reporter requested correction');
do $$ declare result jsonb; begin
 result:=public.community_admin_restore_exclusion('aa110000-0000-0000-0000-000000000002','activity-reporter@example.invalid','contributor',null,null,'aa110000-0000-0000-0000-000000000003','Reporter requested correction');
 if result->>'affected_recipes'<>'2' or result->>'restored'<>'true' then raise exception 'Contributor restore incorrect: %',result; end if;
 result:=public.community_admin_restore_exclusion('aa110000-0000-0000-0000-000000000002','activity-reporter@example.invalid','contributor',null,null,'aa110000-0000-0000-0000-000000000003','Retry after timeout');
 if result->>'restored'<>'false' then raise exception 'Retry not idempotent'; end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from public.community_admin_audit where subject_user='aa110000-0000-0000-0000-000000000002' and action='personal_visibility_restored')<>2 then raise exception 'Missing/duplicated audit'; end if;
 if (select count(*) from public.recipe_concerns where user_id='aa110000-0000-0000-0000-000000000002' and reviewed_at is null)<>2 then raise exception 'Restore changed concerns'; end if;
 if exists(select 1 from public.community_saved_recipes where user_id='aa110000-0000-0000-0000-000000000002') then raise exception 'Bookmarks recreated'; end if;
end $$;
select set_config('request.jwt.claim.sub','aa110000-0000-0000-0000-000000000002',true);
do $$ begin
 if not public.community_recipe_visible('natural-glass-cleaner','builtin:activity') or not public.community_author_visible('aa110000-0000-0000-0000-000000000003') then raise exception 'Personal visibility not restored'; end if;
 if not exists(select 1 from public.recipe_list('natural-toothpaste') where id='aa140000-0000-0000-0000-000000000002') then raise exception 'Cross-guide restore failed'; end if;
 perform public.recipe_concern_submit('natural-glass-cleaner','aa140000-0000-0000-0000-000000000001','Other','Duplicate retry');
 if not public.community_author_visible('aa110000-0000-0000-0000-000000000003') then raise exception 'Duplicate report undid explicit restoration'; end if;
end $$;
set local role authenticated;
select pg_temp.must_reject($q$select public.community_recipe_hide('natural-glass-cleaner','builtin:activity',false,'aa110000-0000-0000-0000-000000000002')$q$);
reset role;
-- Migration reapplication must not replay historic reports after an admin restore.
\ir ../permanent-recipe-exclusions.sql
\ir ../signup-integrity.sql
\ir ../session-account-state.sql
\ir ../admin-user-activity.sql
do $$ begin
 if exists(select 1 from public.community_recipe_visibility where user_id='aa110000-0000-0000-0000-000000000002') or exists(select 1 from public.community_blocks where user_id='aa110000-0000-0000-0000-000000000002') then raise exception 'Migration replay reversed restoration'; end if;
end $$;
-- A contributor with no remaining recipes must still be visible/restorable to admins.
insert into public.community_blocks(user_id,blocked_user,label) values('aa110000-0000-0000-0000-000000000002','aa110000-0000-0000-0000-000000000004','No remaining recipes');
select set_config('request.jwt.claim.sub','aa110000-0000-0000-0000-000000000001',false);
select set_config('request.jwt.claims',jsonb_build_object('aal','aal2','session_id','aa130000-0000-0000-0000-000000000001','amr',jsonb_build_array(jsonb_build_object('method','totp','timestamp',extract(epoch from now()))))::text,false);
set role authenticated;
do $$ declare result jsonb; begin
 result:=public.community_admin_user_activity('aa110000-0000-0000-0000-000000000002','exclusions');
 if result->>'total'<>'1' or result->'stats'->>'hidden_recipes'<>'0' or result->'items'->0->>'scope'<>'contributor' then raise exception 'Empty contributor exclusion lost: %',result; end if;
 perform public.community_admin_restore_exclusion('aa110000-0000-0000-0000-000000000002','activity-reporter@example.invalid','contributor',null,null,'aa110000-0000-0000-0000-000000000004','User requested empty contributor restore');
end $$;
reset role;
-- Re-exclude, archive globally, restore personally: global removal must survive.
select public.community_exclude_recipe('aa110000-0000-0000-0000-000000000002','natural-glass-cleaner','aa140000-0000-0000-0000-000000000001','blocked');
update public.community_recipes set admin_removed_at=now() where id='aa140000-0000-0000-0000-000000000001';
select set_config('request.jwt.claim.sub','aa110000-0000-0000-0000-000000000001',false);
select set_config('request.jwt.claims',jsonb_build_object('aal','aal2','session_id','aa130000-0000-0000-0000-000000000001','amr',jsonb_build_array(jsonb_build_object('method','totp','timestamp',extract(epoch from now()))))::text,false);
set role authenticated;
select public.community_admin_restore_exclusion('aa110000-0000-0000-0000-000000000002','activity-reporter@example.invalid','contributor',null,null,'aa110000-0000-0000-0000-000000000003','Restore personal preference only');
reset role;
select set_config('request.jwt.claim.sub','aa110000-0000-0000-0000-000000000002',false);
do $$ begin
 if exists(select 1 from public.recipe_list('natural-glass-cleaner') where id='aa140000-0000-0000-0000-000000000001') then raise exception 'Restore republished globally removed recipe'; end if;
end $$;
select set_config('request.jwt.claim.sub','aa110000-0000-0000-0000-000000000004',false);
do $$ begin
 if not exists(select 1 from public.recipe_list('natural-toothpaste') where id='aa140000-0000-0000-0000-000000000002') then raise exception 'Observer changed'; end if;
end $$;
insert into public.community_account_controls(user_id,deletion_requested_at) values('aa110000-0000-0000-0000-000000000002',now());
select set_config('request.jwt.claim.sub','aa110000-0000-0000-0000-000000000001',false);
set role authenticated;
select pg_temp.must_reject($q$select public.community_admin_restore_exclusion('aa110000-0000-0000-0000-000000000002','activity-reporter@example.invalid','recipe','natural-glass-cleaner','builtin:activity',null,'Pending deletion')$q$);
reset role;
delete from auth.sessions where id='aa130000-0000-0000-0000-000000000001';
set role authenticated;
select pg_temp.must_reject($q$select public.community_admin_user_activity('aa110000-0000-0000-0000-000000000002')$q$);
select pg_temp.must_reject($q$select public.community_admin_user_directory()$q$);
select pg_temp.must_reject($q$select public.community_admin_restore_exclusion('aa110000-0000-0000-0000-000000000002','activity-reporter@example.invalid','recipe','natural-glass-cleaner','builtin:activity',null,'Revoked session')$q$);
reset role;
delete from auth.users where id='aa110000-0000-0000-0000-000000000002';
do $$ begin
 if exists(select 1 from public.community_admin_audit where action='personal_visibility_restored' and subject_user='aa110000-0000-0000-0000-000000000002') then raise exception 'Deleted user activity retained'; end if;
end $$;
-- Migrations above commit; explicitly remove all synthetic test fixtures.
delete from auth.users where email like 'activity-%@example.invalid';
delete from public.community_builtin_recipes where id='builtin:activity';
