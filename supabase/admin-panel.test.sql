-- Disposable local database only; all fixtures are rolled back.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('60000000-0000-0000-0000-000000000001','admin@example.invalid',now()),
 ('60000000-0000-0000-0000-000000000002','contributor@example.invalid',now()),
 ('60000000-0000-0000-0000-000000000003','not-admin@example.invalid',now()),
 ('60000000-0000-0000-0000-000000000004','unconfirmed@example.invalid',null);
insert into public.community_admins(user_id,label) values
 ('60000000-0000-0000-0000-000000000001','Test moderator'),
 ('60000000-0000-0000-0000-000000000004','Unverified moderator');
insert into auth.mfa_factors values('64000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','totp','verified');
insert into auth.sessions values('65000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001');
select set_config('request.jwt.claims',jsonb_build_object('aal','aal2','session_id','65000000-0000-0000-0000-000000000001','amr',jsonb_build_array(jsonb_build_object('method','totp','timestamp',extract(epoch from now()))))::text,true);
insert into public.community_recipes(id,product_id,user_id,title,ingredients,instructions,storage_notes,cautions,photo_paths) values
 ('61000000-0000-0000-0000-000000000001','natural-glass-cleaner','60000000-0000-0000-0000-000000000002','Window recipe','Test ingredients','Test instructions','Test storage','Test cautions',array['62000000-0000-0000-0000-000000000001/test.png']),
 ('61000000-0000-0000-0000-000000000002','natural-cough-comfort','60000000-0000-0000-0000-000000000002','Health recipe','Test ingredients','Test instructions','Test storage','Test cautions','{}');
insert into public.community_comments(id,product_id,user_id,body) values
 ('63000000-0000-0000-0000-000000000001','natural-glass-cleaner','60000000-0000-0000-0000-000000000002','Pending comment');
insert into storage.objects(bucket_id,name) values('recipe-photos','62000000-0000-0000-0000-000000000001/test.png');
create or replace function pg_temp.must_reject(q text) returns void language plpgsql as $$
begin begin execute q; exception when others then return; end; raise exception 'Expected rejection: %',q; end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000003',true);
select pg_temp.must_reject($q$select public.community_admin('state')$q$);
select pg_temp.must_reject($q$select public.community_admin('queue','{"kind":"recipe"}')$q$);
select pg_temp.must_reject($q$select public.community_admin('restrict','{"user_id":"60000000-0000-0000-0000-000000000002","suspended":true,"note":"Forged restriction"}')$q$);
select pg_temp.must_reject($q$select * from public.community_admins$q$);
select pg_temp.must_reject($q$insert into public.community_admins(user_id,label) values(auth.uid(),'Forged admin')$q$);
do $$ begin if exists(select 1 from storage.objects where name='62000000-0000-0000-0000-000000000001/test.png') then raise exception 'Pending photo leaked'; end if; end $$;
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000004',true);
select pg_temp.must_reject($q$select public.community_admin('state')$q$);
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
-- Owner membership alone must not unlock queues or pending photos.
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
select public.community_admin_mfa_state();
select pg_temp.must_reject($q$select public.community_admin('state')$q$);
select pg_temp.must_reject($q$select public.community_admin('restrict','{"user_id":"60000000-0000-0000-0000-000000000002","suspended":true,"note":"Email-only bypass"}')$q$);
do $$ begin if exists(select 1 from storage.objects where name='62000000-0000-0000-0000-000000000001/test.png') then raise exception 'Email-only admin saw pending photo'; end if; end $$;
select set_config('request.jwt.claims',jsonb_build_object('aal','aal2','session_id','65000000-0000-0000-0000-000000000001','amr',jsonb_build_array(jsonb_build_object('method','totp','timestamp',extract(epoch from now()-interval '9 hours'))))::text,true);
select pg_temp.must_reject($q$select public.community_admin('state')$q$);
select set_config('request.jwt.claims',jsonb_build_object('aal','aal2','session_id','65000000-0000-0000-0000-000000000001','amr',jsonb_build_array(jsonb_build_object('method','totp','timestamp',extract(epoch from now()))))::text,true);
do $$ begin
 if not public.community_is_admin() then raise exception 'Admin denied'; end if;
 if (public.community_admin('state')->>'pending_recipes')::int<>2 then raise exception 'Bad pending count'; end if;
 if jsonb_array_length(public.community_admin('queue','{"kind":"recipe"}')->'items')<>2 then raise exception 'Queue incomplete'; end if;
 if not exists(select 1 from storage.objects where name='62000000-0000-0000-0000-000000000001/test.png') then raise exception 'Admin cannot review pending photo'; end if;
