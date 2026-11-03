-- Apply after the existing recipe, voting, safeguards, and builtin-admin migrations.
begin;
create table if not exists public.recipe_concerns (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 product_id text not null,
 recipe_id text not null,
 reason text not null,
 details text not null,
 recipe_snapshot jsonb not null,
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 email_claimed_at timestamptz,
 emailed_at timestamptz
);
alter table public.recipe_concerns enable row level security;
revoke all on public.recipe_concerns from public,anon,authenticated;
grant all on public.recipe_concerns to service_role;
create index if not exists recipe_concerns_owner_recent on public.recipe_concerns(user_id,created_at desc);
create or replace function public.recipe_concern_submit(p_product text,p_recipe text,p_reason text,p_details text) returns uuid
language plpgsql security definer set search_path='' as $$
declare who uuid:=public.community_require_user(); snapshot jsonb; result uuid; is_catalog boolean:=false;
begin
 if p_recipe is null or length(p_recipe)>150 or p_product is null or length(p_product)>150
 or p_reason is null or p_reason not in ('Unsafe advice','Spam or abuse','Other')
 or p_details is null or length(btrim(p_details)) not between 3 and 2000
 then raise exception 'Choose a reason and enter a concern of 3–2000 characters.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(who::text,0));
 select jsonb_build_object('id',id,'product_id',product_id,'title',title,'recipe',recipe_content)
   into snapshot from public.community_builtin_recipes where id=p_recipe and product_id=p_product and is_active;
 is_catalog:=snapshot is not null;
 if not is_catalog then
  select to_jsonb(r)-'review_record' into snapshot from public.community_recipes r
   where r.id::text=p_recipe and r.product_id=p_product and r.status='approved' and r.admin_removed_at is null
   and not exists(select 1 from public.community_account_controls c where c.user_id=r.user_id and (c.suspended or c.deletion_requested_at is not null));
 end if;
 if snapshot is null then raise exception 'Recipe is unavailable.'; end if;
 -- Retrying failed email delivery reuses the stored concern and does not spam the inbox.
 select id into result from public.recipe_concerns where user_id=who and recipe_id=p_recipe and product_id=p_product
  and reason=p_reason and details=btrim(p_details) and created_at>now()-interval '10 minutes' order by created_at desc limit 1;
 if result is not null then return result; end if;
 perform public.community_limit(who,'recipe_concern',10);
 if not is_catalog then
  -- Reopen review when a reporter raises a new concern after an earlier review.
  insert into public.recipe_reports(recipe_id,user_id,reason,created_at)
  values(p_recipe::uuid,who,p_reason,now())
  on conflict(recipe_id,user_id) do update set reason=excluded.reason,created_at=excluded.created_at;
 end if;
 insert into public.recipe_concerns(user_id,product_id,recipe_id,reason,details,recipe_snapshot)
 values(who,p_product,p_recipe,p_reason,btrim(p_details),snapshot) returning id into result;
 return result;
end $$;
revoke all on function public.recipe_concern_submit(text,text,text,text) from public,anon;
grant execute on function public.recipe_concern_submit(text,text,text,text) to authenticated;
create or replace function public.recipe_concern_claim(p_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.role()<>'service_role' then raise exception 'Server access required.'; end if;
 update public.recipe_concerns set email_claimed_at=now() where id=p_id and emailed_at is null
 and (email_claimed_at is null or email_claimed_at<now()-interval '5 minutes');
 return found;
end $$;
revoke all on function public.recipe_concern_claim(uuid) from public,anon,authenticated;
grant execute on function public.recipe_concern_claim(uuid) to service_role;
create or replace function public.recipe_concerns_admin(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare target text; cutoff timestamptz; note text; items jsonb;
begin
 if not public.community_is_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>90000 then raise exception 'Invalid request.'; end if;
 if p_action='list' then
  if jsonb_typeof(p_payload->'recipes')<>'array' or jsonb_array_length(p_payload->'recipes')>1000 then raise exception 'Invalid recipe list.'; end if;
  select coalesce(jsonb_agg(to_jsonb(q)),'[]') into items from (
   select recipe_id,reason,details,created_at from public.recipe_concerns
   where reviewed_at is null and recipe_id in (select jsonb_array_elements_text(p_payload->'recipes'))
   order by created_at desc limit 1000
  ) q;
  return jsonb_build_object('items',items);
 elsif p_action='resolve' then
  target:=p_payload->>'recipe'; cutoff:=(p_payload->>'cutoff')::timestamptz; note:=p_payload->>'note';
  if note is null or length(btrim(note)) not between 3 and 2000 or cutoff is null
   or not exists(select 1 from public.recipe_concerns where recipe_id=target and created_at=cutoff)
  then raise exception 'Provide a valid report snapshot and review note.'; end if;
  update public.recipe_concerns set reviewed_at=now() where recipe_id=target and created_at<=cutoff and reviewed_at is null;
  if not exists(select 1 from public.community_builtin_recipes where id=target) then
   insert into public.community_report_reviews(kind,content_id,reviewed_at) values('recipe',target::uuid,cutoff)
   on conflict(kind,content_id) do update set reviewed_at=greatest(public.community_report_reviews.reviewed_at,excluded.reviewed_at);
  end if;
  insert into public.community_admin_audit(actor,action,kind,content_id,note)
   values(auth.uid(),'resolve_concerns','recipe',case when exists(select 1 from public.community_builtin_recipes where id=target) then null else target::uuid end,left(target||' · '||btrim(note),2000));
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Unknown action.';
end $$;
revoke all on function public.recipe_concerns_admin(text,jsonb) from public,anon;
grant execute on function public.recipe_concerns_admin(text,jsonb) to authenticated;
create or replace function public.recipe_concern_remove_author_snapshot() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update public.recipe_concerns set recipe_snapshot=jsonb_build_object('id',OLD.id,'deleted',true)
 where recipe_id=OLD.id::text;
 return OLD;
end $$;
drop trigger if exists recipe_concern_author_cleanup on public.community_recipes;
create trigger recipe_concern_author_cleanup before delete on public.community_recipes
 for each row execute function public.recipe_concern_remove_author_snapshot();
commit;
