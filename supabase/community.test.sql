-- Disposable database only. Fixtures roll back, never use a live project.
begin;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
 ('00000000-0000-0000-0000-000000000001','first@example.invalid',now(),false),
 ('00000000-0000-0000-0000-000000000002','second@example.invalid',now(),false),
 ('00000000-0000-0000-0000-000000000003','unverified@example.invalid',null,false),
 ('00000000-0000-0000-0000-000000000004','anonymous@example.invalid',now(),true),
 ('00000000-0000-0000-0000-000000000005','third@example.invalid',now(),false);
create function pg_temp.expect_error(statement text, expected text) returns void language plpgsql as $$
begin
 begin execute statement;
 exception when others then
  if position(expected in sqlerrm) > 0 then return; end if;
  raise exception 'Wrong error: %', sqlerrm;
 end;
 raise exception 'Expected error: %', expected;
end $$;
create function pg_temp.check_true(result boolean, message text) returns void language plpgsql as $$
begin if result is distinct from true then raise exception 'FAILED: %', message; end if; end $$;

set local role anon;
select pg_temp.check_true((select count(*) = 0 from public.community_list('natural-toothpaste')), 'Guests can read');
select pg_temp.expect_error('select * from public.community_comments', 'permission denied');
select pg_temp.expect_error('select * from public.community_profiles', 'permission denied');
select pg_temp.expect_error('select * from public.community_votes', 'permission denied');
select pg_temp.expect_error('select * from public.community_reports', 'permission denied');
select pg_temp.expect_error('select public.community_post(''natural-toothpaste'',''guest'')', 'permission denied');
select pg_temp.expect_error('select public.community_limit(null,''post'',5)', 'permission denied');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.expect_error('select public.community_set_profile(''Unverified'')', 'verified email');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
select pg_temp.expect_error('select public.community_set_profile(''Anonymous'')', 'verified email');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.expect_error('select public.community_set_profile('' '')', 'nickname');
select public.community_set_profile('First member');
select pg_temp.expect_error('select public.community_post(''natural-toothpaste'','' '')', 'between 1 and 1000');
select pg_temp.expect_error('select public.community_post(''unknown-product'',''Test'')', 'foreign key');
select public.community_post('natural-toothpaste','A community suggestion') as comment_id \gset
select pg_temp.check_true((select count(*) = 0 from public.community_list('natural-shampoo')), 'Products are isolated');
select pg_temp.expect_error('insert into public.community_votes values(null,null)', 'permission denied');
select pg_temp.expect_error(format('select public.community_vote(%L,true)', :'comment_id'), 'own comment');
reset role;
-- A historical self-vote must not appear in public totals or selected state.
insert into public.community_votes values(:'comment_id','00000000-0000-0000-0000-000000000001');
set local role authenticated;
select pg_temp.check_true((select votes=0 and not upvoted from public.community_list('natural-toothpaste') where id=:'comment_id'),'Historical self-votes ignored');
select public.community_vote(:'comment_id',false);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select public.community_set_profile('Second member');
select public.community_vote(:'comment_id',true);
select public.community_vote(:'comment_id',true);
select pg_temp.check_true((select votes=1 and not mine and upvoted from public.community_list('natural-toothpaste') where id=:'comment_id'),'Other user vote is idempotent');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',true);
select public.community_vote(:'comment_id',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select pg_temp.check_true((select votes=2 and not mine and upvoted from public.community_list('natural-toothpaste') where id=:'comment_id'),'Independent account votes');
select pg_temp.expect_error(format('select public.community_delete(%L)', :'comment_id'), 'own comments');
select public.community_report(:'comment_id','Unsafe advice');
select public.community_report(:'comment_id','Unsafe advice');
select pg_temp.check_true((select reported from public.community_list('natural-toothpaste') where id = :'comment_id'), 'Reports are idempotent');
select public.community_vote(:'comment_id',false);
select pg_temp.check_true((select votes = 1 and not upvoted from public.community_list('natural-toothpaste') where id = :'comment_id'), 'Remove own vote');
select public.community_post('natural-toothpaste','Newer zero-vote comment');
select pg_temp.check_true((select id = :'comment_id' from public.community_list('natural-toothpaste') limit 1), 'Rank by votes');
reset role;
select pg_temp.check_true((select count(*) = 1 from public.community_reports), 'One report per account');
update public.community_comments set hidden = true where id = :'comment_id';
set local role authenticated;
select pg_temp.check_true((select count(*) = 1 from public.community_list('natural-toothpaste')), 'Hidden comment removed');
select pg_temp.expect_error(format('select public.community_vote(%L,true)', :'comment_id'), 'unavailable');
reset role;
update public.community_comments set hidden = false where id = :'comment_id';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.community_delete(:'comment_id');
reset role;
select pg_temp.check_true((select count(*) = 0 from public.community_votes), 'Votes cascade on deletion');
select pg_temp.check_true((select count(*) = 0 from public.community_reports), 'Reports cascade on deletion');
set local role authenticated;
select public.community_post('natural-shampoo','Rate limit 1');
select public.community_post('natural-shampoo','Rate limit 2');
select public.community_post('natural-shampoo','Rate limit 3');
select public.community_post('natural-shampoo','Rate limit 4');
select pg_temp.expect_error('select public.community_post(''natural-shampoo'',''Too many'')', 'Too many actions');
reset role;
-- Preload the rate-limit window to test each SQL guard without 60 UI requests.
insert into public.community_actions(user_id,kind)
 select '00000000-0000-0000-0000-000000000002','vote' from generate_series(1,60);
insert into public.community_actions(user_id,kind)
 select '00000000-0000-0000-0000-000000000002','report' from generate_series(1,10);
insert into public.community_actions(user_id,kind)
 select '00000000-0000-0000-0000-000000000002','profile' from generate_series(1,10);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select id as remaining_comment from public.community_list('natural-shampoo') limit 1 \gset
select pg_temp.expect_error(format('select public.community_vote(%L,true)', :'remaining_comment'), 'Too many actions');
select pg_temp.expect_error(format('select public.community_report(%L,''Spam or abuse'')', :'remaining_comment'), 'Too many actions');
select pg_temp.expect_error('select public.community_set_profile(''Changed'')', 'Too many actions');
reset role;
rollback;
\echo 'Community authorization, isolation, ranking, duplicate votes, reports, deletion, and post limits passed.'
