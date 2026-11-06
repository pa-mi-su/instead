-- Repeatable; apply after session-account-state.sql. No existing exclusions change.
begin;
create index if not exists recipe_votes_by_user on public.recipe_votes(user_id);
create index if not exists builtin_recipe_votes_by_user on public.builtin_recipe_votes(user_id);
create index if not exists community_votes_by_user on public.community_votes(user_id);

-- Internal inventory of direct and contributor-derived exclusions. No client grant.
create or replace function public.community_admin_exclusion_rows(p_user uuid)
returns table(product_id text,recipe_id text,title text,source text,reason text,created_at timestamptz,
 contributor_id uuid,contributor text,scope text,published boolean,affected_recipes bigint)
language sql stable security definer set search_path='' as $$
 select v.product_id,v.recipe_id,coalesce(b.title,c.recipe_snapshot->>'title',v.recipe_id),'catalogue',v.reason,v.created_at,
 null::uuid,null::text,'recipe',coalesce(b.is_active,false),1::bigint
 from public.community_recipe_visibility v
 left join public.community_builtin_recipes b on b.id=v.recipe_id and b.product_id=v.product_id
 left join lateral (select recipe_snapshot from public.recipe_concerns where user_id=v.user_id and recipe_id=v.recipe_id and product_id=v.product_id order by created_at desc,id limit 1) c on true
 where v.user_id=p_user and not exists(select 1 from public.community_recipes r where r.id::text=v.recipe_id and r.product_id=v.product_id)
 union all
 select r.product_id,r.id::text,r.title,'community',coalesce(v.reason,'contributor'),coalesce(v.created_at,b.created_at),
 r.user_id,p.username,case when b.id is not null then 'contributor' else 'recipe' end,
 r.status='approved' and r.admin_removed_at is null,
 case when b.id is not null then (select count(*) from public.community_recipes x where x.user_id=r.user_id) else 1::bigint end
 from public.community_recipes r
 left join public.community_recipe_visibility v on v.user_id=p_user and v.product_id=r.product_id and v.recipe_id=r.id::text
 left join public.community_blocks b on b.user_id=p_user and b.blocked_user=r.user_id
 left join public.community_profiles p on p.user_id=r.user_id
 where v.user_id is not null or b.id is not null
 union all
 select null::text,'contributor:'||b.blocked_user,'Contributor '||coalesce('@'||p.username,b.blocked_user::text),'community','contributor',b.created_at,
 b.blocked_user,p.username,'contributor',false,0::bigint
 from public.community_blocks b left join public.community_profiles p on p.user_id=b.blocked_user
 where b.user_id=p_user and not exists(select 1 from public.community_recipes r where r.user_id=b.blocked_user);
$$;
revoke all on function public.community_admin_exclusion_rows(uuid) from public,anon,authenticated;

create or replace function public.community_admin_user_directory(p_search text default '',p_offset integer default 0,p_filter text default 'all')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare needle text:=btrim(coalesce(p_search,'')); items jsonb; total_n bigint;
begin
 if not public.community_is_admin() then raise exception 'Administrator access with recent MFA required.' using errcode='42501'; end if;
 if char_length(needle)>100 or p_offset is null or p_offset<0 or p_offset>100000 or p_filter is null or p_filter not in ('all','excluded','pending') then raise exception 'Invalid user filters.'; end if;
 with matches as (
 select u.id as user_id,u.email,p.username,u.created_at,u.last_sign_in_at,u.email_confirmed_at,
 u.email_confirmed_at is not null as verified,coalesce(c.suspended,false) as suspended,c.deletion_requested_at,
 exists(select 1 from public.community_admins a where a.user_id=u.id and a.enabled) as is_admin,
 exists(select 1 from public.community_admins a where a.user_id=u.id) as has_admin_membership
 from auth.users u left join public.community_profiles p on p.user_id=u.id
 left join public.community_account_controls c on c.user_id=u.id
 where not coalesce(u.is_anonymous,false)
 and (needle='' or u.email ilike '%'||needle||'%' or p.username ilike '%'||needle||'%' or u.id::text=needle)
 and (p_filter='all' or (p_filter='pending' and u.email_confirmed_at is null)
 or (p_filter='excluded' and (exists(select 1 from public.community_recipe_visibility v where v.user_id=u.id) or exists(select 1 from public.community_blocks b where b.user_id=u.id))))
 ) select (select count(*) from matches),coalesce((select jsonb_agg(to_jsonb(page)) from (select m.*,
 (select count(*) from public.community_recipes r where r.user_id=m.user_id) as recipes,
 (select count(*) from public.community_recipe_visibility v where v.user_id=m.user_id) as direct_exclusions,
 (select count(*) from public.community_blocks b where b.user_id=m.user_id) as contributor_exclusions
 from (select * from matches order by created_at desc,user_id limit 20 offset p_offset) m) page),'[]'::jsonb) into total_n,items;
 return jsonb_build_object('items',items,'total',total_n,'offset',p_offset,'limit',20);
end $$;