end $$;
select pg_temp.must_reject($q$select public.community_admin('moderate','{"kind":"recipe","id":"61000000-0000-0000-0000-000000000001","decision":"approved","note":"Missing confirmation"}')$q$);
select public.community_admin('moderate','{"kind":"recipe","id":"61000000-0000-0000-0000-000000000001","decision":"approved","reviewed":true,"note":"Reviewed text and test photo"}');
select public.community_admin('moderate','{"kind":"comment","id":"63000000-0000-0000-0000-000000000001","decision":"approved","reviewed":true,"note":"Reviewed comment"}');
select pg_temp.must_reject($q$select public.community_admin('moderate','{"kind":"recipe","id":"61000000-0000-0000-0000-000000000002","decision":"approved","reviewed":true,"note":"Missing qualified review"}')$q$);
select pg_temp.must_reject($q$select public.community_moderate('recipe','61000000-0000-0000-0000-000000000002','approved','Bypass via helper','Forged reviewer','Forged qualifications','Forged source')$q$);
select public.community_admin('restrict','{"user_id":"60000000-0000-0000-0000-000000000002","suspended":true,"note":"Repeated unsafe advice"}');
select pg_temp.must_reject($q$select public.community_admin('restrict','{"user_id":"60000000-0000-0000-0000-000000000001","suspended":true,"note":"Self lockout"}')$q$);
select pg_temp.must_reject($q$select public.community_admin('queue','{"kind":"recipe","offset":-1}')$q$);
select pg_temp.must_reject($q$select public.community_admin('remove','{"kind":"other","id":"61000000-0000-0000-0000-000000000001","note":"Bad target"}')$q$);
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000002',true);
select pg_temp.must_reject($q$select public.community_post('natural-glass-cleaner','Suspended user post')$q$);
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if exists(select 1 from public.recipe_list('natural-glass-cleaner')) or exists(select 1 from public.community_list('natural-glass-cleaner')) then raise exception 'Restricted author public'; end if;
end $$;
select pg_temp.must_reject($q$select public.community_admin('state')$q$);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
select public.community_admin('restrict','{"user_id":"60000000-0000-0000-0000-000000000002","suspended":false,"note":"Restriction reviewed"}');
select public.community_admin('remove','{"kind":"recipe","id":"61000000-0000-0000-0000-000000000001","note":"Removed for further review"}');
select public.community_admin('remove','{"kind":"comment","id":"63000000-0000-0000-0000-000000000001","note":"Removed for further review"}');
do $$ begin
 if jsonb_array_length(public.community_admin('queue','{"kind":"recipe","filter":"trash"}')->'items')<>1 then raise exception 'Trash recipe missing'; end if;
 if jsonb_array_length(public.community_admin('queue','{"kind":"comment","filter":"trash"}')->'items')<>1 then raise exception 'Trash comment missing'; end if;
 if exists(select 1 from public.recipe_list('natural-glass-cleaner')) or exists(select 1 from public.community_list('natural-glass-cleaner')) then raise exception 'Removed content public'; end if;
end $$;
select public.community_admin('restore','{"kind":"recipe","id":"61000000-0000-0000-0000-000000000001","note":"Restored for fresh review"}');
select public.community_admin('restore','{"kind":"comment","id":"63000000-0000-0000-0000-000000000001","note":"Restored for fresh review"}');
select public.community_admin('moderate','{"kind":"recipe","id":"61000000-0000-0000-0000-000000000001","decision":"approved","reviewed":true,"note":"Reviewed again"}');
reset role;
insert into public.recipe_reports values('61000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000003','Unsafe advice',now()-interval '1 second');
set local role authenticated;
select public.community_admin('resolve_reports',jsonb_build_object('kind','recipe','id','61000000-0000-0000-0000-000000000001','note','Investigated report','report_cutoff',now()-interval '1 second'));
do $$ begin
 if jsonb_array_length(public.community_admin('queue','{"kind":"recipe","filter":"reported"}')->'items')<>0 then raise exception 'Report resolution failed'; end if;
 if jsonb_array_length(public.community_admin('audit')->'items')<8 then raise exception 'Missing audit evidence'; end if;
end $$;
reset role;
-- A report after the review must appear again (use current transaction time + 1s).
insert into public.recipe_reports values('61000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002','Other',now()+interval '1 second');
set local role authenticated;
do $$ begin if jsonb_array_length(public.community_admin('queue','{"kind":"recipe","filter":"reported"}')->'items')<>1 then raise exception 'New report suppressed'; end if; end $$;
reset role;
-- Missing photos and author withdrawals cannot be republished through admin.
update public.community_recipes set status='withdrawn' where id='61000000-0000-0000-0000-000000000002';
set local role authenticated;
select pg_temp.must_reject($q$select public.community_admin('remove','{"kind":"recipe","id":"61000000-0000-0000-0000-000000000002","note":"Override author withdrawal"}')$q$);
select public.community_admin('remove','{"kind":"recipe","id":"61000000-0000-0000-0000-000000000001","note":"Move to trash"}');
select public.community_admin('restore','{"kind":"recipe","id":"61000000-0000-0000-0000-000000000001","note":"Restore for review"}');
reset role;
delete from storage.objects where name='62000000-0000-0000-0000-000000000001/test.png';
set local role authenticated;
select pg_temp.must_reject($q$select public.community_admin('moderate','{"kind":"recipe","id":"61000000-0000-0000-0000-000000000001","decision":"approved","reviewed":true,"note":"Missing image"}')$q$);
reset role;
delete from auth.sessions where id='65000000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.must_reject($q$select public.community_admin('state')$q$);
reset role;
insert into auth.sessions values('65000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001');
update auth.mfa_factors set status='unverified';
set local role authenticated;
select pg_temp.must_reject($q$select public.community_admin('state')$q$);
reset role;
update auth.mfa_factors set status='verified';
update public.community_admins set enabled=false where user_id='60000000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.must_reject($q$select public.community_admin('state')$q$);
reset role;
delete from public.community_recipes where id='61000000-0000-0000-0000-000000000001';
do $$ begin if exists(select 1 from public.community_admin_audit where content_id='61000000-0000-0000-0000-000000000001') then raise exception 'Deleted content audit retained'; end if; end $$;
rollback;
