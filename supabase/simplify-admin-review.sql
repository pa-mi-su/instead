-- Repeatable. Apply after community-safeguards.sql and admin-panel.sql.
-- Removes obsolete reviewer-qualification/source fields, and sends rejected submissions directly to Trash.
begin;
alter table public.community_moderation_audit drop column if exists qualifications;
alter table public.community_moderation_audit drop column if exists sources;
update public.community_recipes
 set review_record=review_record-'qualifications'-'sources'
 where review_record ? 'qualifications' or review_record ? 'sources';
update public.community_comments
 set review_record=review_record-'qualifications'-'sources'
 where review_record ? 'qualifications' or review_record ? 'sources';
update public.community_recipes set admin_removed_at=coalesce(admin_removed_at,clock_timestamp()) where status='rejected';
update public.community_comments set admin_removed_at=coalesce(admin_removed_at,clock_timestamp()),hidden=true where moderation_status='rejected';
drop function if exists public.community_moderate(text,uuid,text,text,text,text,text);
create or replace function public.community_review_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare approved boolean; record jsonb;
begin
 if TG_TABLE_NAME='community_comments' then approved:=NEW.moderation_status='approved'; else approved:=NEW.status='approved'; end if;
 record:=NEW.review_record;
 if TG_TABLE_NAME='community_recipes' then
  if approved and exists(select 1 from unnest(NEW.photo_paths) p where p like NEW.user_id::text||'/%')
  then raise exception 'Legacy photo paths require migration before publication.'; end if;
 end if;
 if approved and (record is null or coalesce(length(btrim(record->>'reviewer')),0)<3
 or coalesce(length(btrim(record->>'note')),0)<3 or record->>'reviewed_at' is null)
 then raise exception 'Approval requires a named reviewer and documented review.'; end if;
 return NEW;
end $$;
drop trigger if exists community_comment_review_guard on public.community_comments;
create trigger community_comment_review_guard before insert or update on public.community_comments for each row execute function public.community_review_guard();
drop trigger if exists community_recipe_review_guard on public.community_recipes;
create trigger community_recipe_review_guard before insert or update on public.community_recipes for each row execute function public.community_review_guard();
drop function if exists public.community_moderate(text,uuid,text,text,text,text,text);
create or replace function public.community_moderate(p_kind text,p_content uuid,p_decision text,p_note text,p_reviewer text) returns void
language plpgsql security definer set search_path='' as $$
declare review jsonb;
begin
 if p_decision is null or p_decision not in ('approved','rejected') or p_note is null or char_length(btrim(p_note)) not between 3 and 2000
 or p_reviewer is null or char_length(btrim(p_reviewer)) not between 3 and 200
 then raise exception 'Provide a valid decision, reviewer, and reason.'; end if;
 review:=jsonb_build_object('reviewer',btrim(p_reviewer),'note',btrim(p_note),'reviewed_at',now());
 if p_kind='comment' then update public.community_comments set moderation_status=p_decision,review_record=review where id=p_content;
 elsif p_kind='recipe' then update public.community_recipes set status=p_decision,moderation_note=p_note,review_record=review where id=p_content and status<>'withdrawn';
 else raise exception 'Choose comment or recipe.'; end if;
 if not found then raise exception 'Content is unavailable.'; end if;
 insert into public.community_moderation_audit(kind,content_id,decision,note,reviewer)
 values(p_kind,p_content,p_decision,p_note,p_reviewer);
