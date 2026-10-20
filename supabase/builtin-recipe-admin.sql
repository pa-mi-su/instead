-- Repeatable. Apply after recipe-comments.sql, recipe-voting.sql, and admin-panel.sql.
begin;

alter table public.community_builtin_recipes
 add column if not exists recipe_content jsonb,
 add column if not exists is_active boolean not null default true,
 add column if not exists admin_created boolean not null default false,
 add column if not exists updated_at timestamptz not null default now();

create table if not exists public.community_builtin_recipe_audit (
 id uuid primary key default gen_random_uuid(),
 actor uuid references auth.users on delete set null,
 recipe_id text not null,
 product_id text not null,
 action text not null check(action in ('created','updated','archived','restored')),
 note text not null,
 before_content jsonb,
 after_content jsonb,
 created_at timestamptz not null default now()
);
create index if not exists builtin_recipe_audit_time
 on public.community_builtin_recipe_audit(created_at desc,id desc);
alter table public.community_builtin_recipe_audit enable row level security;
revoke all on public.community_builtin_recipe_audit from public,anon,authenticated;

create or replace function public.builtin_recipe_catalog() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',id,'product_id',product_id,'title',title,'recipe_content',
  case when is_active then recipe_content else null end,'is_active',is_active
 ) order by product_id,title,id),'[]'::jsonb)
 from public.community_builtin_recipes
 where recipe_content is not null or not is_active;
$$;

