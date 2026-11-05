begin;
do $$
declare owner_id uuid:=gen_random_uuid(); other_id uuid:=gen_random_uuid(); result jsonb;
begin
 insert into auth.users(id,email,email_confirmed_at) values(owner_id,'history-owner@example.invalid',now()),(other_id,'history-other@example.invalid',now());
 insert into public.recipe_concerns(user_id,product_id,recipe_id,reason,details,recipe_snapshot) values
 (owner_id,'topic','owner-recipe','Other','Private details',jsonb_build_object('title','My reported recipe')),
 (other_id,'topic','other-recipe','Other','Other private details',jsonb_build_object('title','Other account recipe'));
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 select jsonb_agg(to_jsonb(r)) into result from public.community_my_recipe_concerns() r;
 if jsonb_array_length(result)<>1 or result->0->>'title'<>'My reported recipe' then raise exception 'Concern history leaked another account or lost title'; end if;
 if (result->0) ? 'details' or (result->0) ? 'user_id' or (result->0) ? 'recipe_snapshot' then raise exception 'Concern history exposed unnecessary private data'; end if;
 if has_function_privilege('anon','public.community_my_recipe_concerns()','execute') then raise exception 'Anonymous history access granted'; end if;
 perform set_config('request.jwt.claim.sub',other_id::text,true);
 if (select count(*) from public.community_my_recipe_concerns())<>1 then raise exception 'Account-scoped history failed'; end if;
 delete from auth.users where id=owner_id;
 if exists(select 1 from public.recipe_concerns where user_id=owner_id) then raise exception 'Deleted reporter left concern history'; end if;
end $$;
rollback;
