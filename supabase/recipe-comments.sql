-- Apply after community-safeguards.sql and admin-panel.sql. Existing product comments are retained, never guessed onto a recipe.
begin;
alter table public.community_recipes add column if not exists admin_removed_at timestamptz;
alter table public.community_comments add column if not exists admin_removed_at timestamptz;
create table if not exists public.community_builtin_recipes(id text primary key,product_id text not null references public.community_products,title text not null);
alter table public.community_builtin_recipes enable row level security;
revoke all on public.community_builtin_recipes from public,anon,authenticated;
insert into public.community_builtin_recipes values ('builtin:dishCleanerRecipe','natural-dish-cleaner','Citrus Castile Dish Cleaner'),('builtin:dishScrubRecipe','natural-dish-cleaner','Baking Soda Scrub & Separate Vinegar Rinse'),('builtin:toothpasteRecipe','natural-toothpaste','Zero-Sweetener Coconut Toothpaste'),('builtin:glassCleanerRecipe','natural-glass-cleaner','Vinegar & Alcohol Glass Cleaner'),('builtin:vinegarGlassRecipe','natural-glass-cleaner','Two-Ingredient Vinegar Glass Cleaner'),('builtin:laundryPowderRecipe','natural-laundry-care','Mineral Laundry Powder — Booster Formula'),('builtin:surfaceCleanerRecipe','natural-surface-cleaner','Vinegar & Dish Soap Surface Cleaner'),('builtin:shampooRecipe','natural-shampoo','Simple Castile Soap Shampoo'),('builtin:twoStepHairRecipe','natural-shampoo','Two-Step Baking Soda Wash & ACV Rinse'),('builtin:deodorantRecipe','natural-deodorant','Three-Ingredient Coconut Deodorant'),('builtin:tallowDeodorantRecipe','natural-deodorant','Tallow & Orange Deodorant'),('builtin:weedControlRecipe','natural-weed-killer','Vinegar, Salt & Dish Soap Weed Spray'),('builtin:saltFreeWeedRecipe','natural-weed-killer','Salt-Free Vinegar Weed Spray') on conflict(id) do update set title=excluded.title;
alter table public.community_comments add column if not exists recipe_key text;
create index if not exists community_comments_recipe on public.community_comments(product_id,recipe_key,created_at) where not hidden;
create or replace function public.recipe_comment_target(p_product text,p_recipe text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_builtin_recipes where id=p_recipe and product_id=p_product)
 or exists(select 1 from public.community_recipes where id::text=p_recipe and product_id=p_product and status='approved' and admin_removed_at is null and public.community_author_visible(user_id));
$$;
create or replace function public.recipe_comment_post(p_product text,p_recipe text,p_body text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not coalesce(public.recipe_comment_target(p_product,p_recipe),false) then raise exception 'Recipe is unavailable.'; end if;
 result:=public.community_post(p_product,p_body);
 update public.community_comments set recipe_key=p_recipe where id=result;
 return result;
end $$;
create or replace function public.recipe_comments_list(p_product text,p_recipe text,p_offset integer default 0,p_sort text default 'helpful')
returns table(id uuid,nickname text,body text,created_at timestamptz,votes bigint,upvoted boolean,mine boolean,reported boolean,moderation_status text,public_count bigint)
language sql stable security definer set search_path='' as $$
 with visible as (
 select c.*,(select count(*) from public.community_votes v where v.comment_id=c.id and v.user_id<>c.user_id) as vote_count
 from public.community_comments c where c.product_id=p_product and c.recipe_key=p_recipe and not c.hidden and c.admin_removed_at is null
 and public.recipe_comment_target(p_product,p_recipe) and public.community_author_visible(c.user_id)
 and (c.moderation_status='approved' or c.user_id=auth.uid())
 )
 select c.id,'Community member'::text,c.body,c.created_at,c.vote_count,
 exists(select 1 from public.community_votes v where v.comment_id=c.id and v.user_id=auth.uid() and v.user_id<>c.user_id),
 coalesce(c.user_id=auth.uid(),false),exists(select 1 from public.community_reports r where r.comment_id=c.id and r.user_id=auth.uid()),c.moderation_status,
 (select count(*) from visible where moderation_status='approved')
 from visible c where p_offset between 0 and 10000 and p_sort in ('helpful','newest')
 order by case when p_sort='helpful' then (c.moderation_status='approved')::integer end desc,case when p_sort='helpful' then c.vote_count end desc,c.created_at desc,c.id
 limit 50 offset greatest(0,least(p_offset,10000));
$$;
revoke all on function public.recipe_comment_target(text,text),public.recipe_comment_post(text,text,text),public.recipe_comments_list(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.recipe_comment_post(text,text,text) to authenticated;
grant execute on function public.recipe_comments_list(text,text,integer,text) to anon,authenticated;
-- Older app versions retain only their earlier product-level discussion.
create or replace function public.community_list(p_product text,p_offset integer default 0)
returns table(id uuid,nickname text,body text,created_at timestamptz,votes bigint,upvoted boolean,mine boolean,reported boolean,moderation_status text)
language sql stable security definer set search_path='' as $$
 select c.id,'Community member'::text,c.body,c.created_at,
 (select count(*) from public.community_votes v where v.comment_id=c.id and v.user_id<>c.user_id),
 exists(select 1 from public.community_votes v where v.comment_id=c.id and v.user_id=auth.uid() and v.user_id<>c.user_id),
 coalesce(c.user_id=auth.uid(),false),exists(select 1 from public.community_reports r where r.comment_id=c.id and r.user_id=auth.uid()),c.moderation_status
 from public.community_comments c where c.product_id=p_product and c.recipe_key is null and not c.hidden
 and (c.moderation_status='approved' or c.user_id=auth.uid()) and public.community_author_visible(c.user_id)
 and p_offset between 0 and 10000
 order by 5 desc,c.created_at desc,c.id limit 50 offset greatest(0,least(p_offset,10000));
$$;
commit;
