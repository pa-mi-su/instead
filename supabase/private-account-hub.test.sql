begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('71000000-0000-0000-0000-000000000001','account-one@example.invalid',now()),
 ('71000000-0000-0000-0000-000000000002','account-two@example.invalid',now());

select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000001',true);
select public.community_profile_set('ProfileOne','I share practical recipes.');
select public.community_saved_guides_set('natural-toothpaste',true);
select public.community_saved_guides_set('natural-shampoo',true);
do $$ begin
 if (select count(*) from public.community_saved_guides_list())<>2 then raise exception 'Account should list its own synced saves'; end if;
 if not exists(select 1 from public.community_saved_guides_list() where product_id='natural-toothpaste') then raise exception 'Saved guide missing'; end if;
end $$;
select public.community_saved_guides_set('natural-toothpaste',false);
do $$ begin
 if (select count(*) from public.community_saved_guides_list())<>1 then raise exception 'Unsave should remove a cloud save'; end if;
end $$;

insert into public.community_recipes(id,product_id,user_id,title,ingredients,instructions,storage_notes,cautions)
values('71000000-0000-0000-0000-000000000003','natural-toothpaste','71000000-0000-0000-0000-000000000001','My account recipe','Exact ingredients','Clear steps','Dry storage','Patch test');
update public.community_recipes
set status='approved',
    review_record=jsonb_build_object(
      'reviewer','INSTEAD owner',
      'note','Integration test approval',
      'reviewed_at',clock_timestamp()
    )
where id='71000000-0000-0000-0000-000000000003';
do $$ begin
 if (select count(*) from public.community_my_recipes())<>1 then raise exception 'Account should list its own submissions'; end if;
 if not exists(select 1 from public.community_profile_me() where username='ProfileOne') then raise exception 'Owner should manage their profile'; end if;
 if not exists(select 1 from public.community_profile_public('profileone') where bio='I share practical recipes.') then raise exception 'Public profile should be available without exposing the account ID'; end if;
 if not exists(select 1 from public.community_recipe_authors(array['71000000-0000-0000-0000-000000000003']::uuid[]) where username='ProfileOne') then raise exception 'Published recipe should expose its approved author profile'; end if;
end $$;

select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000002',true);
do $$ begin
 begin
  perform public.community_profile_set('profileone','');
  raise exception 'Case-insensitive duplicate username should be rejected';
 exception when unique_violation then null;
 end;
end $$;
do $$ begin
 if exists(select 1 from public.community_saved_guides_list()) then raise exception 'Saved guides must be private to the account'; end if;
 if exists(select 1 from public.community_my_recipes()) then raise exception 'Recipe submissions must be private to the account'; end if;
end $$;

do $$ begin
 if has_function_privilege('anon','public.community_saved_guides_list()','execute') then raise exception 'Anonymous users must not read account saves'; end if;
 if has_table_privilege('authenticated','public.community_saved_guides','select') then raise exception 'Clients must not query account saves directly'; end if;
end $$;
rollback;
