-- Apply after recipe-concerns.sql. Only the caller's concern summaries are exposed.
begin;
alter table public.recipe_concerns add column if not exists hidden_at timestamptz;
-- Atomic replacement adds an optional response field without changing old clients.
drop function if exists public.community_my_recipe_concerns();
create function public.community_my_recipe_concerns()
returns table(id uuid,product_id text,recipe_id text,title text,reason text,created_at timestamptz,reviewed_at timestamptz,hidden_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
declare who uuid:=public.community_require_user();
begin
 return query select c.id,c.product_id,c.recipe_id,
 coalesce(nullif(c.recipe_snapshot->>'title',''),nullif(c.recipe_snapshot->>'name',''),'Recipe no longer available'),
 c.reason,c.created_at,c.reviewed_at,c.hidden_at
 from public.recipe_concerns c where c.user_id=who order by c.created_at desc,c.id desc limit 500;
end $$;
revoke all on function public.community_my_recipe_concerns() from public,anon;
grant execute on function public.community_my_recipe_concerns() to authenticated;
create or replace function public.community_concern_history_visibility(p_recipes text[],p_hidden boolean,p_expected_user uuid,p_only_reviewed boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare who uuid:=public.community_require_user();
begin
 if p_expected_user is distinct from who then raise exception 'Account changed. Please try again.' using errcode='42501'; end if;
 if p_recipes is null or cardinality(p_recipes) not between 1 and 500 or p_hidden is null or p_only_reviewed is null
  or exists(select 1 from unnest(p_recipes) r where r is null or length(r) not between 1 and 150)
 then raise exception 'Choose valid history entries.'; end if;
 perform public.community_limit(who,'concern_history',60);
 -- Only visibility changes: report contents, review status, delivery, and duplicate guards remain intact.
 update public.recipe_concerns c set hidden_at=case when p_hidden then now() else null end
 where c.user_id=who and c.recipe_id=any(p_recipes)
 and (not p_only_reviewed or not exists(select 1 from public.recipe_concerns pending where pending.user_id=who and pending.recipe_id=c.recipe_id and pending.reviewed_at is null));
end $$;
revoke all on function public.community_concern_history_visibility(text[],boolean,uuid,boolean) from public,anon;
grant execute on function public.community_concern_history_visibility(text[],boolean,uuid,boolean) to authenticated;
commit;
