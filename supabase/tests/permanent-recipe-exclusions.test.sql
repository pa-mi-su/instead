begin;
do $$
declare reporter uuid:=gen_random_uuid(); observer uuid:=gen_random_uuid(); author_id uuid:=gen_random_uuid(); other_author uuid:=gen_random_uuid(); r1 uuid:=gen_random_uuid(); r2 uuid:=gen_random_uuid(); r3 uuid:=gen_random_uuid(); own_recipe uuid:=gen_random_uuid(); future_recipe uuid:=gen_random_uuid(); receipt uuid; denied boolean; block_id uuid;
begin
 insert into auth.users(id,email,email_confirmed_at) values(reporter,'permanent-reporter@example.invalid',now()),(observer,'permanent-observer@example.invalid',now()),(author_id,'permanent-author@example.invalid',now()),(other_author,'permanent-other@example.invalid',now());
 insert into public.community_profiles(user_id,nickname,username,bio) values(author_id,'PermanentAuthor','PermanentAuthor',''),(other_author,'PermanentOther','PermanentOther','');
 insert into public.community_builtin_recipes(id,product_id,title,is_active) values('builtin:permanentOne','natural-glass-cleaner','Permanent catalogue one',true),('admin:permanentTwo','natural-glass-cleaner','Permanent catalogue two',true);
 insert into public.community_recipes(id,product_id,user_id,title,ingredients,instructions,storage_notes,cautions,status,review_record) values
 (r1,'natural-glass-cleaner',author_id,'Reported recipe','Water and soap','Mix carefully','Store safely','Do not eat','approved',jsonb_build_object('reviewer','Fixture','note','Reviewed fixture','reviewed_at',now())),
 (r2,'natural-toothpaste',author_id,'Same author other guide','Water and soap','Mix carefully','Store safely','Do not eat','approved',jsonb_build_object('reviewer','Fixture','note','Reviewed fixture','reviewed_at',now())),
 (r3,'natural-glass-cleaner',other_author,'Other contributor','Water and soap','Mix carefully','Store safely','Do not eat','approved',jsonb_build_object('reviewer','Fixture','note','Reviewed fixture','reviewed_at',now())),
 (own_recipe,'natural-glass-cleaner',reporter,'Own recipe','Water and soap','Mix carefully','Store safely','Do not eat','approved',jsonb_build_object('reviewer','Fixture','note','Reviewed fixture','reviewed_at',now()));
 perform set_config('request.jwt.claim.sub',reporter::text,true);
 perform public.community_saved_recipes_set('natural-glass-cleaner',r1::text,'Reported recipe',true);
 perform public.community_saved_recipes_set('natural-toothpaste',r2::text,'Other guide',true);
 receipt:=public.recipe_concern_submit('natural-glass-cleaner',r1::text,'Other','Please check the recipe');
 insert into public.community_recipes(id,product_id,user_id,title,ingredients,instructions,storage_notes,cautions,status,review_record)
 values(future_recipe,'natural-toothpaste',author_id,'Future published recipe','Water and soap','Mix carefully','Store safely','Do not eat','approved',jsonb_build_object('reviewer','Fixture','note','Reviewed fixture','reviewed_at',now()));
 if exists(select 1 from public.recipe_list('natural-toothpaste') where id=future_recipe) then raise exception 'Future recipe by excluded contributor reappeared'; end if;
 if public.community_author_visible(author_id) or public.community_recipe_visible('natural-toothpaste',r2::text) then raise exception 'Reporting did not exclude the contributor across guides'; end if;
 if exists(select 1 from public.recipe_list('natural-toothpaste') where id=r2) then raise exception 'Reported contributor leaked through another guide'; end if;
 if exists(select 1 from public.community_saved_recipes where user_id=reporter and recipe_id in (r1::text,r2::text)) then raise exception 'Excluded bookmarks retained'; end if;
 if exists(select 1 from public.community_saved_recipes_list() where recipe_id in (r1::text,r2::text)) then raise exception 'Reported contributor leaked through Saved'; end if;
 if exists(select 1 from public.community_profile_public('PermanentAuthor')) then raise exception 'Reported contributor profile remains accessible'; end if;
 if (select count(*) from public.community_recipe_exclusions() where recipe_id in (r1::text,r2::text))<>2 then raise exception 'Internal filters lost cross-guide contributor scope'; end if;
 if not exists(select 1 from public.recipe_list('natural-glass-cleaner') where id=r3) then raise exception 'Unrelated contributor incorrectly excluded'; end if;
 if exists(select 1 from public.community_my_recipe_concerns()) or exists(select 1 from public.community_blocks_list()) then raise exception 'History or management data still exposed'; end if;
 select id into block_id from public.community_blocks where user_id=reporter and blocked_user=author_id;
 denied:=false; begin perform public.community_unblock(block_id); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Legacy unblock restored contributor'; end if;
 denied:=false; begin perform public.community_recipe_hide('natural-glass-cleaner',r1::text,false,reporter); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Legacy restore restored recipe'; end if;
 denied:=false; begin perform public.community_concern_history_visibility(array[r1::text],false,reporter); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Legacy history restoration allowed'; end if;
 update public.recipe_concerns set reviewed_at=now() where id=receipt;
 if public.community_recipe_visible('natural-glass-cleaner',r1::text) then raise exception 'Admin review restored personal exclusion'; end if;
 if public.recipe_concern_submit('natural-glass-cleaner',r1::text,'Unsafe advice','Changed text')<>receipt then raise exception 'Review allowed duplicate concern'; end if;
 perform public.recipe_concern_submit('natural-glass-cleaner','builtin:permanentOne','Other','Check catalogue fixture');
 if public.community_recipe_visible('natural-glass-cleaner','builtin:permanentOne') or not public.community_recipe_visible('natural-glass-cleaner','admin:permanentTwo') then raise exception 'Catalogue exclusion scope is incorrect'; end if;
 perform public.community_recipe_hide('natural-glass-cleaner','admin:permanentTwo',true,reporter);
 denied:=false; begin perform public.community_recipe_hide('natural-glass-cleaner','admin:permanentTwo',false,reporter); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Catalogue block can be undone'; end if;
 perform public.community_recipe_hide('natural-glass-cleaner',r3::text,true,reporter);
 if public.community_author_visible(other_author) then raise exception 'Blocking a community recipe did not exclude its contributor'; end if;
 perform public.community_recipe_hide('natural-glass-cleaner',own_recipe::text,true,reporter);
 if exists(select 1 from public.recipe_list('natural-glass-cleaner',true) where id=own_recipe) then raise exception 'Excluded own recipe leaked through guide submissions'; end if;
 if exists(select 1 from public.community_my_recipes() where id=own_recipe) then raise exception 'Excluded recipe leaked in My INSTEAD submissions'; end if;
 denied:=false; begin perform public.community_recipe_hide('natural-glass-cleaner',r1::text,true,observer); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Wrong-account block accepted'; end if;
 perform set_config('request.jwt.claim.sub',observer::text,true);
 if not public.community_author_visible(author_id) or not public.community_author_visible(other_author) then raise exception 'Personal exclusion affected observer'; end if;
 if not exists(select 1 from public.recipe_list('natural-toothpaste') where id=r2) or not exists(select 1 from public.community_profile_public('PermanentAuthor')) then raise exception 'Review unpublished contributor for others'; end if;
 if not public.community_recipe_visible('natural-glass-cleaner','builtin:permanentOne') then raise exception 'Catalogue concern hid content for others'; end if;
 if exists(select 1 from public.community_recipe_exclusions()) then raise exception 'Private exclusions crossed accounts'; end if;
 perform public.community_saved_recipes_set('natural-glass-cleaner','builtin:permanentOne','Fixture',true);
 update public.community_builtin_recipes set is_active=false where id='builtin:permanentOne';
 update public.community_recipes set admin_removed_at=now() where id=r1;
 if exists(select 1 from public.community_saved_recipes_list() where recipe_id='builtin:permanentOne') or exists(select 1 from public.recipe_list('natural-glass-cleaner') where id=r1) then raise exception 'Explicit admin removal did not remove globally'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 if exists(select 1 from public.recipe_list('natural-glass-cleaner') where id=r1) then raise exception 'Globally removed recipe visible to guest'; end if;
 if not exists(select 1 from public.recipe_list('natural-toothpaste') where id=r2) then raise exception 'Personal exclusion affected guest'; end if;
 if has_function_privilege('anon','public.community_recipe_exclusions()','execute') or has_function_privilege('authenticated','public.community_exclude_recipe(uuid,text,text,text)','execute') then raise exception 'Private exclusion helper grants are incorrect'; end if;
 delete from auth.users where id=author_id;
 if exists(select 1 from public.community_blocks where blocked_user=author_id) or exists(select 1 from public.community_recipe_visibility where recipe_id in (r1::text,r2::text)) then raise exception 'Author deletion left personal references'; end if;
 delete from auth.users where id=reporter;
 if exists(select 1 from public.community_recipe_visibility where user_id=reporter) then raise exception 'Reporter deletion left exclusions'; end if;
end $$;
rollback;