end $$;
revoke all on function public.community_moderate(text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.community_moderate(text,uuid,text,text,text) to service_role;
create or replace function public.community_admin(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); reviewer text; kind text; target uuid; subject uuid; note text;
 filter text; offset_n integer; search text; items jsonb; decision text; cutoff timestamptz;
begin
 if not public.community_is_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>12000 then raise exception 'Invalid request.'; end if;
 select label into reviewer from public.community_admins where user_id=actor;
 if p_action='state' then
  return jsonb_build_object('reviewer',reviewer,'pending_recipes',(select count(*) from public.community_recipes where status='pending' and admin_removed_at is null),
   'pending_comments',(select count(*) from public.community_comments where moderation_status='pending' and not hidden and admin_removed_at is null),
   'restricted_accounts',(select count(*) from public.community_account_controls where suspended),
   'deletion_requests',(select count(*) from public.community_account_controls where deletion_requested_at is not null));
 end if;
 if p_action='queue' then
  kind:=coalesce(p_payload->>'kind','recipe'); filter:=coalesce(p_payload->>'filter','pending');
  if kind not in ('recipe','comment') or filter not in ('pending','approved','reported','trash','all') then raise exception 'Invalid queue.'; end if;
  offset_n:=coalesce((p_payload->>'offset')::integer,0); search:=coalesce(p_payload->>'search','');
  if offset_n<0 or offset_n>100000 or length(search)>100 then raise exception 'Invalid page or search.'; end if;
  if kind='recipe' then
   select coalesce(jsonb_agg(to_jsonb(q)),'[]') into items from (
    select r.id,r.product_id,r.user_id,r.title,r.ingredients,r.instructions,r.storage_notes,r.cautions,r.source,r.photo_paths,r.status,r.created_at,r.admin_removed_at,r.moderation_note,
     coalesce(c.suspended,false) as suspended,c.deletion_requested_at,
     (select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select reason,count(*) as count,max(created_at) as created_at from public.recipe_reports where recipe_id=r.id group by reason) x) as reports,
     (select count(*) from public.recipe_reports x where x.recipe_id=r.id and x.created_at>coalesce(v.reviewed_at,'-infinity'::timestamptz)) as open_reports
    from public.community_recipes r left join public.community_account_controls c on c.user_id=r.user_id
    left join public.community_report_reviews v on v.kind='recipe' and v.content_id=r.id
    where (search='' or r.title ilike '%'||search||'%' or r.product_id ilike '%'||search||'%') and
     case when filter='trash' then r.admin_removed_at is not null
      when filter='reported' then r.admin_removed_at is null and exists(select 1 from public.recipe_reports x where x.recipe_id=r.id and x.created_at>coalesce(v.reviewed_at,'-infinity'::timestamptz))
      when filter='all' then r.admin_removed_at is null
      else r.admin_removed_at is null and r.status=filter end
    order by r.created_at asc,r.id limit 20 offset offset_n
   ) q;
  else
   select coalesce(jsonb_agg(to_jsonb(q)),'[]') into items from (
    select r.id,r.product_id,r.recipe_key,coalesce((select title from public.community_builtin_recipes where id=r.recipe_key),(select title from public.community_recipes where id::text=r.recipe_key),'Earlier product discussion') as recipe_title,r.user_id,r.body,r.moderation_status as status,r.created_at,r.hidden,r.admin_removed_at,
     coalesce(c.suspended,false) as suspended,c.deletion_requested_at,
     (select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select reason,count(*) as count,max(created_at) as created_at from public.community_reports where comment_id=r.id group by reason) x) as reports,
     (select count(*) from public.community_reports x where x.comment_id=r.id and x.created_at>coalesce(v.reviewed_at,'-infinity'::timestamptz)) as open_reports
    from public.community_comments r left join public.community_account_controls c on c.user_id=r.user_id
    left join public.community_report_reviews v on v.kind='comment' and v.content_id=r.id
    where (search='' or r.body ilike '%'||search||'%' or r.product_id ilike '%'||search||'%') and
     case when filter='trash' then r.admin_removed_at is not null
      when filter='reported' then r.admin_removed_at is null and exists(select 1 from public.community_reports x where x.comment_id=r.id and x.created_at>coalesce(v.reviewed_at,'-infinity'::timestamptz))
      when filter='all' then r.admin_removed_at is null
      else r.admin_removed_at is null and r.moderation_status=filter end
    order by r.created_at asc,r.id limit 20 offset offset_n
   ) q;
  end if;
  return jsonb_build_object('items',items,'offset',offset_n);
 end if;
 offset_n:=coalesce((p_payload->>'offset')::integer,0);
 if offset_n<0 or offset_n>100000 then raise exception 'Invalid page.'; end if;
 if p_action='accounts' then
  select coalesce(jsonb_agg(to_jsonb(q)),'[]') into items from (
   select c.user_id,c.suspended,c.deletion_requested_at,
    (select count(*) from public.community_comments where user_id=c.user_id) as comments,
    (select count(*) from public.community_recipes where user_id=c.user_id) as recipes
   from public.community_account_controls c where c.suspended or c.deletion_requested_at is not null
   order by c.deletion_requested_at nulls last,c.user_id limit 20 offset offset_n
  ) q;
  return jsonb_build_object('items',items);
 end if;
 if p_action='audit' then
  select coalesce(jsonb_agg(to_jsonb(q)),'[]') into items from (
   select a.action,a.kind,a.content_id,a.subject_user,a.note,a.created_at from public.community_admin_audit a order by a.created_at desc,a.id desc limit 20 offset offset_n
  ) q;
  return jsonb_build_object('items',items);
 end if;
 if p_action not in ('moderate','remove','restore','restrict','resolve_reports') then raise exception 'Unknown action.'; end if;
 note:=btrim(coalesce(p_payload->>'note',''));
 if length(note) not between 3 and 2000 then raise exception 'Enter a review reason (3–2000 characters).'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,129));
 if (select count(*) from public.community_admin_audit where community_admin_audit.actor=auth.uid() and created_at>now()-interval '1 hour')>=240 then raise exception 'Admin action limit reached. Try later.'; end if;
 kind:=p_payload->>'kind'; target:=(p_payload->>'id')::uuid;
 if p_action='restrict' then
  subject:=(p_payload->>'user_id')::uuid;
  if subject is null or not exists(select 1 from auth.users where id=subject) then raise exception 'Account unavailable.'; end if;
  if exists(select 1 from public.community_admins where user_id=subject and enabled) then raise exception 'Admin accounts cannot be restricted here.'; end if;
  if jsonb_typeof(p_payload->'suspended') is distinct from 'boolean' then raise exception 'Choose a restriction state.'; end if;
  insert into public.community_account_controls(user_id,suspended) values(subject,(p_payload->>'suspended')::boolean)
   on conflict(user_id) do update set suspended=excluded.suspended;
  kind:='account'; target:=null;
 else
  if kind='recipe' then select user_id into subject from public.community_recipes where id=target for update;
  elsif kind='comment' then select user_id into subject from public.community_comments where id=target for update;
  else raise exception 'Choose recipe or comment.'; end if;
  if subject is null then raise exception 'Content unavailable.'; end if;
  if p_action='moderate' then
   if (kind='recipe' and exists(select 1 from public.community_recipes where id=target and (admin_removed_at is not null or status='withdrawn')))
    or (kind='comment' and exists(select 1 from public.community_comments where id=target and admin_removed_at is not null)) then raise exception 'Restore removed content before reviewing it.'; end if;
   decision:=p_payload->>'decision';
   if decision='approved' and coalesce(p_payload->>'reviewed','false')<>'true' then raise exception 'Confirm review of the full text and every photo.'; end if;
   if kind='recipe' and decision='approved' and exists(
    select 1 from public.community_recipes r cross join lateral unnest(r.photo_paths) p
    where r.id=target and not exists(select 1 from storage.objects o where o.bucket_id='recipe-photos' and o.name=p)
   ) then raise exception 'A submitted photo is unavailable. Keep pending or ask the owner to resubmit.'; end if;
   perform public.community_moderate(kind,target,decision,note,reviewer);
   if decision='rejected' then
    if kind='recipe' then update public.community_recipes set admin_removed_at=clock_timestamp() where id=target;
    else update public.community_comments set admin_removed_at=clock_timestamp(),hidden=true where id=target; end if;
   end if;
   if kind='comment' and decision='approved' then update public.community_comments set hidden=false where id=target; end if;
  elsif p_action='remove' then
   if kind='recipe' and exists(select 1 from public.community_recipes where id=target and status='withdrawn' and admin_removed_at is null)
   then raise exception 'The author withdrew this recipe. It cannot be restored by admin.'; end if;
   if kind='recipe' then update public.community_recipes set admin_removed_at=now(),status='withdrawn',moderation_note=note where id=target;
   else update public.community_comments set admin_removed_at=now(),hidden=true where id=target; end if;
  elsif p_action='restore' then
   if kind='recipe' then update public.community_recipes set admin_removed_at=null,status='pending',review_record=null where id=target and admin_removed_at is not null;
   else update public.community_comments set admin_removed_at=null,hidden=false,moderation_status='pending',review_record=null where id=target and admin_removed_at is not null; end if;
   if not found then raise exception 'Content is not in admin trash.'; end if;
  elsif p_action='resolve_reports' then
   cutoff:=(p_payload->>'report_cutoff')::timestamptz;
   if cutoff is null or cutoff>clock_timestamp() then raise exception 'Refresh reports before marking them reviewed.'; end if;
   if (kind='recipe' and not exists(select 1 from public.recipe_reports where recipe_id=target and created_at=cutoff))
    or (kind='comment' and not exists(select 1 from public.community_reports where comment_id=target and created_at=cutoff)) then raise exception 'Report snapshot unavailable. Refresh the queue.'; end if;
   insert into public.community_report_reviews values(kind,target,cutoff) on conflict on constraint community_report_reviews_pkey do update set reviewed_at=greatest(public.community_report_reviews.reviewed_at,excluded.reviewed_at);
  end if;
 end if;
 insert into public.community_admin_audit(actor,action,kind,content_id,subject_user,note) values(actor,p_action,kind,target,subject,note);
 return jsonb_build_object('ok',true);
end $$;
notify pgrst,'reload schema';
commit;
