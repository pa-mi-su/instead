-- Repeatable. Apply after community-safeguards.sql and recipes.sql.
-- Adds private, account-scoped saved guides and a user's own recipe list.
begin;

insert into public.community_products(id) values
 ('natural-dish-cleaner'),('natural-toothpaste'),('natural-shampoo'),
 ('natural-body-soap'),('natural-weed-killer'),('natural-deodorant'),
 ('natural-glass-cleaner'),('natural-laundry-care'),('natural-surface-cleaner'),
 ('natural-skin-care'),('natural-sunburn-care'),('natural-bug-bite-care'),
 ('natural-cough-comfort'),('natural-clogged-drains'),('natural-mouse-deterrents'),
 ('natural-spider-deterrents'),('natural-roach-control'),('natural-ant-control'),
 ('natural-mosquito-control')
on conflict(id) do nothing;

create table if not exists public.community_saved_guides (
 user_id uuid not null references auth.users on delete cascade,
 product_id text not null references public.community_products(id) on delete cascade,
 saved_at timestamptz not null default clock_timestamp(),
 primary key(user_id,product_id)
);
alter table public.community_saved_guides enable row level security;
revoke all on public.community_saved_guides from public,anon,authenticated;
create index if not exists community_recipes_author_created
 on public.community_recipes(user_id,created_at desc) where status<>'withdrawn';

-- Reuse the legacy private profile table, but expose public profile fields only
-- through narrowly scoped RPCs. Existing accounts receive a stable starter name.
alter table public.community_profiles add column if not exists username text;
alter table public.community_profiles add column if not exists bio text not null default '';
insert into public.community_profiles(user_id,nickname,username,bio)
select u.id,
       'member_'||substr(replace(u.id::text,'-',''),1,8),
       'member_'||substr(replace(u.id::text,'-',''),1,8),
       ''
from auth.users u
on conflict(user_id) do update set
 username=coalesce(public.community_profiles.username,
                   'member_'||substr(replace(excluded.user_id::text,'-',''),1,8)),
 nickname=case when public.community_profiles.nickname='Community member'
               then 'member_'||substr(replace(excluded.user_id::text,'-',''),1,8)
               else public.community_profiles.nickname end;
alter table public.community_profiles alter column username set not null;
create unique index if not exists community_profiles_username_unique
 on public.community_profiles(lower(username));
do $$ begin
 if not exists(select 1 from pg_constraint where conname='community_profiles_username_format') then
  alter table public.community_profiles add constraint community_profiles_username_format
   check(username ~ '^[A-Za-z0-9_]{3,20}$');
 end if;
 if not exists(select 1 from pg_constraint where conname='community_profiles_bio_length') then
  alter table public.community_profiles add constraint community_profiles_bio_length
   check(char_length(bio)<=280);
 end if;
end $$;

create or replace function public.community_profile_set(p_username text,p_bio text default '')
returns void language plpgsql security definer set search_path='' as $$
declare who uuid:=public.community_require_user(); handle text:=btrim(coalesce(p_username,'')); about text:=btrim(coalesce(p_bio,''));
begin
 if handle !~ '^[A-Za-z0-9_]{3,20}$' then raise exception 'Username must be 3–20 letters, numbers, or underscores.'; end if;
 if char_length(about)>280 then raise exception 'Profile bio must be 280 characters or fewer.'; end if;
 insert into public.community_profiles(user_id,nickname,username,bio)
 values(who,handle,handle,about)
 on conflict(user_id) do update set nickname=excluded.nickname,username=excluded.username,bio=excluded.bio;
end $$;

create or replace function public.community_profile_me()
returns table(username text,bio text)
language sql stable security definer set search_path='' as $$
 select p.username,p.bio from public.community_profiles p
 where p.user_id=public.community_require_user();
$$;

create or replace function public.community_profile_public(p_username text)
returns table(username text,bio text,recipes jsonb)
language sql stable security definer set search_path='' as $$
 select p.username,p.bio,coalesce((
  select jsonb_agg(jsonb_build_object('id',r.id,'title',r.title,'product_id',r.product_id,'created_at',r.created_at)
                   order by r.created_at desc,r.id)
  from public.community_recipes r
  where r.user_id=p.user_id and r.status='approved' and public.community_author_visible(r.user_id)
 ),'[]'::jsonb)
 from public.community_profiles p
 where lower(p.username)=lower(btrim(p_username)) and public.community_author_visible(p.user_id)
 limit 1;
$$;

create or replace function public.community_recipe_authors(p_recipes uuid[])
returns table(recipe_id uuid,username text,bio text)
language sql stable security definer set search_path='' as $$
 select r.id,p.username,p.bio
 from public.community_recipes r
 join public.community_profiles p on p.user_id=r.user_id
 where r.id=any(coalesce(p_recipes,'{}'::uuid[]))
   and (r.status='approved' or r.user_id=auth.uid())
   and public.community_author_visible(r.user_id);
$$;

create or replace function public.community_saved_guides_list()
returns table(product_id text,saved_at timestamptz)
language sql stable security definer set search_path='' as $$
 select s.product_id,s.saved_at
 from public.community_saved_guides s
 where s.user_id=public.community_require_user()
 order by s.saved_at desc,s.product_id;
$$;

create or replace function public.community_saved_guides_set(p_product text,p_saved boolean)
returns void language plpgsql security definer set search_path='' as $$
declare who uuid:=public.community_require_user();
begin
 if p_product is null or p_saved is null then raise exception 'Choose a guide and save state.'; end if;
 if not exists(select 1 from public.community_products where id=p_product) then raise exception 'Guide is unavailable.'; end if;
 if p_saved then
  insert into public.community_saved_guides(user_id,product_id) values(who,p_product)
  on conflict(user_id,product_id) do update set saved_at=clock_timestamp();
 else
  delete from public.community_saved_guides where user_id=who and product_id=p_product;
 end if;
end $$;

create or replace function public.community_my_recipes()
returns table(id uuid,product_id text,title text,status text,created_at timestamptz,moderation_note text)
language sql stable security definer set search_path='' as $$
 select r.id,r.product_id,r.title,r.status,r.created_at,r.moderation_note
 from public.community_recipes r
 where r.user_id=public.community_require_user() and r.status<>'withdrawn'
 order by r.created_at desc,r.id;
$$;

revoke all on function public.community_saved_guides_list(),
 public.community_saved_guides_set(text,boolean),public.community_my_recipes(),
 public.community_profile_set(text,text),public.community_profile_me(),
 public.community_profile_public(text),public.community_recipe_authors(uuid[])
 from public,anon,authenticated;
grant execute on function public.community_saved_guides_list(),
 public.community_saved_guides_set(text,boolean),public.community_my_recipes()
 to authenticated;
grant execute on function public.community_profile_set(text,text),public.community_profile_me()
 to authenticated;
grant execute on function public.community_profile_public(text),public.community_recipe_authors(uuid[])
 to anon,authenticated;

notify pgrst,'reload schema';
commit;
