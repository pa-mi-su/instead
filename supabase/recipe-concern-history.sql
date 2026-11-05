-- Apply after recipe-concerns.sql. Only the caller's concern summaries are exposed.
begin;
create or replace function public.community_my_recipe_concerns()
returns table(id uuid,product_id text,recipe_id text,title text,reason text,created_at timestamptz,reviewed_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
declare who uuid:=public.community_require_user();
begin
 return query select c.id,c.product_id,c.recipe_id,
 coalesce(nullif(c.recipe_snapshot->>'title',''),nullif(c.recipe_snapshot->>'name',''),'Recipe no longer available'),
 c.reason,c.created_at,c.reviewed_at
 from public.recipe_concerns c where c.user_id=who order by c.created_at desc,c.id desc limit 500;
end $$;
revoke all on function public.community_my_recipe_concerns() from public,anon;
grant execute on function public.community_my_recipe_concerns() to authenticated;
commit;
