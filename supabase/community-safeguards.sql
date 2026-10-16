-- Apply after community.sql, recipes.sql and directory-topics.sql. Repeatable.
-- No content is deleted. Previously unreviewed content is held for moderation.
begin;
create table if not exists public.community_policy_acceptances (
 user_id uuid not null references auth.users on delete cascade,
 version text not null, accepted_at timestamptz not null default now(),
 primary key(user_id,version)
);
create table if not exists public.community_account_controls (
 user_id uuid primary key references auth.users on delete cascade,
 suspended boolean not null default false,
 deletion_requested_at timestamptz
);
create table if not exists public.community_blocks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users on delete cascade,
 blocked_user uuid not null references auth.users on delete cascade,
 label text not null, created_at timestamptz not null default now(),
 unique(user_id,blocked_user), check(user_id <> blocked_user)
);
create table if not exists public.community_photo_folders (
 user_id uuid primary key references auth.users on delete cascade,
 folder_id uuid not null unique default gen_random_uuid()
);
alter table public.community_photo_folders enable row level security;
revoke all on public.community_photo_folders from public,anon,authenticated;
create table if not exists public.community_moderation_audit (
 id uuid primary key default gen_random_uuid(), kind text not null,
 content_id uuid not null, decision text not null, note text not null,
 reviewer text not null, qualifications text not null, sources text not null,
 reviewed_at timestamptz not null default now()
);
alter table public.community_policy_acceptances enable row level security;
alter table public.community_account_controls enable row level security;
alter table public.community_blocks enable row level security;
alter table public.community_moderation_audit enable row level security;
revoke all on public.community_policy_acceptances,public.community_account_controls,public.community_blocks,public.community_moderation_audit from public,anon,authenticated;
alter table public.community_comments add column if not exists moderation_status text not null default 'pending' check(moderation_status in ('pending','approved','rejected'));
alter table public.community_comments add column if not exists review_record jsonb;
alter table public.community_recipes add column if not exists review_record jsonb;
-- Holding previously approved entries without an accountable review is deliberate.
update public.community_recipes set status='pending' where status='approved' and review_record is null;
create or replace function public.community_policy_version() returns text
language sql immutable set search_path='' as $$ select '2026-10-16.2'::text $$;
create or replace function public.community_require_user() returns uuid
language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid();
begin
 if who is null or not exists(select 1 from auth.users where id=who and email_confirmed_at is not null
 and email is not null and not coalesce(is_anonymous,false) and (banned_until is null or banned_until <= now()))
 then raise exception 'Sign in with an active verified email account.'; end if;
 if exists(select 1 from public.community_account_controls where user_id=who and (suspended or deletion_requested_at is not null))
 then raise exception 'Account contributions are unavailable. Contact support if needed.'; end if;
 return who;
end $$;
create or replace function public.community_require_contributor() returns uuid
language plpgsql security definer set search_path='' as $$
declare who uuid:=public.community_require_user();
begin
 if not exists(select 1 from public.community_policy_acceptances where user_id=who and version=public.community_policy_version())
 then raise exception 'Review and accept the current community terms before contributing.'; end if;
 return who;
end $$;
create or replace function public.community_author_visible(p_author uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=p_author and (banned_until is null or banned_until <= now()))
 and not exists(select 1 from public.community_account_controls where user_id=p_author and (suspended or deletion_requested_at is not null))
 and not exists(select 1 from public.community_blocks where user_id=auth.uid() and blocked_user=p_author);
$$;
create or replace function public.community_account_state()
returns table(policy_accepted boolean,suspended boolean,deletion_requested_at timestamptz)
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_policy_acceptances where user_id=auth.uid() and version=public.community_policy_version()),
 coalesce((select c.suspended from public.community_account_controls c where user_id=auth.uid()),false)
 or exists(select 1 from auth.users where id=auth.uid() and banned_until > now()),
 (select c.deletion_requested_at from public.community_account_controls c where user_id=auth.uid())
 where auth.uid() is not null;
$$;
create or replace function public.community_accept_policy(p_version text) returns void
language plpgsql security definer set search_path='' as $$
declare who uuid:=public.community_require_user();
begin
 if p_version is distinct from public.community_policy_version() then raise exception 'The terms changed. Update the app and review the current terms.'; end if;
 insert into public.community_policy_acceptances(user_id,version) values(who,p_version) on conflict do nothing;
