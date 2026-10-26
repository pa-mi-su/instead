-- Repeatable. Apply after recipe-voting.sql, builtin-recipe-admin.sql,
-- private-account-hub.sql, admin-panel.sql, and simplify-admin-review.sql.
-- Adds private, per-recipe saves and a separate MFA-protected admin user directory.
begin;

create table if not exists public.community_saved_recipes (
 user_id uuid not null references auth.users on delete cascade,
 product_id text not null references public.community_products(id) on delete cascade,
 recipe_id text not null check(char_length(btrim(recipe_id)) between 1 and 200),
 recipe_title text not null check(char_length(btrim(recipe_title)) between 1 and 100),
 saved_at timestamptz not null default clock_timestamp(),
 primary key(user_id,product_id,recipe_id)
);
alter table public.community_saved_recipes enable row level security;
revoke all on public.community_saved_recipes from public,anon,authenticated;
create index if not exists community_saved_recipes_user_saved
 on public.community_saved_recipes(user_id,saved_at desc);

create or replace function public.community_saved_recipes_list()
returns table(product_id text,recipe_id text,recipe_title text,saved_at timestamptz)
language sql stable security definer set search_path='' as $$
 select s.product_id,s.recipe_id,
  coalesce((select b.title from public.community_builtin_recipes b where b.id=s.recipe_id and b.product_id=s.product_id and b.is_active),
   (select r.title from public.community_recipes r where r.id::text=s.recipe_id and r.product_id=s.product_id and r.status='approved' and r.admin_removed_at is null),
   s.recipe_title),s.saved_at
 from public.community_saved_recipes s
 where s.user_id=public.community_require_user()
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

create or replace function public.community_admin_users(p_search text default '',p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare needle text:=btrim(coalesce(p_search,'')); offset_n integer:=coalesce(p_offset,0); items jsonb; total_n bigint;
begin
 if not public.community_is_admin() then
  raise exception 'Administrator access required.' using errcode='42501';
 end if;
 if char_length(needle)>100 or offset_n<0 or offset_n>100000 then
  raise exception 'Invalid user search or page.';
 end if;
 select count(*) into total_n
 from auth.users u left join public.community_profiles p on p.user_id=u.id
 where not coalesce(u.is_anonymous,false) and u.email_confirmed_at is not null
 and (needle='' or u.email ilike '%'||needle||'%' or p.username ilike '%'||needle||'%' or u.id::text=needle);
 select coalesce(jsonb_agg(to_jsonb(q)-'total'),'[]'::jsonb) into items from (
  select u.id as user_id,u.email,p.username,u.created_at,u.last_sign_in_at,
   coalesce(c.suspended,false) as suspended,
   (select count(*) from public.community_recipes r where r.user_id=u.id) as recipes,
   total_n as total
  from auth.users u left join public.community_profiles p on p.user_id=u.id
  left join public.community_account_controls c on c.user_id=u.id
  where not coalesce(u.is_anonymous,false) and u.email_confirmed_at is not null
   and (needle='' or u.email ilike '%'||needle||'%' or p.username ilike '%'||needle||'%' or u.id::text=needle)
  order by u.created_at desc,u.id
  limit 20 offset offset_n
 ) q;
 return jsonb_build_object('items',items,'total',total_n,'offset',offset_n);
end $$;

revoke all on function public.community_saved_recipes_list(),
 public.community_saved_recipes_set(text,text,text,boolean),
 public.community_admin_users(text,integer) from public,anon,authenticated;
grant execute on function public.community_saved_recipes_list(),
 public.community_saved_recipes_set(text,text,text,boolean) to authenticated;
grant execute on function public.community_admin_users(text,integer) to authenticated;

notify pgrst,'reload schema';
commit;
