-- Apply after community-safeguards.sql, directory-topics.sql, and recipe-comments.sql.
-- Registers the shipped recipes and adds private, one-vote-per-account ratings.
begin;

create or replace function public.community_policy_version() returns text
language sql immutable set search_path='' as $$ select '2026-10-19.1'::text $$;

insert into public.community_products(id) values
 ('natural-roach-control'), ('natural-ant-control'), ('natural-mosquito-control'),
 ('natural-cough-comfort'), ('natural-clogged-drains')
on conflict (id) do nothing;

insert into public.community_builtin_recipes(id,product_id,title) values
 ('builtin:dishCleanerRecipe','natural-dish-cleaner','Citrus Castile Dish Cleaner'),
 ('builtin:dishScrubRecipe','natural-dish-cleaner','Baking Soda Scrub & Separate Vinegar Rinse'),
 ('builtin:toothpasteRecipe','natural-toothpaste','Zero-Sweetener Coconut Toothpaste'),
 ('builtin:bodySoapRecipe','natural-body-soap','Honey & Oat Melt-and-Pour Soap'),
 ('builtin:tallowSkinBalmRecipe','natural-skin-care','Tallow & Olive or Jojoba Balm'),
 ('builtin:sunburnFirstAid','natural-sunburn-care','Cool Compress & Aloe or Soy Moisturizer'),
 ('builtin:aloeSunburnCare','natural-sunburn-care','Plain Aloe Vera Moisturizer'),
 ('builtin:aloeCoconutSunburnSpray','natural-sunburn-care','2-Ingredient “No-Tallow” Sunburn Spray'),
 ('builtin:sunburnTallowBalm','natural-sunburn-care','Sunburn Balm'),
 ('builtin:bugBitePaste','natural-bug-bite-care','The Ultimate 3-Ingredient Bug Bite Paste'),
 ('builtin:bugBiteTallowBalm','natural-bug-bite-care','Bug Bite Anti-Itch Balm'),
 ('builtin:glassCleanerRecipe','natural-glass-cleaner','Vinegar & Alcohol Glass Cleaner'),
 ('builtin:vinegarGlassRecipe','natural-glass-cleaner','Two-Ingredient Vinegar Glass Cleaner'),
 ('builtin:laundryPowderRecipe','natural-laundry-care','Mineral Laundry Powder — Booster Formula'),
 ('builtin:surfaceCleanerRecipe','natural-surface-cleaner','Vinegar & Dish Soap Surface Cleaner'),
 ('builtin:shampooRecipe','natural-shampoo','Simple Castile Soap Shampoo'),
 ('builtin:twoStepHairRecipe','natural-shampoo','Two-Step Baking Soda Wash & ACV Rinse'),
 ('builtin:deodorantRecipe','natural-deodorant','Three-Ingredient Coconut Deodorant'),
 ('builtin:tallowDeodorantRecipe','natural-deodorant','Tallow & Orange Deodorant'),
 ('builtin:weedControlRecipe','natural-weed-killer','Vinegar, Salt & Dish Soap Weed Spray'),
 ('builtin:saltFreeWeedRecipe','natural-weed-killer','Salt-Free Vinegar Weed Spray'),
 ('builtin:peppermintMouseSpray','natural-mouse-deterrents','Peppermint Vinegar Mouse Spray'),
 ('builtin:mouseDeterrentSachet','natural-mouse-deterrents','The “Sachet” Alternative for Tight Spaces'),
 ('builtin:spiderDeterrentSpray','natural-spider-deterrents','Peppermint and Citrus Spider Spray'),
 ('builtin:roachControlRecipe','natural-roach-control','Chemical-Free Roach Reduction'),
 ('builtin:antControlRecipe','natural-ant-control','Chemical-Free Ant Trail Cleanup and Prevention'),
 ('builtin:mosquitoTrapRecipe','natural-mosquito-control','DIY Yeast-and-Soap Mosquito Bucket Trap'),
 ('builtin:honeyLemonGingerCoughSyrup','natural-cough-comfort','Honey, Lemon, and Ginger Cough Syrup'),
 ('builtin:appleCiderVinegarHoneyDrink','natural-cough-comfort','Apple Cider Vinegar and Honey Drink'),
 ('builtin:drainClearingGuide','natural-clogged-drains','Chemical-Free Clog Clearing'),
 ('builtin:bakingSodaVinegarDrainRecipe','natural-clogged-drains','Baking Soda and Vinegar Drain Flush')
on conflict(id) do update set product_id=excluded.product_id,title=excluded.title;

create table if not exists public.builtin_recipe_votes (
 recipe_id text not null references public.community_builtin_recipes(id) on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 value smallint not null check(value in (-1,1)),
 primary key(recipe_id,user_id)
);
alter table public.builtin_recipe_votes enable row level security;
revoke all on public.builtin_recipe_votes from public,anon,authenticated;

-- Stop new and legacy clients from posting or reading comment threads. Existing
-- comment records remain in place for account deletion and administrator review.
revoke all on function public.community_post(text,text),
 public.community_list(text,integer),public.community_vote(uuid,boolean),
 public.community_report(uuid,text),public.recipe_comment_post(text,text,text),
 public.recipe_comments_list(text,text,integer,text)
from public,anon,authenticated;

create or replace function public.builtin_recipe_rating(p_product text,p_recipe text)
returns table(score bigint,upvotes bigint,downvotes bigint,my_vote smallint)
language sql stable security definer set search_path='' as $$
 select coalesce(sum(v.value),0)::bigint,
        count(*) filter(where v.value=1)::bigint,
        count(*) filter(where v.value=-1)::bigint,
        coalesce(max(v.value) filter(where v.user_id=auth.uid()),0)::smallint
 from public.community_builtin_recipes r
 left join public.builtin_recipe_votes v on v.recipe_id=r.id
 where r.id=p_recipe and r.product_id=p_product
 group by r.id;
$$;

create or replace function public.builtin_recipe_vote(p_product text,p_recipe text,p_value smallint)
returns void language plpgsql security definer set search_path='' as $$
declare who uuid:=public.community_require_contributor(); old_value smallint;
begin
 perform pg_advisory_xact_lock(hashtextextended(who::text,0));
 if p_value is null or p_value not in (-1,0,1) then raise exception 'Choose an upvote, downvote, or remove your vote.'; end if;
 if not exists(select 1 from public.community_builtin_recipes where id=p_recipe and product_id=p_product) then raise exception 'Recipe is unavailable.'; end if;
 select value into old_value from public.builtin_recipe_votes where recipe_id=p_recipe and user_id=who;
 if coalesce(old_value,0)=p_value then return; end if;
 perform public.community_limit(who,'builtin_recipe_vote',60);
 if p_value=0 then delete from public.builtin_recipe_votes where recipe_id=p_recipe and user_id=who;
 else insert into public.builtin_recipe_votes(recipe_id,user_id,value) values(p_recipe,who,p_value)
 on conflict(recipe_id,user_id) do update set value=excluded.value; end if;
end $$;

revoke all on function public.builtin_recipe_rating(text,text),public.builtin_recipe_vote(text,text,smallint) from public,anon,authenticated;
grant execute on function public.builtin_recipe_rating(text,text) to anon,authenticated;
grant execute on function public.builtin_recipe_vote(text,text,smallint) to authenticated;
notify pgrst,'reload schema';
commit;
