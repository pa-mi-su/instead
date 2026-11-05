begin;
do $$
declare who uuid:=gen_random_uuid(); product text; recipe text; result uuid; again uuid; denied boolean:=false; author_id uuid:=gen_random_uuid(); user_recipe uuid:=gen_random_uuid(); user_concern uuid;
begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous,raw_user_meta_data) values(who,'qa-reports-'||who::text||'@insteadtry.com',now(),false,'{}');
 perform set_config('request.jwt.claim.sub',who::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',who,'role','authenticated')::text,true);
 select id,product_id into recipe,product from public.community_builtin_recipes where is_active limit 1;
 result:=public.recipe_concern_submit(product,recipe,'Other','Transactional QA concern. No email should be sent.');
 again:=public.recipe_concern_submit(product,recipe,'Other','Transactional QA concern. No email should be sent.');
 if result<>again then raise exception 'Duplicate concern was not reused'; end if;
 if has_table_privilege('authenticated','public.recipe_concerns','SELECT') then raise exception 'Private reports exposed'; end if;
 begin perform public.recipe_concerns_admin('list',jsonb_build_object('recipes',jsonb_build_array(recipe))); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Non-admin accessed report queue'; end if;
 recipe:='admin:'||gen_random_uuid()::text;
 insert into public.community_builtin_recipes(id,product_id,title,is_active) values(recipe,product,'Transactional QA recipe',true);
 again:=public.recipe_concern_submit(product,recipe,'Other','Transactional admin-created recipe concern.');
 if again is null then raise exception 'Admin-created recipe cannot be reported'; end if;
 insert into auth.users(id,email,email_confirmed_at) values(author_id,'qa-author-'||author_id::text||'@example.invalid',now());
 insert into public.community_recipes(id,product_id,user_id,title,ingredients,instructions,storage_notes,cautions,status,review_record)
 values(user_recipe,product,author_id,'QA published recipe','Water and soap','Mix carefully','Store safely','Do not eat','approved',jsonb_build_object('reviewer','Fixture admin','note','Reviewed test recipe','reviewed_at',now()));
 user_concern:=public.recipe_concern_submit(product,user_recipe::text,'Other','First review concern.');
 update public.recipe_reports set created_at=now()-interval '1 hour' where recipe_id=user_recipe;
 insert into public.community_report_reviews(kind,content_id,reviewed_at) values('recipe',user_recipe,now()-interval '30 minutes');
 update public.recipe_concerns set created_at=now()-interval '2 days',reviewed_at=now()-interval '1 hour' where id=user_concern;
 if public.recipe_concern_submit(product,user_recipe::text,'Unsafe advice','Changed text after review.')<>user_concern then raise exception 'Same account created a second concern after review'; end if;
 if (select count(*) from public.recipe_concerns where recipe_id=user_recipe::text and user_id=who)<>1 then raise exception 'Duplicate report created'; end if;
 if exists(select 1 from public.recipe_reports where recipe_id=user_recipe and created_at>(select reviewed_at from public.community_report_reviews where kind='recipe' and content_id=user_recipe)) then raise exception 'Duplicate report reopened review'; end if;
 delete from auth.users where id=author_id;
 if (select recipe_snapshot->>'deleted' from public.recipe_concerns where id=user_concern) is distinct from 'true' then raise exception 'Deleted author recipe content retained in reports'; end if;
 perform set_config('request.jwt.claim.role','service_role',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',who,'role','service_role')::text,true);
 if not public.recipe_concern_claim(result) then raise exception 'Initial email claim failed'; end if;
 if public.recipe_concern_claim(result) then raise exception 'Concurrent email claim was not blocked'; end if;
 delete from auth.users where id=who;
 if exists(select 1 from public.recipe_concerns where user_id=who) then raise exception 'Deleted reporter left private concern records'; end if;
end $$;
rollback;
