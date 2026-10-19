begin;
insert into auth.users(id,email,email_confirmed_at) values('71000000-0000-0000-0000-000000000001','recipe-comment-test@example.com',now());
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select public.community_accept_policy('2026-10-19.1');
select public.recipe_comment_post('natural-glass-cleaner','builtin:glassCleanerRecipe','Only on the alcohol recipe');
select public.recipe_comment_post('natural-glass-cleaner','builtin:vinegarGlassRecipe','Only on the vinegar recipe');
do $$ begin
 if (select count(*) from public.community_list('natural-glass-cleaner'))<>0 then raise exception 'Scoped comment leaked into legacy product discussion'; end if;
 if (select count(*) from public.recipe_comments_list('natural-glass-cleaner','builtin:glassCleanerRecipe'))<>1 then raise exception 'Recipe isolation failed'; end if;
 if (select body from public.recipe_comments_list('natural-glass-cleaner','builtin:vinegarGlassRecipe'))<>'Only on the vinegar recipe' then raise exception 'Wrong recipe comment'; end if;
 if (select public_count from public.recipe_comments_list('natural-glass-cleaner','builtin:glassCleanerRecipe'))<>0 then raise exception 'Pending comment counted as public'; end if;
 begin
  perform public.recipe_comment_post('natural-toothpaste','builtin:glassCleanerRecipe','Wrong product');
  raise exception 'Invalid target accepted';
 exception when raise_exception then if sqlerrm='Invalid target accepted' then raise; end if; end;
end $$;
reset role;
update public.community_comments set moderation_status='approved',review_record=jsonb_build_object('reviewer','Test','note','Test review','reviewed_at',now()) where recipe_key='builtin:glassCleanerRecipe';
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if (select count(*) from public.recipe_comments_list('natural-glass-cleaner','builtin:glassCleanerRecipe'))<>1 then raise exception 'Approved comment missing'; end if;
 if (select count(*) from public.recipe_comments_list('natural-glass-cleaner','builtin:vinegarGlassRecipe'))<>0 then raise exception 'Pending comment leaked'; end if;
 if (select public_count from public.recipe_comments_list('natural-glass-cleaner','builtin:glassCleanerRecipe'))<>1 then raise exception 'Wrong public count'; end if;
end $$;
rollback;
