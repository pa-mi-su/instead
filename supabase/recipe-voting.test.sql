-- Run in a disposable local database after recipe-voting.sql.
begin;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
 ('81000000-0000-0000-0000-000000000001','recipe-voter@example.invalid',now(),false);
create function pg_temp.check_true(result boolean,message text) returns void language plpgsql as $$
begin if result is distinct from true then raise exception 'FAILED: %',message; end if; end $$;
create function pg_temp.expect_error(statement text,expected text) returns void language plpgsql as $$
begin
 begin execute statement;
 exception when others then
  if position(expected in sqlerrm)>0 then return; end if;
  raise exception 'Wrong error: %',sqlerrm;
 end;
 raise exception 'Expected error: %',expected;
end $$;
set local role anon;
select pg_temp.check_true((select score=0 and upvotes=0 and downvotes=0 and my_vote=0
 from public.builtin_recipe_rating('natural-glass-cleaner','builtin:glassCleanerRecipe')),'Guests can read an empty recipe rating');
select pg_temp.expect_error($q$select public.builtin_recipe_vote('natural-glass-cleaner','builtin:glassCleanerRecipe',1::smallint)$q$,'permission denied');
select pg_temp.expect_error($q$select * from public.community_list('natural-glass-cleaner')$q$,'permission denied');
select pg_temp.expect_error($q$select * from public.recipe_comments_list('natural-glass-cleaner','builtin:glassCleanerRecipe')$q$,'permission denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000001',true);
select pg_temp.expect_error($q$select public.community_post('natural-glass-cleaner','A new comment')$q$,'permission denied');
select pg_temp.expect_error($q$select public.recipe_comment_post('natural-glass-cleaner','builtin:glassCleanerRecipe','A new comment')$q$,'permission denied');
select pg_temp.expect_error($q$select public.community_vote('00000000-0000-0000-0000-000000000001',true)$q$,'permission denied');
select pg_temp.expect_error($q$select public.builtin_recipe_vote('natural-glass-cleaner','builtin:glassCleanerRecipe',1::smallint)$q$,'current community terms');
select public.community_accept_policy('2026-10-19.1');
select pg_temp.expect_error($q$select public.builtin_recipe_vote('natural-toothpaste','builtin:glassCleanerRecipe',1::smallint)$q$,'unavailable');
select public.builtin_recipe_vote('natural-glass-cleaner','builtin:glassCleanerRecipe',1::smallint);
select public.builtin_recipe_vote('natural-glass-cleaner','builtin:glassCleanerRecipe',1::smallint);
select pg_temp.check_true((select score=1 and upvotes=1 and downvotes=0 and my_vote=1
 from public.builtin_recipe_rating('natural-glass-cleaner','builtin:glassCleanerRecipe')),'Duplicate upvote is idempotent');
select public.builtin_recipe_vote('natural-glass-cleaner','builtin:glassCleanerRecipe',(-1)::smallint);
select pg_temp.check_true((select score=-1 and upvotes=0 and downvotes=1 and my_vote=-1
 from public.builtin_recipe_rating('natural-glass-cleaner','builtin:glassCleanerRecipe')),'Vote direction can change');
select public.builtin_recipe_vote('natural-glass-cleaner','builtin:glassCleanerRecipe',0::smallint);
select pg_temp.check_true((select score=0 and my_vote=0
 from public.builtin_recipe_rating('natural-glass-cleaner','builtin:glassCleanerRecipe')),'Vote can be removed');
reset role;
rollback;
\echo 'Built-in recipe rating visibility, authorization, scope, vote switching, and removal passed.'
