-- Repeatable. Apply after community-safeguards.sql. No administrator is granted here.
begin;
create table if not exists public.community_admins (
 user_id uuid primary key references auth.users on delete cascade,
 label text not null check(char_length(btrim(label)) between 3 and 100),
 enabled boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.community_admin_audit (
 id uuid primary key default gen_random_uuid(),
 actor uuid references auth.users on delete set null,
 action text not null, kind text not null, content_id uuid,
 subject_user uuid references auth.users on delete set null,
 note text not null, created_at timestamptz not null default now()
);
create table if not exists public.community_report_reviews (
 kind text not null check(kind in ('recipe','comment')), content_id uuid not null,
 reviewed_at timestamptz not null default now(), primary key(kind,content_id)
);
create index if not exists admin_audit_actor_time on public.community_admin_audit(actor,created_at);
alter table public.community_admins enable row level security;
alter table public.community_admin_audit enable row level security;
alter table public.community_report_reviews enable row level security;
revoke all on public.community_admins,public.community_admin_audit,public.community_report_reviews from public,anon,authenticated;
alter table public.community_recipes add column if not exists admin_removed_at timestamptz;
alter table public.community_comments add column if not exists admin_removed_at timestamptz;
create or replace function public.community_admin_identity() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_admins a join auth.users u on u.id=a.user_id
 where a.user_id=auth.uid() and a.enabled and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
 and (u.banned_until is null or u.banned_until<=now())
 and not exists(select 1 from public.community_account_controls c where c.user_id=u.id and (c.suspended or c.deletion_requested_at is not null)));
$$;
-- Membership can be checked before MFA solely to start enrollment. No queues
-- or private photos are exposed by this bootstrap check.
create or replace function public.community_admin_mfa_state() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not public.community_admin_identity() then raise exception 'Administrator access required.' using errcode='42501'; end if;
 return jsonb_build_object('reviewer',(select label from public.community_admins where user_id=auth.uid()));
end $$;
create or replace function public.community_is_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select public.community_admin_identity()
 and coalesce(auth.jwt()->>'aal','aal1')='aal2'
 and exists(select 1 from auth.mfa_factors where user_id=auth.uid() and factor_type='totp' and status='verified')
 and exists(select 1 from auth.sessions where id=(auth.jwt()->>'session_id')::uuid and user_id=auth.uid())
 and exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) a
  where a->>'method'='totp' and to_timestamp((a->>'timestamp')::double precision)>now()-interval '8 hours'
  and to_timestamp((a->>'timestamp')::double precision)<=now()+interval '1 minute');
$$;
create or replace function public.community_admin_photo_allowed(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select public.community_is_admin() and exists(select 1 from public.community_recipes where p_path=any(photo_paths));
$$;
drop policy if exists recipe_photos_admin_select on storage.objects;
create policy recipe_photos_admin_select on storage.objects for select to authenticated
 using(bucket_id='recipe-photos' and public.community_admin_photo_allowed(name));
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
  if kind not in ('recipe','comment') or filter not in ('pending','approved','rejected','reported','trash','all') then raise exception 'Invalid queue.'; end if;
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
   perform public.community_moderate(kind,target,decision,note,reviewer,coalesce(p_payload->>'qualifications',''),coalesce(p_payload->>'sources',''));
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
create or replace function public.community_admin_content_cleanup() returns trigger
language plpgsql security definer set search_path='' as $$
declare content_kind text:=case when TG_TABLE_NAME='community_comments' then 'comment' else 'recipe' end;
begin
 delete from public.community_report_reviews v where v.kind=content_kind and content_id=OLD.id;
 delete from public.community_admin_audit v where v.kind=content_kind and content_id=OLD.id;
 return OLD;
end $$;
drop trigger if exists admin_comment_cleanup on public.community_comments;
create trigger admin_comment_cleanup before delete on public.community_comments for each row execute function public.community_admin_content_cleanup();
drop trigger if exists admin_recipe_cleanup on public.community_recipes;
create trigger admin_recipe_cleanup before delete on public.community_recipes for each row execute function public.community_admin_content_cleanup();
revoke all on function public.community_admin_identity(),public.community_admin_mfa_state(),public.community_is_admin(),public.community_admin_photo_allowed(text),public.community_admin(text,jsonb),public.community_admin_content_cleanup() from public,anon,authenticated;
grant execute on function public.community_admin_mfa_state(),public.community_is_admin(),public.community_admin_photo_allowed(text),public.community_admin(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
