-- One-time additive migration, after community.sql. Owner-only moderation.
begin;
create table public.community_recipes (
 id uuid primary key default gen_random_uuid(),
 product_id text not null references public.community_products,
 user_id uuid not null references auth.users on delete cascade,
 title text not null check(char_length(btrim(title)) between 3 and 100),
 ingredients text not null check(char_length(btrim(ingredients)) between 3 and 4000),
 instructions text not null check(char_length(btrim(instructions)) between 3 and 6000),
 storage_notes text not null check(char_length(btrim(storage_notes)) between 3 and 2000),
 cautions text not null check(char_length(btrim(cautions)) between 3 and 2000),
 source text not null default '' check(char_length(source) <= 500),
 photo_paths text[] not null default '{}' check(cardinality(photo_paths) <= 3),
 status text not null default 'pending' check(status in ('pending','approved','rejected','withdrawn')),
 moderation_note text not null default '',
 created_at timestamptz not null default now()
);
create table public.recipe_votes (
 recipe_id uuid not null references public.community_recipes on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 value smallint not null check(value in (-1,1)), primary key(recipe_id,user_id)
);
create table public.recipe_reports (
 recipe_id uuid not null references public.community_recipes on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 reason text not null check(reason in ('Unsafe advice','Spam or abuse','Other')),
 created_at timestamptz not null default now(), primary key(recipe_id,user_id)
);
create index recipes_product_status on public.community_recipes(product_id,status,created_at desc);
alter table public.community_recipes enable row level security;
alter table public.recipe_votes enable row level security;
alter table public.recipe_reports enable row level security;
revoke all on public.community_recipes, public.recipe_votes, public.recipe_reports from public,anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('recipe-photos','recipe-photos',false,5242880,array['image/jpeg','image/png','image/webp']);

create function public.recipe_photo_readable(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.community_recipes r where p_path = any(r.photo_paths)
 and (r.status = 'approved' or (r.user_id = auth.uid() and r.status <> 'withdrawn')));