end $$;
create or replace function public.community_request_deletion() returns void
language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid();
begin
 if who is null or not exists(select 1 from auth.users where id=who and email_confirmed_at is not null and not coalesce(is_anonymous,false))
 then raise exception 'Sign in to request deletion of your account.'; end if;
 insert into public.community_account_controls(user_id,deletion_requested_at) values(who,now())
 on conflict(user_id) do update set deletion_requested_at=coalesce(public.community_account_controls.deletion_requested_at,now());
end $$;
create or replace function public.community_block(p_kind text,p_content uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare who uuid:=public.community_require_user(); target uuid; display_label text; result uuid;
begin
 if p_kind='comment' then
  select user_id,'Comment: '||left(body,60) into target,display_label from public.community_comments
  where id=p_content and not hidden and moderation_status='approved';
 elsif p_kind='recipe' then
  select user_id,'Recipe: '||left(title,60) into target,display_label from public.community_recipes where id=p_content and status='approved';
 end if;
 if target is null or target=who then raise exception 'Contributor is unavailable.'; end if;
 select id into result from public.community_blocks where user_id=who and blocked_user=target;
 if result is not null then return result; end if;
 if not public.community_author_visible(target) then raise exception 'Contributor is unavailable.'; end if;
 perform public.community_limit(who,'block',30);
 if (select count(*) from public.community_blocks where user_id=who)>=200 then raise exception 'Block limit reached. Manage blocked contributors or contact support.'; end if;
 insert into public.community_blocks(user_id,blocked_user,label) values(who,target,display_label)
 on conflict(user_id,blocked_user) do update set label=excluded.label returning id into result;
 return result;
end $$;
create or replace function public.community_blocks_list()
returns table(id uuid,label text,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 select b.id,b.label,b.created_at from public.community_blocks b where b.user_id=auth.uid() order by b.created_at desc limit 200;
$$;
create or replace function public.community_unblock(p_block uuid) returns void
language plpgsql security definer set search_path='' as $$
declare who uuid:=public.community_require_user();
begin
 delete from public.community_blocks where id=p_block and user_id=who;
 if not found then raise exception 'Blocked contributor is unavailable.'; end if;
end $$;
-- Public comment reads include only approved, non-hidden, non-blocked content.
-- The author can also see their own pending/rejected comments without publishing them.
drop function public.community_list(text,integer);
create function public.community_list(p_product text,p_offset integer default 0)
returns table(id uuid,nickname text,body text,created_at timestamptz,votes bigint,upvoted boolean,mine boolean,reported boolean,moderation_status text)
language sql stable security definer set search_path='' as $$
 select c.id,'Community member'::text,c.body,c.created_at,
 (select count(*) from public.community_votes v where v.comment_id=c.id and v.user_id<>c.user_id),
 exists(select 1 from public.community_votes v where v.comment_id=c.id and v.user_id=auth.uid() and v.user_id<>c.user_id),
 coalesce(c.user_id=auth.uid(),false),exists(select 1 from public.community_reports r where r.comment_id=c.id and r.user_id=auth.uid()),c.moderation_status
 from public.community_comments c where c.product_id=p_product and not c.hidden
 and (c.moderation_status='approved' or c.user_id=auth.uid()) and public.community_author_visible(c.user_id)
 and p_offset between 0 and 10000
 order by 5 desc,c.created_at desc,c.id limit 50 offset greatest(0,least(p_offset,10000));
$$;
create or replace function public.recipe_list(p_product text,p_mine boolean default false,p_offset integer default 0)
returns table(id uuid,title text,ingredients text,instructions text,storage_notes text,cautions text,source text,
 photo_paths text[],status text,moderation_note text,created_at timestamptz,score bigint,upvotes bigint,downvotes bigint,my_vote smallint,mine boolean,reported boolean)
language sql stable security definer set search_path = '' as $$
 select r.id,r.title,r.ingredients,r.instructions,r.storage_notes,r.cautions,r.source,r.photo_paths,r.status,
 case when r.user_id=auth.uid() then r.moderation_note else '' end,r.created_at,
 coalesce((select sum(v.value) from public.recipe_votes v where v.recipe_id=r.id and v.user_id<>r.user_id),0),
 (select count(*) from public.recipe_votes v where v.recipe_id=r.id and v.user_id<>r.user_id and v.value=1),
 (select count(*) from public.recipe_votes v where v.recipe_id=r.id and v.user_id<>r.user_id and v.value=-1),
 coalesce((select value from public.recipe_votes v where v.recipe_id=r.id and v.user_id<>r.user_id and v.user_id=auth.uid()),0)::smallint,
 coalesce(r.user_id=auth.uid(),false),
 exists(select 1 from public.recipe_reports p where p.recipe_id=r.id and p.user_id=auth.uid())
 from public.community_recipes r where r.product_id=p_product and p_offset between 0 and 10000
 and public.community_author_visible(r.user_id)
 and case when p_mine then r.user_id=auth.uid() and r.status <> 'withdrawn' else r.status='approved' end
 order by 12 desc,r.created_at desc,r.id limit 20 offset greatest(0,least(p_offset,10000));
$$;
create or replace function public.recipe_submit(p_product text,p_title text,p_ingredients text,p_instructions text,p_storage text,p_cautions text,p_source text default '',p_photos text[] default '{}') returns uuid
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_contributor(); result uuid; photo text;
begin
 perform public.community_limit(who,'recipe',3);
 if p_photos is null or cardinality(p_photos)>3 or cardinality(p_photos)<>(select count(distinct x) from unnest(p_photos) x)
 then raise exception 'Choose up to three different photos.'; end if;
 foreach photo in array p_photos loop
  if not exists(select 1 from public.community_photo_folders where user_id=who and photo like folder_id::text||'/%') or not exists(select 1 from storage.objects where bucket_id='recipe-photos' and name=photo)
   or exists(select 1 from public.community_recipes where photo=any(photo_paths) and status <> 'withdrawn')
  then raise exception 'A photo is unavailable or belongs to another submission.'; end if;
 end loop;
 insert into public.community_recipes(product_id,user_id,title,ingredients,instructions,storage_notes,cautions,source,photo_paths)
 values(p_product,who,btrim(p_title),btrim(p_ingredients),btrim(p_instructions),btrim(p_storage),btrim(p_cautions),btrim(p_source),p_photos)
 returning id into result; return result;
end $$;
create or replace function public.recipe_vote(p_recipe uuid,p_value smallint) returns void
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_contributor(); old_value smallint;
begin
 perform pg_advisory_xact_lock(hashtextextended(who::text,0));
 if p_value is null or p_value not in (-1,0,1) then raise exception 'Choose upvote, downvote, or remove vote.'; end if;
 if not exists(select 1 from public.community_recipes where id=p_recipe and status='approved' and public.community_author_visible(user_id)) then raise exception 'Recipe is unavailable.'; end if;
 if p_value<>0 and exists(select 1 from public.community_recipes where id=p_recipe and user_id=who) then raise exception 'You cannot vote on your own recipe.'; end if;
 select value into old_value from public.recipe_votes where recipe_id=p_recipe and user_id=who;
 if coalesce(old_value,0)=p_value then return; end if;
 perform public.community_limit(who,'recipe_vote',60);
 if p_value=0 then delete from public.recipe_votes where recipe_id=p_recipe and user_id=who;
 else insert into public.recipe_votes values(p_recipe,who,p_value) on conflict(recipe_id,user_id) do update set value=excluded.value; end if;
end $$;
create or replace function public.recipe_withdraw(p_recipe uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_user(); photos text[];
begin
 update public.community_recipes set status='withdrawn' where id=p_recipe and user_id=who returning photo_paths into photos;
 if not found then raise exception 'You can only remove your own recipes.'; end if;
 delete from public.recipe_votes where recipe_id=p_recipe;
 return photos;
end $$;
create or replace function public.recipe_report(p_recipe uuid,p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_user();
begin
 perform pg_advisory_xact_lock(hashtextextended(who::text,0));
 if not exists(select 1 from public.community_recipes where id=p_recipe and status='approved' and public.community_author_visible(user_id)) then raise exception 'Recipe is unavailable.'; end if;
 if exists(select 1 from public.recipe_reports where recipe_id=p_recipe and user_id=who) then return; end if;
 perform public.community_limit(who,'recipe_report',10);
 insert into public.recipe_reports values(p_recipe,who,p_reason,now());
end $$;
create or replace function public.community_photo_folder() returns uuid
language plpgsql security definer set search_path='' as $$
declare who uuid:=public.community_require_contributor(); result uuid;
begin
 insert into public.community_photo_folders(user_id) values(who) on conflict do nothing;
 select folder_id into result from public.community_photo_folders where user_id=who;
 return result;
end $$;
create or replace function public.recipe_photo_owned(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (p_path like auth.uid()::text||'/%' or exists(
 select 1 from public.community_photo_folders where user_id=auth.uid() and p_path like folder_id::text||'/%'));
$$;
alter policy recipe_photos_select on storage.objects using(bucket_id='recipe-photos' and (public.recipe_photo_readable(name) or public.recipe_photo_owned(name)));
create or replace function public.recipe_photo_readable(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.community_recipes r where p_path = any(r.photo_paths)
 and (r.status = 'approved' and public.community_author_visible(r.user_id) or (r.user_id = auth.uid() and r.status <> 'withdrawn')));
$$;
create or replace function public.recipe_photo_uploadable(p_path text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_contributor(); folder uuid;
begin
 folder:=public.community_photo_folder();
 perform pg_advisory_xact_lock(hashtextextended(who::text,0));
 return p_path like folder::text || '/%' and p_path ~ '^[a-f0-9-]+/[a-zA-Z0-9-]+\.(jpg|png|webp)$'
 and (select count(*) from storage.objects o where bucket_id='recipe-photos' and (name like who::text || '/%' or name like folder::text || '/%')) < 100
 and (select count(*) from storage.objects o where bucket_id='recipe-photos' and (name like who::text || '/%' or name like folder::text || '/%')
 and not exists(select 1 from public.community_recipes r where o.name=any(r.photo_paths) and r.status <> 'withdrawn')) < 3;
end $$;
create or replace function public.community_post(p_product text,p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_contributor(); result uuid;
begin
 if char_length(btrim(p_body)) not between 1 and 1000 or p_body is null then raise exception 'Comments must be between 1 and 1000 characters.'; end if;
 perform public.community_limit(who,'post',5);
 insert into public.community_profiles values(who,'Community member') on conflict do nothing;
 insert into public.community_comments(product_id,user_id,body) values(p_product,who,btrim(p_body)) returning id into result;
 return result;
end $$;
create or replace function public.community_vote(p_comment uuid, p_upvoted boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_contributor(); folder uuid;
begin
 folder:=public.community_photo_folder();
 perform pg_advisory_xact_lock(hashtextextended(who::text, 0));
 if not exists(select 1 from public.community_comments where id = p_comment and not hidden and moderation_status='approved' and public.community_author_visible(user_id))
 then raise exception 'Comment is unavailable.'; end if;
 if p_upvoted is null then raise exception 'Choose a vote state.'; end if;
 if p_upvoted and exists(select 1 from public.community_comments where id=p_comment and user_id=who) then raise exception 'You cannot upvote your own comment.'; end if;
 if p_upvoted = exists(select 1 from public.community_votes where comment_id = p_comment and user_id = who)
 then return; end if;
 perform public.community_limit(who, 'vote', 60);
 if p_upvoted then
  insert into public.community_votes values(p_comment, who) on conflict do nothing;
 else delete from public.community_votes where comment_id = p_comment and user_id = who;
 end if;
end $$;
create or replace function public.community_report(p_comment uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_user();
begin
 perform pg_advisory_xact_lock(hashtextextended(who::text, 0));
 if not exists(select 1 from public.community_comments where id = p_comment and not hidden and moderation_status='approved' and public.community_author_visible(user_id))
 then raise exception 'Comment is unavailable.'; end if;
 if exists(select 1 from public.community_reports where comment_id = p_comment and user_id = who) then return; end if;
 perform public.community_limit(who, 'report', 10);
 insert into public.community_reports values(p_comment, who, p_reason, now());
end $$;

create or replace function public.recipe_photo_removable(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select public.recipe_photo_owned(p_path) and not exists(select 1 from public.community_recipes where p_path=any(photo_paths) and status<>'withdrawn');
$$;
-- An approval needs an accountable review record; health/personal-care topics also
-- need qualifications and sources. A moderator cannot assert clinical credentials
-- on behalf of someone who has not actually performed the review.
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
 if approved and NEW.product_id in ('natural-toothpaste','natural-shampoo','natural-body-soap','natural-deodorant','natural-skin-care','natural-sunburn-care','natural-bug-bite-care','natural-cough-comfort')
 and (coalesce(length(btrim(record->>'qualifications')),0)<3 or coalesce(length(btrim(record->>'sources')),0)<3)
 then raise exception 'Health and personal-care content requires qualified review and evidence sources before approval.'; end if;
 return NEW;
end $$;
drop trigger if exists community_comment_review_guard on public.community_comments;
create trigger community_comment_review_guard before insert or update on public.community_comments for each row execute function public.community_review_guard();
drop trigger if exists community_recipe_review_guard on public.community_recipes;
create trigger community_recipe_review_guard before insert or update on public.community_recipes for each row execute function public.community_review_guard();
create or replace function public.community_moderate(p_kind text,p_content uuid,p_decision text,p_note text,p_reviewer text,p_qualifications text default '',p_sources text default '') returns void
language plpgsql security definer set search_path='' as $$
declare review jsonb;
begin
 if p_decision is null or p_decision not in ('approved','rejected') or p_note is null or char_length(btrim(p_note)) not between 3 and 2000
 or p_reviewer is null or char_length(btrim(p_reviewer)) not between 3 and 200 or p_qualifications is null or length(p_qualifications)>2000 or p_sources is null or length(p_sources)>4000
 then raise exception 'Provide a valid decision, reviewer, and reason.'; end if;
 review:=jsonb_build_object('reviewer',btrim(p_reviewer),'note',btrim(p_note),'qualifications',btrim(p_qualifications),'sources',btrim(p_sources),'reviewed_at',now());
 if p_kind='comment' then update public.community_comments set moderation_status=p_decision,review_record=review where id=p_content;
 elsif p_kind='recipe' then update public.community_recipes set status=p_decision,moderation_note=p_note,review_record=review where id=p_content and status<>'withdrawn';
 else raise exception 'Choose comment or recipe.'; end if;
 if not found then raise exception 'Content is unavailable.'; end if;
 insert into public.community_moderation_audit(kind,content_id,decision,note,reviewer,qualifications,sources)
 values(p_kind,p_content,p_decision,p_note,p_reviewer,p_qualifications,p_sources);
end $$;
create or replace function public.community_deletion_queue()
returns table(user_id uuid,requested_at timestamptz)
language sql stable security definer set search_path='' as $$
 select user_id,deletion_requested_at from public.community_account_controls where deletion_requested_at is not null order by deletion_requested_at limit 100;
$$;
create or replace function public.community_clear_content_audit() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 delete from public.community_moderation_audit where content_id=OLD.id and kind=case when TG_TABLE_NAME='community_comments' then 'comment' else 'recipe' end;
 return OLD;
end $$;
drop trigger if exists community_comment_audit_cleanup on public.community_comments;
create trigger community_comment_audit_cleanup before delete on public.community_comments for each row execute function public.community_clear_content_audit();
drop trigger if exists community_recipe_audit_cleanup on public.community_recipes;
create trigger community_recipe_audit_cleanup before delete on public.community_recipes for each row execute function public.community_clear_content_audit();
revoke all on function public.community_photo_folder(),public.recipe_photo_owned(text),public.community_clear_content_audit() from public,anon,authenticated;
grant execute on function public.community_photo_folder() to authenticated;
grant execute on function public.recipe_photo_owned(text) to anon,authenticated;
grant select on public.community_photo_folders to service_role;
revoke all on function public.community_policy_version(),public.community_require_contributor(),public.community_author_visible(uuid),public.community_account_state(),public.community_accept_policy(text),public.community_request_deletion(),public.community_block(text,uuid),public.community_blocks_list(),public.community_unblock(uuid),public.community_review_guard(),public.community_moderate(text,uuid,text,text,text,text,text),public.community_deletion_queue() from public,anon,authenticated;
grant execute on function public.community_account_state(),public.community_accept_policy(text),public.community_request_deletion(),public.community_block(text,uuid),public.community_blocks_list(),public.community_unblock(uuid) to authenticated;
grant execute on function public.community_list(text,integer) to anon,authenticated;
grant execute on function public.community_moderate(text,uuid,text,text,text,text,text),public.community_deletion_queue() to service_role;
grant select on public.community_account_controls to service_role;
notify pgrst,'reload schema';
commit;
