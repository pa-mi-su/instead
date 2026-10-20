-- Disposable database only. Never run fixtures against the hosted project.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('30000000-0000-0000-0000-000000000001','safety-a@example.invalid',now()),
 ('30000000-0000-0000-0000-000000000002','safety-b@example.invalid',now()),
 ('30000000-0000-0000-0000-000000000003','safety-c@example.invalid',now());
create function pg_temp.must_reject(q text) returns void language plpgsql as $$
begin
 begin execute q; exception when others then return; end;
 raise exception 'Expected rejection: %',q;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select pg_temp.must_reject($q$select public.community_post('natural-glass-cleaner','I use a clean cloth.')$q$);
select pg_temp.must_reject($q$select public.community_accept_policy('outdated')$q$);
select public.community_accept_policy('2026-10-16.2');
select public.community_accept_policy('2026-10-16.2');
select public.community_post('natural-glass-cleaner','I use a clean cloth.');
select public.recipe_submit('natural-glass-cleaner','Water wipe','Water and a cloth','Wipe the glass','Prepare fresh','Check glass compatibility');
do $$ begin
 if (select count(*) from public.community_list('natural-glass-cleaner'))<>1 then raise exception 'Author cannot see pending comment'; end if;
 if (select moderation_status from public.community_list('natural-glass-cleaner'))<>'pending' then raise exception 'Comment not pending'; end if;
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
select public.community_accept_policy('2026-10-16.2');
do $$ begin
 if exists(select 1 from public.community_list('natural-glass-cleaner')) then raise exception 'Pending comment leaked'; end if;
 if exists(select 1 from public.recipe_list('natural-glass-cleaner')) then raise exception 'Pending recipe leaked'; end if;
end $$;
reset role;
do $$ declare cid uuid; rid uuid; newer uuid; first_id uuid; begin
 select id into cid from public.community_comments where user_id='30000000-0000-0000-0000-000000000001';
 select id into rid from public.community_recipes where user_id='30000000-0000-0000-0000-000000000001';
 perform pg_temp.must_reject(format('update public.community_comments set moderation_status=%L where id=%L','approved',cid));
 perform public.community_moderate('comment',cid,'approved','Checked non-medical, compatible cleaning experience','Local test moderator');
 perform public.community_moderate('recipe',rid,'approved','Checked non-medical cleaning method','Local test moderator');
 insert into public.community_recipes(product_id,user_id,title,ingredients,instructions,storage_notes,cautions)
 values('natural-glass-cleaner','30000000-0000-0000-0000-000000000001','Newer zero-vote recipe','Exact ingredients','Safe steps','Store dry','Check surface compatibility') returning id into newer;
 perform public.community_moderate('recipe',newer,'approved','Reviewed a second non-medical cleaning method','Local test moderator');
 update public.community_recipes set created_at=now()+interval '1 second' where id=newer;
 if (select count(*) from public.recipe_list('natural-glass-cleaner'))<>2
  or exists(select 1 from public.recipe_list('natural-glass-cleaner') where score<>0)
 then raise exception 'Approved recipes with zero votes must remain in the public list at score zero'; end if;
 select id into first_id from public.recipe_list('natural-glass-cleaner') limit 1;
 if first_id<>newer then raise exception 'Zero-vote recipes must rank by recency when their scores tie'; end if;
 insert into public.community_photo_folders(user_id,folder_id) values('30000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001');
 insert into storage.objects(bucket_id,name) values('recipe-photos','50000000-0000-0000-0000-000000000001/safety.jpg');
 update public.community_recipes set photo_paths=array['50000000-0000-0000-0000-000000000001/safety.jpg'] where id=rid;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select pg_temp.must_reject($q$select public.recipe_vote((select id from public.recipe_list('natural-glass-cleaner')),1::smallint)$q$);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
select public.community_block('comment',(select id from public.community_list('natural-glass-cleaner')));
do $$ begin
 if exists(select 1 from public.community_list('natural-glass-cleaner')) then raise exception 'Blocked comment visible'; end if;
 if exists(select 1 from public.recipe_list('natural-glass-cleaner')) then raise exception 'Blocked recipe visible'; end if;
 if public.recipe_photo_readable('50000000-0000-0000-0000-000000000001/safety.jpg') then raise exception 'Blocked photo readable'; end if;
 if (select count(*) from public.community_blocks_list())<>1 then raise exception 'Block not manageable'; end if;
end $$;
select pg_temp.must_reject($q$select public.community_moderate('comment',gen_random_uuid(),'approved','Forged review','Fake reviewer')$q$);
select pg_temp.must_reject($q$select * from public.community_policy_acceptances$q$);
select public.community_unblock((select id from public.community_blocks_list()));
do $$ begin
 if (select count(*) from public.community_list('natural-glass-cleaner'))<>1 then raise exception 'Unblock failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
do $$ begin if exists(select 1 from public.community_blocks_list()) then raise exception 'Private block leaked'; end if; end $$;
select public.community_accept_policy('2026-10-16.2');
select public.recipe_submit('natural-cough-comfort','Test cough remedy','Test ingredients','Test instructions','Test storage','Test cautions');
reset role;
do $$ declare rid uuid; begin
 select id into rid from public.community_recipes where user_id='30000000-0000-0000-0000-000000000003';
 perform public.community_moderate('recipe',rid,'approved','Admin reviewed the full recipe','Local test moderator');
 if not exists(select 1 from public.community_recipes where id=rid and status='approved' and review_record ? 'reviewer' and not review_record ? 'qualifications' and not review_record ? 'sources')
 then raise exception 'Health-topic approval should record the admin review without qualification or evidence fields'; end if;
 if (select count(*) from public.community_policy_acceptances where user_id='30000000-0000-0000-0000-000000000001')<>1 then raise exception 'Acceptance duplicate'; end if;
end $$;
insert into public.community_account_controls(user_id,suspended) values('30000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select pg_temp.must_reject($q$select public.community_post('natural-glass-cleaner','Suspended write')$q$);
select public.community_request_deletion();
select public.community_request_deletion();
select pg_temp.must_reject($q$select public.community_accept_policy('2026-10-16.2')$q$);
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
do $$ begin
 if exists(select 1 from public.community_list('natural-glass-cleaner')) or exists(select 1 from public.recipe_list('natural-glass-cleaner')) then raise exception 'Suspended/deleting author still public'; end if;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.must_reject($q$select public.community_accept_policy('2026-10-16.2')$q$);
select pg_temp.must_reject($q$select * from public.community_deletion_queue()$q$);
reset role;
rollback;