$$;
create function public.recipe_photo_uploadable(p_path text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_user();
begin
 perform pg_advisory_xact_lock(hashtextextended(who::text,0));
 return p_path like who::text || '/%' and p_path ~ '^[a-f0-9-]+/[a-zA-Z0-9-]+\.(jpg|png|webp)$'
 and (select count(*) from storage.objects o where bucket_id='recipe-photos' and name like who::text || '/%') < 100
 and (select count(*) from storage.objects o where bucket_id='recipe-photos' and name like who::text || '/%'
 and not exists(select 1 from public.community_recipes r where o.name=any(r.photo_paths) and r.status <> 'withdrawn')) < 3;
end $$;
create function public.recipe_photo_removable(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
 select p_path like auth.uid()::text || '/%' and not exists(
 select 1 from public.community_recipes where p_path=any(photo_paths) and status <> 'withdrawn');
$$;
create policy recipe_photos_insert on storage.objects for insert to authenticated
 with check(bucket_id='recipe-photos' and public.recipe_photo_uploadable(name));
create policy recipe_photos_select on storage.objects for select to anon,authenticated
 using(bucket_id='recipe-photos' and (public.recipe_photo_readable(name) or name like auth.uid()::text || '/%'));
create policy recipe_photos_delete on storage.objects for delete to authenticated
 using(bucket_id='recipe-photos' and public.recipe_photo_removable(name));

create function public.recipe_list(p_product text,p_mine boolean default false,p_offset integer default 0)
returns table(id uuid,title text,ingredients text,instructions text,storage_notes text,cautions text,source text,
 photo_paths text[],status text,moderation_note text,created_at timestamptz,score bigint,upvotes bigint,downvotes bigint,my_vote smallint,mine boolean,reported boolean)
language sql stable security definer set search_path = '' as $$
 select r.id,r.title,r.ingredients,r.instructions,r.storage_notes,r.cautions,r.source,r.photo_paths,r.status,
 case when r.user_id=auth.uid() then r.moderation_note else '' end,r.created_at,
 coalesce((select sum(v.value) from public.recipe_votes v where v.recipe_id=r.id),0),
 (select count(*) from public.recipe_votes v where v.recipe_id=r.id and v.value=1),
 (select count(*) from public.recipe_votes v where v.recipe_id=r.id and v.value=-1),
 coalesce((select value from public.recipe_votes v where v.recipe_id=r.id and v.user_id=auth.uid()),0)::smallint,
 coalesce(r.user_id=auth.uid(),false),
 exists(select 1 from public.recipe_reports p where p.recipe_id=r.id and p.user_id=auth.uid())
 from public.community_recipes r where r.product_id=p_product and p_offset between 0 and 10000
 and case when p_mine then r.user_id=auth.uid() and r.status <> 'withdrawn' else r.status='approved' end
 order by 12 desc,r.created_at desc,r.id limit 20 offset greatest(0,least(p_offset,10000));
$$;
create function public.recipe_submit(p_product text,p_title text,p_ingredients text,p_instructions text,p_storage text,p_cautions text,p_source text default '',p_photos text[] default '{}') returns uuid
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_user(); result uuid; photo text;
begin
 perform public.community_limit(who,'recipe',3);
 if p_photos is null or cardinality(p_photos)>3 or cardinality(p_photos)<>(select count(distinct x) from unnest(p_photos) x)
 then raise exception 'Choose up to three different photos.'; end if;
 foreach photo in array p_photos loop
  if photo not like who::text || '/%' or not exists(select 1 from storage.objects where bucket_id='recipe-photos' and name=photo)
   or exists(select 1 from public.community_recipes where photo=any(photo_paths) and status <> 'withdrawn')
  then raise exception 'A photo is unavailable or belongs to another submission.'; end if;
 end loop;
 insert into public.community_recipes(product_id,user_id,title,ingredients,instructions,storage_notes,cautions,source,photo_paths)
 values(p_product,who,btrim(p_title),btrim(p_ingredients),btrim(p_instructions),btrim(p_storage),btrim(p_cautions),btrim(p_source),p_photos)
 returning id into result; return result;
end $$;
create function public.recipe_vote(p_recipe uuid,p_value smallint) returns void
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_user(); old_value smallint;
begin
 perform pg_advisory_xact_lock(hashtextextended(who::text,0));
 if p_value is null or p_value not in (-1,0,1) then raise exception 'Choose upvote, downvote, or remove vote.'; end if;
 if not exists(select 1 from public.community_recipes where id=p_recipe and status='approved') then raise exception 'Recipe is unavailable.'; end if;
 select value into old_value from public.recipe_votes where recipe_id=p_recipe and user_id=who;
 if coalesce(old_value,0)=p_value then return; end if;
 perform public.community_limit(who,'recipe_vote',60);
 if p_value=0 then delete from public.recipe_votes where recipe_id=p_recipe and user_id=who;
 else insert into public.recipe_votes values(p_recipe,who,p_value) on conflict(recipe_id,user_id) do update set value=excluded.value; end if;
end $$;
create function public.recipe_withdraw(p_recipe uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_user(); photos text[];
begin
 update public.community_recipes set status='withdrawn' where id=p_recipe and user_id=who returning photo_paths into photos;
 if not found then raise exception 'You can only remove your own recipes.'; end if;
 delete from public.recipe_votes where recipe_id=p_recipe;
 return photos;
end $$;
create function public.recipe_report(p_recipe uuid,p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_user();
begin
 perform pg_advisory_xact_lock(hashtextextended(who::text,0));
 if not exists(select 1 from public.community_recipes where id=p_recipe and status='approved') then raise exception 'Recipe is unavailable.'; end if;
 if exists(select 1 from public.recipe_reports where recipe_id=p_recipe and user_id=who) then return; end if;
 perform public.community_limit(who,'recipe_report',10);
 insert into public.recipe_reports values(p_recipe,who,p_reason,now());
end $$;
-- Comments no longer require choosing a nickname. No public profiles.
create or replace function public.community_post(p_product text,p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_user(); result uuid;
begin
 if char_length(btrim(p_body)) not between 1 and 1000 or p_body is null then raise exception 'Comments must be between 1 and 1000 characters.'; end if;
 perform public.community_limit(who,'post',5);
 insert into public.community_profiles values(who,'Community member') on conflict do nothing;
 insert into public.community_comments(product_id,user_id,body) values(p_product,who,btrim(p_body)) returning id into result;
 return result;
end $$;
revoke all on function public.recipe_photo_readable(text),public.recipe_photo_uploadable(text),public.recipe_photo_removable(text),
 public.recipe_list(text,boolean,integer),public.recipe_submit(text,text,text,text,text,text,text,text[]),public.recipe_vote(uuid,smallint),public.recipe_withdraw(uuid),public.recipe_report(uuid,text) from public,anon,authenticated;
grant execute on function public.recipe_photo_readable(text),public.recipe_list(text,boolean,integer) to anon,authenticated;
grant execute on function public.recipe_photo_uploadable(text),public.recipe_photo_removable(text),public.recipe_submit(text,text,text,text,text,text,text,text[]),public.recipe_vote(uuid,smallint),public.recipe_withdraw(uuid),public.recipe_report(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
