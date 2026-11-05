-- Apply after personal-recipe-visibility.sql. Account exclusions are irreversible
-- through client APIs. Only an explicit admin archive/removal changes publication.
begin;
create or replace function public.community_exclude_recipe(p_user uuid,p_product text,p_recipe text,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare author_id uuid;
begin
 insert into public.community_recipe_visibility(user_id,product_id,recipe_id,reason)
 values(p_user,p_product,p_recipe,p_reason)
 on conflict(user_id,product_id,recipe_id) do nothing;
 select r.user_id into author_id from public.community_recipes r
 where r.id::text=p_recipe and r.product_id=p_product;
 if author_id is not null and author_id<>p_user then
  insert into public.community_blocks(user_id,blocked_user,label)
  values(p_user,author_id,'Excluded contributor') on conflict(user_id,blocked_user) do nothing;
 end if;
 delete from public.community_saved_recipes s where s.user_id=p_user and (
  (s.product_id=p_product and s.recipe_id=p_recipe)
  or exists(select 1 from public.community_recipes r where r.id::text=s.recipe_id and r.product_id=s.product_id and r.user_id=author_id and author_id<>p_user));
end $$;
revoke all on function public.community_exclude_recipe(uuid,text,text,text) from public,anon,authenticated;
create or replace function public.community_hide_reported_recipe()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform public.community_exclude_recipe(new.user_id,new.product_id,new.recipe_id,'reported');
 return new;
end $$;
create or replace function public.community_recipe_hide(p_product text,p_recipe text,p_hidden boolean,p_expected_user uuid)
returns void language plpgsql security definer set search_path='' as $$
declare who uuid:=public.community_require_user();
begin
 if who is distinct from p_expected_user then raise exception 'Account changed. Please try again.' using errcode='42501'; end if;
 if p_hidden is distinct from true then raise exception 'Reported and blocked content cannot be restored.' using errcode='42501'; end if;
 if p_product is null or p_recipe is null or length(p_recipe) not between 1 and 150 then raise exception 'Choose a recipe.'; end if;
 perform public.community_limit(who,'recipe_visibility',60);
 if exists(select 1 from public.community_recipe_visibility where user_id=who and product_id=p_product and recipe_id=p_recipe) then return; end if;
 if not exists(select 1 from public.community_builtin_recipes b where b.id=p_recipe and b.product_id=p_product and b.is_active)
 and not exists(select 1 from public.community_recipes r where r.id::text=p_recipe and r.product_id=p_product and r.status='approved' and r.admin_removed_at is null)
 then raise exception 'Recipe is unavailable.'; end if;
 perform public.community_exclude_recipe(who,p_product,p_recipe,'blocked');
end $$;
create or replace function public.community_unblock(p_block uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.community_require_user();
 raise exception 'Reported and blocked contributors cannot be restored.' using errcode='42501';
end $$;
create or replace function public.community_recipe_visible(p_product text,p_recipe text)
returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.community_recipe_visibility v where v.user_id=auth.uid() and v.product_id=p_product and v.recipe_id=p_recipe)
 and not exists(select 1 from public.community_recipes r join public.community_blocks b on b.blocked_user=r.user_id
 where b.user_id=auth.uid() and r.product_id=p_product and r.id::text=p_recipe);
$$;
create or replace function public.community_my_recipes()
returns table(id uuid,product_id text,title text,status text,created_at timestamptz,moderation_note text)
language sql stable security definer set search_path='' as $$
 select r.id,r.product_id,r.title,r.status,r.created_at,r.moderation_note from public.community_recipes r
 where r.user_id=public.community_require_user() and r.status<>'withdrawn' and public.community_recipe_visible(r.product_id,r.id::text)
 order by r.created_at desc,r.id;
$$;
-- Old clients receive no management/history entries. These APIs must not become
-- an alternative way to enumerate or restore excluded content.
create or replace function public.community_blocks_list()
returns table(id uuid,label text,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 select null::uuid,null::text,null::timestamptz where false;
$$;
create or replace function public.community_my_recipe_concerns()
returns table(id uuid,product_id text,recipe_id text,title text,reason text,created_at timestamptz,reviewed_at timestamptz,hidden_at timestamptz)
language sql stable security definer set search_path='' as $$
 select null::uuid,null::text,null::text,null::text,null::text,null::timestamptz,null::timestamptz,null::timestamptz where false;
$$;
create or replace function public.community_concern_history_visibility(p_recipes text[],p_hidden boolean,p_expected_user uuid,p_only_reviewed boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.community_require_user();
 raise exception 'Concern history is not available.' using errcode='42501';
end $$;
-- Internal filter data only: no recipe titles, reasons, reports or author IDs.
-- Include every approved recipe by a blocked account, across all guides.
create or replace function public.community_recipe_exclusions()
returns table(product_id text,recipe_id text,author_username text)
language plpgsql stable security definer set search_path='' as $$
declare who uuid:=public.community_require_user();
begin
 return query
 select v.product_id,v.recipe_id,case when r.user_id<>who then p.username else null end from public.community_recipe_visibility v
 left join public.community_recipes r on r.id::text=v.recipe_id and r.product_id=v.product_id
 left join public.community_profiles p on p.user_id=r.user_id
 where v.user_id=who
 union
 select r.product_id,r.id::text,p.username from public.community_blocks b
 join public.community_recipes r on r.user_id=b.blocked_user and r.status='approved' and r.admin_removed_at is null
 left join public.community_profiles p on p.user_id=b.blocked_user
 where b.user_id=who;
end $$;
revoke all on function public.community_recipe_exclusions() from public,anon;
grant execute on function public.community_recipe_exclusions() to authenticated;
-- Keep the old internal filter RPC compatible, without supplying display data.
create or replace function public.community_hidden_recipes()
returns table(product_id text,recipe_id text,reason text,title text)
language sql stable security definer set search_path='' as $$
 select e.product_id,e.recipe_id,''::text,''::text from public.community_recipe_exclusions() e;
$$;
-- Reconcile all prior reports (including old restores) once. Existing recipe
-- blocks also acquire the contributor scope required by this product contract.
with migration as (
 insert into public.community_visibility_migrations(key) values('permanent-exclusions-v1') on conflict do nothing returning key
)
insert into public.community_recipe_visibility(user_id,product_id,recipe_id,reason)
 select distinct c.user_id,c.product_id,c.recipe_id,'reported' from public.recipe_concerns c
 where exists(select 1 from migration) and (
 exists(select 1 from public.community_builtin_recipes b where b.id=c.recipe_id and b.product_id=c.product_id)
 or exists(select 1 from public.community_recipes r where r.id::text=c.recipe_id and r.product_id=c.product_id))
 on conflict do nothing;
insert into public.community_blocks(user_id,blocked_user,label)
 select distinct v.user_id,r.user_id,'Excluded contributor' from public.community_recipe_visibility v
 join public.community_recipes r on r.id::text=v.recipe_id and r.product_id=v.product_id
 where v.user_id<>r.user_id on conflict(user_id,blocked_user) do nothing;
delete from public.community_saved_recipes s where exists(
 select 1 from public.community_recipe_visibility v where v.user_id=s.user_id and v.product_id=s.product_id and v.recipe_id=s.recipe_id)
 or exists(select 1 from public.community_recipes r join public.community_blocks b on b.blocked_user=r.user_id
 where b.user_id=s.user_id and r.id::text=s.recipe_id and r.product_id=s.product_id);
-- Historical legacy contributor-block calls remain safe and irreversible.
create or replace function public.community_block(p_kind text,p_content uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare who uuid:=public.community_require_user(); target uuid; result uuid; product text;
begin
 if p_kind='recipe' then
  select user_id,product_id into target,product from public.community_recipes where id=p_content and status='approved' and admin_removed_at is null;
 elsif p_kind='comment' then
  select user_id into target from public.community_comments where id=p_content and not hidden and moderation_status='approved';
 end if;
 if target is null or target=who then raise exception 'Contributor is unavailable.'; end if;
 perform public.community_limit(who,'block',30);
 insert into public.community_blocks(user_id,blocked_user,label) values(who,target,'Excluded contributor')
 on conflict(user_id,blocked_user) do nothing;
 if p_kind='recipe' then perform public.community_exclude_recipe(who,product,p_content::text,'blocked'); end if;
 select id into result from public.community_blocks where user_id=who and blocked_user=target;
 return result;
end $$;
-- Direct table writes are denied; every client restoration API is rejected.
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
 and public.community_author_visible(r.user_id) and public.community_recipe_visible(r.product_id,r.id::text)
 and case when p_mine then r.user_id=auth.uid() and r.status <> 'withdrawn' else r.status='approved' and r.admin_removed_at is null end
 order by 12 desc,r.created_at desc,r.id limit 20 offset greatest(0,least(p_offset,10000));
$$;

notify pgrst,'reload schema';
commit;
