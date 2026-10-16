-- Run in a disposable local database after community.sql and recipes.sql.
begin;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
 ('00000000-0000-0000-0000-000000000001','one@example.invalid',now(),false),
 ('00000000-0000-0000-0000-000000000002','two@example.invalid',now(),false),
 ('00000000-0000-0000-0000-000000000003','unverified@example.invalid',null,false);
create function pg_temp.check_true(result boolean,message text) returns void language plpgsql as $$ begin if result is distinct from true then raise exception 'FAILED: %',message; end if; end $$;
create function pg_temp.expect_error(statement text,expected text) returns void language plpgsql as $$
begin begin execute statement; exception when others then if position(expected in sqlerrm)>0 then return; end if; raise exception 'Wrong error: %',sqlerrm; end; raise exception 'Expected error: %',expected; end $$;
set local role anon;
select pg_temp.check_true((select count(*)=0 from public.recipe_list('natural-shampoo')), 'Guest empty list');
select pg_temp.expect_error('select * from public.community_recipes','permission denied');
select pg_temp.expect_error('select public.recipe_submit(''natural-shampoo'',''Title'',''Amount'',''Steps'',''Storage'',''Caution'')','permission denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.expect_error('select public.recipe_submit(''natural-shampoo'',''Title'',''Amount'',''Steps'',''Storage'',''Caution'')','verified email');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
insert into storage.objects(bucket_id,name) values('recipe-photos','00000000-0000-0000-0000-000000000001/example.jpg');
select public.recipe_submit('natural-shampoo','My recipe','One exact amount','Example instructions','Review storage','Review cautions','',array['00000000-0000-0000-0000-000000000001/example.jpg']) as recipe_id \gset
select pg_temp.check_true((select count(*)=1 from public.recipe_list('natural-shampoo',true)), 'Owner sees pending recipe');
select pg_temp.check_true((select count(*)=0 from public.recipe_list('natural-shampoo')), 'Pending excluded from public list');
select pg_temp.expect_error(format('select public.recipe_vote(%L,1::smallint)', :'recipe_id'),'unavailable');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select pg_temp.check_true((select count(*)=0 from public.recipe_list('natural-shampoo',true)), 'Other account cannot see pending');
select pg_temp.check_true((select count(*)=0 from storage.objects), 'Other account cannot read pending photos');
select pg_temp.expect_error('select public.recipe_submit(''natural-shampoo'',''My recipe'',''One amount'',''Steps'',''Store'',''Caution'','''',array[''00000000-0000-0000-0000-000000000001/example.jpg''])', 'photo is unavailable');
select pg_temp.expect_error(format('select public.recipe_withdraw(%L)', :'recipe_id'),'own recipes');
select pg_temp.expect_error('insert into storage.objects(bucket_id,name) values(''recipe-photos'',''00000000-0000-0000-0000-000000000001/stolen.jpg'')', 'row-level security');
reset role;
update public.community_recipes set status='approved' where id=:'recipe_id';
set local role anon;
select pg_temp.check_true((select count(*)=1 from public.recipe_list('natural-shampoo')), 'Published visible');
select pg_temp.check_true((select count(*)=1 from storage.objects), 'Approved photo readable');
select pg_temp.check_true((select count(*)=0 from public.recipe_list('natural-toothpaste')), 'Product isolation');
reset role;
set local role authenticated;
select public.recipe_vote(:'recipe_id',1::smallint);
select public.recipe_vote(:'recipe_id',1::smallint);
select pg_temp.check_true((select score=1 and upvotes=1 and downvotes=0 from public.recipe_list('natural-shampoo')), 'Duplicate upvote ignored');
select public.recipe_vote(:'recipe_id',(-1)::smallint);
select pg_temp.check_true((select score=-1 and upvotes=0 and downvotes=1 from public.recipe_list('natural-shampoo')), 'Switch vote');
select public.recipe_vote(:'recipe_id',0::smallint);
select pg_temp.check_true((select score=0 from public.recipe_list('natural-shampoo')), 'Remove vote');
select public.recipe_report(:'recipe_id','Unsafe advice');
select public.recipe_report(:'recipe_id','Unsafe advice');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.recipe_withdraw(:'recipe_id');
delete from storage.objects where bucket_id='recipe-photos' and name='00000000-0000-0000-0000-000000000001/example.jpg';
select pg_temp.check_true((select count(*)=0 from public.recipe_list('natural-shampoo')), 'Withdrawn not public');
select public.recipe_submit('natural-shampoo','Limit two','One amount','Steps','Store','Caution');
select public.recipe_submit('natural-shampoo','Limit three','One amount','Steps','Store','Caution');
select pg_temp.expect_error('select public.recipe_submit(''natural-shampoo'',''Limit four'',''One amount'',''Steps'',''Store'',''Caution'')','Too many actions');
reset role;
rollback;
\echo 'Recipe moderation, photo permissions, ownership, votes, withdrawal, and rate limits passed.'
