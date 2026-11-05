-- Apply after recipe-concerns.sql and recipe-concern-history.sql.
-- Personal preferences never change publication or moderation state.
begin;
create table if not exists public.community_recipe_visibility (
 user_id uuid not null references auth.users(id) on delete cascade,
 product_id text not null references public.community_products(id),
 recipe_id text not null check(length(recipe_id) between 1 and 150),
 reason text not null check(reason in ('reported','blocked')),
 created_at timestamptz not null default now(),
 primary key(user_id,product_id,recipe_id)
);
alter table public.community_recipe_visibility enable row level security;
revoke all on public.community_recipe_visibility from public,anon,authenticated;
create or replace function public.community_recipe_visible(p_product text,p_recipe text)
returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.community_recipe_visibility v where v.user_id=auth.uid() and v.product_id=p_product and v.recipe_id=p_recipe);
$$;
revoke all on function public.community_recipe_visible(text,text) from public;
grant execute on function public.community_recipe_visible(text,text) to anon,authenticated;
create or replace function public.community_hidden_recipes()
returns table(product_id text,recipe_id text,reason text,title text)
language plpgsql stable security definer set search_path='' as $$
declare who uuid:=public.community_require_user();
begin
 return query select v.product_id,v.recipe_id,v.reason,
 coalesce(b.title,r.title,'Unavailable recipe') from public.community_recipe_visibility v
 left join public.community_builtin_recipes b on b.id=v.recipe_id and b.product_id=v.product_id
 left join public.community_recipes r on r.id::text=v.recipe_id and r.product_id=v.product_id
 where v.user_id=who order by v.created_at desc;
end $$;
create or replace function public.community_recipe_hide(p_product text,p_recipe text,p_hidden boolean,p_expected_user uuid)
returns void language plpgsql security definer set search_path='' as $$
declare who uuid:=public.community_require_user();
begin
 if who is distinct from p_expected_user then raise exception 'Account changed. Please try again.' using errcode='42501'; end if;
 if p_product is null or p_recipe is null or length(p_recipe) not between 1 and 150 or p_hidden is null then raise exception 'Choose a recipe.'; end if;
 perform public.community_limit(who,'recipe_visibility',60);
 if p_hidden then
  if not exists(select 1 from public.community_builtin_recipes b where b.id=p_recipe and b.product_id=p_product and b.is_active)
   and not exists(select 1 from public.community_recipes r where r.id::text=p_recipe and r.product_id=p_product and r.status='approved' and r.admin_removed_at is null and public.community_author_visible(r.user_id))
  then raise exception 'Recipe is unavailable.'; end if;
  insert into public.community_recipe_visibility(user_id,product_id,recipe_id,reason) values(who,p_product,p_recipe,'blocked') on conflict do nothing;
 else
  delete from public.community_recipe_visibility where user_id=who and product_id=p_product and recipe_id=p_recipe;
 end if;
end $$;
revoke all on function public.community_hidden_recipes(),public.community_recipe_hide(text,text,boolean,uuid) from public,anon;
grant execute on function public.community_hidden_recipes(),public.community_recipe_hide(text,text,boolean,uuid) to authenticated;
create or replace function public.community_hide_reported_recipe()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.community_recipe_visibility(user_id,product_id,recipe_id,reason) values(new.user_id,new.product_id,new.recipe_id,'reported') on conflict(user_id,product_id,recipe_id) do update set reason='reported';
 return new;
end $$;
drop trigger if exists hide_reported_recipe on public.recipe_concerns;
create trigger hide_reported_recipe after insert on public.recipe_concerns for each row execute function public.community_hide_reported_recipe();
create or replace function public.community_clear_reviewed_concern()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.reviewed_at is not null then new.hidden_at:=coalesce(new.hidden_at,now()); end if;
 return new;
end $$;
drop trigger if exists clear_reviewed_concern on public.recipe_concerns;
create trigger clear_reviewed_concern before update of reviewed_at on public.recipe_concerns for each row execute function public.community_clear_reviewed_concern();
update public.recipe_concerns set hidden_at=coalesce(hidden_at,now()) where reviewed_at is not null;
-- A one-time backfill must not re-hide recipes the owner later restores.
create table if not exists public.community_visibility_migrations(key text primary key);
alter table public.community_visibility_migrations enable row level security;
revoke all on public.community_visibility_migrations from public,anon,authenticated;
with migration as (
 insert into public.community_visibility_migrations(key) values('reported-recipes-v1') on conflict do nothing returning key
)
insert into public.community_recipe_visibility(user_id,product_id,recipe_id,reason)
 select distinct c.user_id,c.product_id,c.recipe_id,'reported' from public.recipe_concerns c
 where exists(select 1 from migration) and (
 exists(select 1 from public.community_builtin_recipes b where b.id=c.recipe_id and b.product_id=c.product_id)
 or exists(select 1 from public.community_recipes r where r.id::text=c.recipe_id and r.product_id=c.product_id))
 on conflict do nothing;
