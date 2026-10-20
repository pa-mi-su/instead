-- Disposable database only. Run after builtin-recipe-admin.sql.
begin;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
 ('82000000-0000-0000-0000-000000000001','builtin-admin@example.invalid',now(),false),
 ('82000000-0000-0000-0000-000000000002','builtin-user@example.invalid',now(),false);
insert into public.community_admins(user_id,label)
 values('82000000-0000-0000-0000-000000000001','Built-in recipe editor');
insert into auth.mfa_factors values('83000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001','totp','verified');
insert into auth.sessions values('84000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001');
create function pg_temp.check_true(result boolean,message text) returns void language plpgsql as $$
begin if result is distinct from true then raise exception 'FAILED: %',message; end if; end $$;
set local role anon;
select pg_temp.check_true(jsonb_typeof(public.builtin_recipe_catalog())='array','Public recipe catalog is available');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','82000000-0000-0000-0000-000000000002',true);
select pg_temp.check_true(jsonb_array_length(public.builtin_recipe_catalog())=0,'No managed recipe overrides are exposed initially');
do $$ begin
 begin perform public.community_builtin_admin('list');
 exception when others then return;
 end;
 raise exception 'Non-admin listed managed recipes';
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('aal','aal2','session_id','84000000-0000-0000-0000-000000000001','amr',jsonb_build_array(jsonb_build_object('method','totp','timestamp',extract(epoch from now()))))::text,true);
set local role authenticated;
select set_config('request.jwt.claim.sub','82000000-0000-0000-0000-000000000001',true);
select public.community_admin_mfa_state();
select public.community_builtin_admin('save',jsonb_build_object(
 'id','builtin:glassCleanerRecipe','product_id','natural-glass-cleaner','note','Corrected wording after source review',
 'recipe',jsonb_build_object('name','Updated glass cleaner','ingredients',jsonb_build_array('One measured ingredient'),'equipment','[]'::jsonb,'instructions',jsonb_build_array('Mix and use carefully.'),'storage','Prepare fresh.','cautions','Avoid eyes and test surfaces.')
));
select pg_temp.check_true(exists(select 1 from jsonb_array_elements(public.builtin_recipe_catalog()) as rows(value)
 where value->>'id'='builtin:glassCleanerRecipe' and value->>'title'='Updated glass cleaner'),'Built-in edit appears in public recipe catalog');
select public.community_builtin_admin('save',jsonb_build_object(
 'id','admin:82000000-0000-0000-0000-000000000003','product_id','natural-glass-cleaner','note','Added reviewed recipe',
 'recipe',jsonb_build_object('name','New managed cleaner','ingredients',jsonb_build_array('One ingredient'),'equipment','[]'::jsonb,'instructions',jsonb_build_array('Use as directed.'),'storage','Prepare fresh.','cautions','Test a small area.')
));
select pg_temp.check_true(exists(select 1 from public.builtin_recipe_rating('natural-glass-cleaner','admin:82000000-0000-0000-0000-000000000003') where score=0),'New managed recipe can be rated');
select public.community_builtin_admin('set_active',jsonb_build_object('id','admin:82000000-0000-0000-0000-000000000003','active',false,'note','Archive for testing'));
select pg_temp.check_true(exists(select 1 from jsonb_array_elements(public.builtin_recipe_catalog()) as rows(value)
 where value->>'id'='admin:82000000-0000-0000-0000-000000000003' and value->>'is_active'='false' and value->'recipe_content'='null'::jsonb),'Archive hides its content from app clients');
select public.community_builtin_admin('set_active',jsonb_build_object('id','admin:82000000-0000-0000-0000-000000000003','active',true,'note','Restore after testing'));
reset role;
select pg_temp.check_true((select count(*)=4 from public.community_builtin_recipe_audit),'Create, edit, archive, and restore are audited');
rollback;
\echo 'Built-in recipe editing, creation, app publishing, archive and audit passed.'