create or replace function public.community_admin_user_activity(p_user uuid,p_section text default 'overview',p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare account jsonb; stats jsonb; items jsonb:='[]'; total_n bigint:=0;
begin
 if not public.community_is_admin() then raise exception 'Administrator access with recent MFA required.' using errcode='42501'; end if;
 if p_user is null or p_section is null or p_section not in ('overview','recipes','votes','reports','exclusions','saves','comments','terms','audit')
 or p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'Invalid activity request.'; end if;
 select jsonb_build_object('user_id',u.id,'email',u.email,'created_at',u.created_at,'last_sign_in_at',u.last_sign_in_at,
 'email_confirmed_at',u.email_confirmed_at,'username',p.username,'bio',p.bio,'avatar_path',p.avatar_path,
 'suspended',coalesce(c.suspended,false),'banned_until',u.banned_until,'deletion_requested_at',c.deletion_requested_at,
 'is_admin',exists(select 1 from public.community_admins a where a.user_id=u.id and a.enabled)) into account
 from auth.users u left join public.community_profiles p on p.user_id=u.id left join public.community_account_controls c on c.user_id=u.id where u.id=p_user;
 if account is null then raise exception 'Account no longer exists. Refresh the user list.'; end if;
 select jsonb_build_object(
 'recipes',(select count(*) from public.community_recipes where user_id=p_user),
 'published_recipes',(select count(*) from public.community_recipes where user_id=p_user and status='approved' and admin_removed_at is null),
 'pending_recipes',(select count(*) from public.community_recipes where user_id=p_user and status='pending' and admin_removed_at is null),
 'votes',(select count(*) from public.recipe_votes where user_id=p_user)+(select count(*) from public.builtin_recipe_votes where user_id=p_user)+(select count(*) from public.community_votes where user_id=p_user),
 'upvotes',(select count(*) from public.recipe_votes where user_id=p_user and value=1)+(select count(*) from public.builtin_recipe_votes where user_id=p_user and value=1)+(select count(*) from public.community_votes where user_id=p_user),
 'downvotes',(select count(*) from public.recipe_votes where user_id=p_user and value=-1)+(select count(*) from public.builtin_recipe_votes where user_id=p_user and value=-1),
 'reports',(select count(*) from public.recipe_concerns where user_id=p_user),
 'open_reports',(select count(*) from public.recipe_concerns where user_id=p_user and reviewed_at is null),
 'hidden_recipes',(select count(*) from public.community_admin_exclusion_rows(p_user) where product_id is not null),
 'direct_exclusions',(select count(*) from public.community_recipe_visibility where user_id=p_user),
 'contributor_exclusions',(select count(*) from public.community_blocks where user_id=p_user),
 'saved_guides',(select count(*) from public.community_saved_guides where user_id=p_user),
 'saved_recipes',(select count(*) from public.community_saved_recipes where user_id=p_user),
 'comments',(select count(*) from public.community_comments where user_id=p_user)) into stats;
 if p_section='recipes' then
  with rows as (select id::text as id,product_id,title,status,created_at,admin_removed_at,moderation_note from public.community_recipes where user_id=p_user)
  select (select count(*) from rows),coalesce((select jsonb_agg(to_jsonb(page)) from (select * from rows order by created_at desc,id limit 20 offset p_offset)page),'[]') into total_n,items;
 elsif p_section='votes' then
  with rows as (
   select 'community:'||v.recipe_id as id,r.product_id,r.title,'community recipe'::text as kind,v.value::integer as value from public.recipe_votes v join public.community_recipes r on r.id=v.recipe_id where v.user_id=p_user
   union all select 'catalogue:'||v.recipe_id,b.product_id,b.title,'catalogue recipe',v.value::integer from public.builtin_recipe_votes v join public.community_builtin_recipes b on b.id=v.recipe_id where v.user_id=p_user
   union all select 'comment:'||v.comment_id,c.product_id,left(c.body,100),'comment',1 from public.community_votes v join public.community_comments c on c.id=v.comment_id where v.user_id=p_user)
  select (select count(*) from rows),coalesce((select jsonb_agg(to_jsonb(page)) from (select * from rows order by id limit 20 offset p_offset)page),'[]') into total_n,items;
 elsif p_section='reports' then
  with rows as (select id::text as id,product_id,recipe_id,coalesce(recipe_snapshot->>'title',recipe_id) as title,reason,details,created_at,reviewed_at,emailed_at from public.recipe_concerns where user_id=p_user)
  select (select count(*) from rows),coalesce((select jsonb_agg(to_jsonb(page)) from (select * from rows order by created_at desc,id limit 20 offset p_offset)page),'[]') into total_n,items;
 elsif p_section='exclusions' then
  with rows as (select coalesce(product_id||':','')||recipe_id as id,e.* from public.community_admin_exclusion_rows(p_user)e)
  select (select count(*) from rows),coalesce((select jsonb_agg(to_jsonb(page)) from (select * from rows order by created_at desc,id limit 20 offset p_offset)page),'[]') into total_n,items;
 elsif p_section='saves' then
  with rows as (
   select 'guide:'||product_id as id,product_id,product_id as title,'guide'::text as kind,saved_at as created_at from public.community_saved_guides where user_id=p_user
   union all select 'recipe:'||product_id||':'||recipe_id,product_id,recipe_title,'recipe',saved_at from public.community_saved_recipes where user_id=p_user)
  select (select count(*) from rows),coalesce((select jsonb_agg(to_jsonb(page)) from (select * from rows order by created_at desc,id limit 20 offset p_offset)page),'[]') into total_n,items;
 elsif p_section='comments' then
  with rows as (select id::text as id,product_id,body as title,moderation_status as status,created_at,hidden from public.community_comments where user_id=p_user)
  select (select count(*) from rows),coalesce((select jsonb_agg(to_jsonb(page)) from (select * from rows order by created_at desc,id limit 20 offset p_offset)page),'[]') into total_n,items;
 elsif p_section='terms' then
  with rows as (select version as id,version as title,accepted_at as created_at from public.community_policy_acceptances where user_id=p_user)
  select (select count(*) from rows),coalesce((select jsonb_agg(to_jsonb(page)) from (select * from rows order by created_at desc,id limit 20 offset p_offset)page),'[]') into total_n,items;
 elsif p_section='audit' then
  with rows as (select id::text as id,action as title,kind,note,created_at,actor from public.community_admin_audit where subject_user=p_user or actor=p_user)
  select (select count(*) from rows),coalesce((select jsonb_agg(to_jsonb(page)) from (select * from rows order by created_at desc,id limit 20 offset p_offset)page),'[]') into total_n,items;
 end if;
 return jsonb_build_object('user',account,'stats',stats,'section',p_section,'items',items,'total',total_n,'offset',p_offset,'limit',20);
end $$;

create or replace function public.community_admin_restore_exclusion(p_user uuid,p_email text,p_scope text,p_product text default null,p_recipe text default null,p_contributor uuid default null,p_note text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare actual_email text; author_id uuid; removed_n integer:=0; blocks_n integer:=0; n integer; affected_n bigint:=0;
begin
 if not public.community_is_admin() then raise exception 'Administrator access with recent MFA required.' using errcode='42501'; end if;
 if p_user is null or p_scope is null or p_scope not in ('recipe','contributor') or char_length(btrim(coalesce(p_note,''))) not between 3 and 1000 then raise exception 'Choose a restore scope and provide a reason of 3–1000 characters.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select email into actual_email from auth.users where id=p_user for update;
 if not found then raise exception 'Account no longer exists. Refresh the user list.'; end if;
 if lower(btrim(coalesce(p_email,''))) is distinct from lower(actual_email) then raise exception 'Account email changed. Refresh before restoring.'; end if;
 if exists(select 1 from public.community_account_controls where user_id=p_user and deletion_requested_at is not null) then raise exception 'This account is pending deletion. Visibility cannot be restored.'; end if;
 if p_scope='recipe' then
  if p_product is null or p_recipe is null then raise exception 'Choose a recipe.'; end if;
  select user_id into author_id from public.community_recipes where id::text=p_recipe and product_id=p_product;
  if exists(select 1 from public.community_blocks where user_id=p_user and blocked_user=author_id) then raise exception 'A contributor exclusion also hides this recipe. Restore the contributor scope instead.'; end if;
  delete from public.community_recipe_visibility where user_id=p_user and product_id=p_product and recipe_id=p_recipe;
  get diagnostics removed_n=row_count; affected_n:=removed_n;
 else
  if p_contributor is null or p_contributor=p_user then raise exception 'Choose another contributor.'; end if;
  select count(*) into affected_n from public.community_admin_exclusion_rows(p_user) where contributor_id=p_contributor;
  delete from public.community_blocks where user_id=p_user and blocked_user=p_contributor;
  get diagnostics blocks_n=row_count;
  delete from public.community_recipe_visibility v where v.user_id=p_user and exists(select 1 from public.community_recipes r where r.id::text=v.recipe_id and r.product_id=v.product_id and r.user_id=p_contributor);
  get diagnostics removed_n=row_count;
 end if;
 if removed_n+blocks_n>0 then
  insert into public.community_admin_audit(actor,action,kind,subject_user,note)
  values(auth.uid(),'personal_visibility_restored','account',p_user,
   'Scope: '||p_scope||'; target: '||coalesce(p_contributor::text,p_product||'/'||p_recipe)||'; affected recipes: '||affected_n||'. Reason: '||btrim(p_note));
 end if;
 return jsonb_build_object('restored',removed_n+blocks_n>0,'affected_recipes',affected_n,'direct_exclusions_removed',removed_n,'contributor_exclusions_removed',blocks_n);
end $$;
revoke all on function public.community_admin_user_directory(text,integer,text),public.community_admin_user_activity(uuid,text,integer),public.community_admin_restore_exclusion(uuid,text,text,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.community_admin_user_directory(text,integer,text),public.community_admin_user_activity(uuid,text,integer),public.community_admin_restore_exclusion(uuid,text,text,text,text,uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