create or replace function public.community_cleanup_recipe_visibility()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.community_recipe_visibility where recipe_id=old.id::text and product_id=old.product_id;
 return old;
end $$;
drop trigger if exists cleanup_recipe_visibility on public.community_recipes;
create trigger cleanup_recipe_visibility after delete on public.community_recipes for each row execute function public.community_cleanup_recipe_visibility();
revoke all on function public.community_hide_reported_recipe(),public.community_clear_reviewed_concern(),public.community_cleanup_recipe_visibility() from public,anon,authenticated;
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
 and case when p_mine then r.user_id=auth.uid() and r.status <> 'withdrawn' else r.status='approved' and r.admin_removed_at is null and public.community_recipe_visible(r.product_id,r.id::text) end
 order by 12 desc,r.created_at desc,r.id limit 20 offset greatest(0,least(p_offset,10000));
$$;
create or replace function public.community_saved_recipes_list()
returns table(product_id text,recipe_id text,recipe_title text,saved_at timestamptz)
language sql stable security definer set search_path='' as $$
 select s.product_id,s.recipe_id,
  coalesce((select b.title from public.community_builtin_recipes b where b.id=s.recipe_id and b.product_id=s.product_id and b.is_active),
   (select r.title from public.community_recipes r where r.id::text=s.recipe_id and r.product_id=s.product_id and r.status='approved' and r.admin_removed_at is null),
   s.recipe_title),s.saved_at
 from public.community_saved_recipes s
 where s.user_id=public.community_require_user() and public.community_recipe_visible(s.product_id,s.recipe_id)
 and (
  exists(select 1 from public.community_builtin_recipes b where b.id=s.recipe_id and b.product_id=s.product_id and b.is_active)
  or exists(select 1 from public.community_recipes r where r.id::text=s.recipe_id and r.product_id=s.product_id
   and r.status='approved' and r.admin_removed_at is null and public.community_author_visible(r.user_id))
 )
 order by s.saved_at desc,s.product_id,s.recipe_id;
$$;

create or replace function public.community_saved_recipes_set(
 p_product text,p_recipe text,p_title text,p_saved boolean
) returns void language plpgsql security definer set search_path='' as $$
declare who uuid:=public.community_require_user(); canonical_title text;
begin
 if p_product is null or p_recipe is null or p_title is null or p_saved is null
 or char_length(btrim(p_recipe)) not between 1 and 200
 or char_length(btrim(p_title)) not between 1 and 100
 then raise exception 'Choose a recipe and save state.'; end if;
 if p_saved and not public.community_recipe_visible(p_product,p_recipe) then raise exception 'Show this recipe again before saving it.'; end if;
 if p_saved then
  select r.title into canonical_title from public.community_builtin_recipes r
   where r.id=p_recipe and r.product_id=p_product and r.is_active;
  if canonical_title is null then
   select r.title into canonical_title from public.community_recipes r
    where r.id::text=p_recipe and r.product_id=p_product and r.status='approved'
     and r.admin_removed_at is null and public.community_author_visible(r.user_id);
  end if;
  if canonical_title is null then raise exception 'Recipe is unavailable.'; end if;
 end if;
 if p_saved then
  insert into public.community_saved_recipes(user_id,product_id,recipe_id,recipe_title)
  values(who,p_product,btrim(p_recipe),canonical_title)
  on conflict(user_id,product_id,recipe_id) do update
   set recipe_title=excluded.recipe_title,saved_at=clock_timestamp();
 else
  delete from public.community_saved_recipes
  where user_id=who and product_id=p_product and recipe_id=btrim(p_recipe);
 end if;
end $$;

create or replace function public.community_profile_public(p_username text)
returns table(username text,bio text,avatar_path text,recipes jsonb)
language sql stable security definer set search_path='' as $$
 select p.username,p.bio,p.avatar_path,coalesce((
  select jsonb_agg(jsonb_build_object('id',r.id,'title',r.title,'product_id',r.product_id,'created_at',r.created_at)
                   order by r.created_at desc,r.id)
  from public.community_recipes r
  where r.user_id=p.user_id and r.status='approved' and r.admin_removed_at is null and public.community_recipe_visible(r.product_id,r.id::text) and public.community_author_visible(r.user_id)
 ),'[]'::jsonb)
 from public.community_profiles p
 where lower(p.username)=lower(btrim(p_username)) and public.community_author_visible(p.user_id)
 limit 1;
$$;


notify pgrst,'reload schema';
commit;