create or replace function public.community_builtin_admin(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 admin_user uuid:=auth.uid();
 reviewer text;
 target text:=p_payload->>'id';
 product text:=p_payload->>'product_id';
 note text:=btrim(coalesce(p_payload->>'note',''));
 content jsonb:=p_payload->'recipe';
 prior public.community_builtin_recipes%rowtype;
 was_found boolean:=false;
 active boolean;
 action_name text;
 field_name text;
 values_json jsonb;
begin
 if not public.community_is_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>40000
 then raise exception 'Invalid built-in recipe request.'; end if;
 if p_action='list' then
  select coalesce(jsonb_agg(to_jsonb(q) order by q.product_id,q.title,q.id),'[]'::jsonb) into content
  from (select id,product_id,title,recipe_content,is_active,admin_created,updated_at
        from public.community_builtin_recipes order by product_id,title,id limit 500) q;
  return jsonb_build_object('items',content);
 end if;
 if p_action not in ('save','set_active') then raise exception 'Unknown built-in recipe action.'; end if;
 if length(note) not between 3 and 2000 then raise exception 'Enter an action reason (3–2000 characters).'; end if;
 select label into reviewer from public.community_admins where user_id=admin_user;
 perform pg_advisory_xact_lock(hashtextextended(admin_user::text,129));
 if (select count(*) from public.community_admin_audit where community_admin_audit.actor=admin_user and created_at>now()-interval '1 hour')>=240
 then raise exception 'Admin action limit reached. Try later.'; end if;
 if target is null or length(target) not between 8 and 160 then raise exception 'Choose a recipe.'; end if;
 select * into prior from public.community_builtin_recipes where id=target for update;
 was_found:=found;
 if p_action='save' then
  if jsonb_typeof(content) is distinct from 'object'
   or length(btrim(coalesce(content->>'name',''))) not between 3 and 120
   or jsonb_typeof(content->'ingredients') is distinct from 'array'
   or case when jsonb_typeof(content->'ingredients')='array'
      then jsonb_array_length(content->'ingredients') not between 1 and 40 else true end
   or jsonb_typeof(content->'equipment') is distinct from 'array'
   or case when jsonb_typeof(content->'equipment')='array'
      then jsonb_array_length(content->'equipment')>20 else true end
   or jsonb_typeof(content->'instructions') is distinct from 'array'
   or case when jsonb_typeof(content->'instructions')='array'
      then jsonb_array_length(content->'instructions') not between 1 and 40 else true end
   or length(btrim(coalesce(content->>'storage',''))) not between 3 and 4000
   or length(btrim(coalesce(content->>'cautions',''))) not between 3 and 4000
   or octet_length(content::text)>24000
  then raise exception 'Complete the recipe name, ingredients, instructions, storage, and cautions within the field limits.'; end if;
  for field_name,values_json in select key,value from jsonb_each(content)
   where key in ('ingredients','equipment','instructions')
  loop
    if exists(select 1 from jsonb_array_elements(values_json) as entries(item)
      where jsonb_typeof(item)<>'string' or length(btrim(item#>>'{}')) not between 1 and 1000)
   then raise exception 'Recipe list entries must be plain text between 1 and 1000 characters.'; end if;
  end loop;
  if product is null or not exists(select 1 from public.community_products where id=product)
  then raise exception 'Choose an existing app topic.'; end if;
  if was_found and prior.product_id<>product then raise exception 'A recipe cannot be moved to another topic after it is created.'; end if;
  if not was_found and target not like 'admin:%' then raise exception 'New recipe IDs must be generated by the admin panel.'; end if;
  content:=content||jsonb_build_object('id',target);
  action_name:=case when was_found and prior.recipe_content is not null then 'updated' when was_found then 'updated' else 'created' end;
  if was_found then
   update public.community_builtin_recipes set title=btrim(content->>'name'),recipe_content=content,
    is_active=true,updated_at=clock_timestamp() where id=target;
  else
   insert into public.community_builtin_recipes(id,product_id,title,recipe_content,is_active,admin_created,updated_at)
   values(target,product,btrim(content->>'name'),content,true,true,clock_timestamp());
  end if;
  insert into public.community_builtin_recipe_audit(actor,recipe_id,product_id,action,note,before_content,after_content)
  values(admin_user,target,product,action_name,note,case when was_found then prior.recipe_content end,content);
  insert into public.community_admin_audit(actor,action,kind,content_id,subject_user,note)
  values(admin_user,'builtin_'||action_name,'builtin_recipe',null,null,left(target||' · '||note,2000));
  return jsonb_build_object('ok',true,'id',target,'action',action_name);
 end if;
 if not was_found then raise exception 'Recipe is unavailable.'; end if;
 if jsonb_typeof(p_payload->'active') is distinct from 'boolean' then raise exception 'Choose whether the recipe should be active.'; end if;
 active:=(p_payload->>'active')::boolean;
 update public.community_builtin_recipes set is_active=active,updated_at=clock_timestamp() where id=target;
 action_name:=case when active then 'restored' else 'archived' end;
 insert into public.community_builtin_recipe_audit(actor,recipe_id,product_id,action,note,before_content,after_content)
 values(admin_user,target,prior.product_id,action_name,note,prior.recipe_content,prior.recipe_content);
 insert into public.community_admin_audit(actor,action,kind,content_id,subject_user,note)
 values(admin_user,'builtin_'||action_name,'builtin_recipe',null,null,left(target||' · '||note,2000));
 return jsonb_build_object('ok',true,'id',target,'action',action_name);
end $$;

create or replace function public.builtin_recipe_rating(p_product text,p_recipe text)
returns table(score bigint,upvotes bigint,downvotes bigint,my_vote smallint)
language sql stable security definer set search_path='' as $$
 select coalesce(sum(v.value),0)::bigint,count(*) filter(where v.value=1)::bigint,
        count(*) filter(where v.value=-1)::bigint,
        coalesce(max(v.value) filter(where v.user_id=auth.uid()),0)::smallint
 from public.community_builtin_recipes r left join public.builtin_recipe_votes v on v.recipe_id=r.id
 where r.id=p_recipe and r.product_id=p_product and r.is_active group by r.id;
$$;
create or replace function public.builtin_recipe_vote(p_product text,p_recipe text,p_value smallint)
returns void language plpgsql security definer set search_path='' as $$
declare who uuid:=public.community_require_contributor(); old_value smallint;
begin
 perform pg_advisory_xact_lock(hashtextextended(who::text,0));
 if p_value is null or p_value not in (-1,0,1) then raise exception 'Choose an upvote, downvote, or remove your vote.'; end if;
 if not exists(select 1 from public.community_builtin_recipes where id=p_recipe and product_id=p_product and is_active)
 then raise exception 'Recipe is unavailable.'; end if;
 select value into old_value from public.builtin_recipe_votes where recipe_id=p_recipe and user_id=who;
 if coalesce(old_value,0)=p_value then return; end if;
 perform public.community_limit(who,'builtin_recipe_vote',60);
 if p_value=0 then delete from public.builtin_recipe_votes where recipe_id=p_recipe and user_id=who;
 else insert into public.builtin_recipe_votes(recipe_id,user_id,value) values(p_recipe,who,p_value)
 on conflict(recipe_id,user_id) do update set value=excluded.value; end if;
end $$;

create or replace function public.recipe_comment_target(p_product text,p_recipe text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_builtin_recipes where id=p_recipe and product_id=p_product and is_active)
 or exists(select 1 from public.community_recipes where id::text=p_recipe and product_id=p_product and status='approved' and admin_removed_at is null and public.community_author_visible(user_id));
$$;

revoke all on function public.builtin_recipe_catalog(),public.community_builtin_admin(text,jsonb) from public,anon,authenticated;
grant execute on function public.builtin_recipe_catalog() to anon,authenticated;
grant execute on function public.community_builtin_admin(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
