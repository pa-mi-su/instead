begin;
do $$
declare who uuid:=gen_random_uuid(); moderator uuid:=gen_random_uuid(); factor uuid:=gen_random_uuid(); session_id uuid:=gen_random_uuid(); recipe text:='builtin:concern-regression'; custom text:='admin:'||gen_random_uuid()::text; user_recipe uuid:=gen_random_uuid(); report_id uuid; second_id uuid; original_details text; cutoff timestamptz; denied boolean; target text;
begin
 insert into auth.users(id,email,email_confirmed_at) values(who,'abuse-test@example.invalid',now()),(moderator,'resolution-test@example.invalid',now());
 insert into public.community_builtin_recipes(id,product_id,title,is_active) values(recipe,'natural-glass-cleaner','Catalogue regression',true),(custom,'natural-glass-cleaner','Custom regression',true);
 insert into public.community_recipes(id,product_id,user_id,title,ingredients,instructions,storage_notes,cautions,status,review_record)
 values(user_recipe,'natural-glass-cleaner',moderator,'Community regression','Measured ingredients','Instructions','Safe storage','Cautions','approved',jsonb_build_object('reviewer','Fixture moderator','note','Reviewed fixture','reviewed_at',now()));
 perform set_config('request.jwt.claim.sub',who::text,true);
 report_id:=public.recipe_concern_submit('natural-glass-cleaner',recipe,'Other','Original concern details');
 update public.recipe_concerns set created_at=now()-interval '2 days',reviewed_at=now()-interval '1 day',emailed_at=now()-interval '2 days' where id=report_id;
 second_id:=public.recipe_concern_submit('natural-glass-cleaner',recipe,'Unsafe advice','Changed details must not bypass duplicates');
 if second_id<>report_id or (select count(*) from public.recipe_concerns where user_id=who and recipe_id=recipe)<>1 then raise exception 'Duplicate protection failed'; end if;
 if (select details from public.recipe_concerns where id=report_id)<>'Original concern details' then raise exception 'Duplicate changed original report'; end if;
 -- Valid report retries consume a separate bounded request quota.
 insert into public.community_actions(user_id,kind) select who,'recipe_concern_attempt' from generate_series(1,30);
 denied:=false;
 begin perform public.recipe_concern_submit('natural-glass-cleaner',recipe,'Other','Repeated valid retry'); exception when others then if SQLERRM like 'Too many actions%' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Retry flood was not throttled'; end if;
 delete from public.community_actions where user_id=who;
 insert into public.community_actions(user_id,kind) select who,'recipe_concern' from generate_series(1,10);
 denied:=false;
 begin perform public.recipe_concern_submit('natural-glass-cleaner',custom,'Other','Hourly limit test'); exception when others then if SQLERRM like 'Too many actions%' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Hourly creation quota was bypassed'; end if;
 delete from public.community_actions where user_id=who;
 insert into public.community_actions(user_id,kind,created_at) select who,'recipe_concern',now()-interval '2 hours' from generate_series(1,30);
 denied:=false;
 begin perform public.recipe_concern_submit('natural-glass-cleaner',custom,'Other','Daily limit test'); exception when others then if SQLERRM like 'Too many actions%' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Daily creation quota was bypassed'; end if;
 delete from public.community_actions where user_id=who;
 insert into public.community_account_controls(user_id,suspended) values(who,true);
 denied:=false;
 begin perform public.recipe_concern_submit('natural-glass-cleaner',custom,'Other','Restricted account test'); exception when others then if SQLERRM in ('Account access is restricted.','Account contributions are unavailable. Contact support if needed.') then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Restricted reporter accepted'; end if;
 delete from public.community_account_controls where user_id=who;
 -- Resolve all three ID formats with real MFA/admin checks, including cold/custom plans.
 foreach target in array array[recipe,custom,user_recipe::text] loop
  perform public.recipe_concern_submit('natural-glass-cleaner',target,'Other','Concern ready for resolution');
 end loop;
 insert into public.community_admins(user_id,label) values(moderator,'Regression moderator');
 insert into auth.mfa_factors values(factor,moderator,'totp','verified');
 insert into auth.sessions values(session_id,moderator);
 perform set_config('request.jwt.claim.sub',moderator::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('aal','aal2','session_id',session_id,'amr',jsonb_build_array(jsonb_build_object('method','totp','timestamp',extract(epoch from now()))))::text,true);
 foreach target in array array[recipe,custom,user_recipe::text] loop
  select max(created_at) into cutoff from public.recipe_concerns where recipe_id=target;
  perform public.recipe_concerns_admin('resolve',jsonb_build_object('recipe',target,'cutoff',cutoff,'note','Regression review completed'));
  if exists(select 1 from public.recipe_concerns where recipe_id=target and reviewed_at is null) then raise exception 'Concern resolution failed for %',target; end if;
 end loop;
 if not exists(select 1 from public.community_report_reviews where content_id=user_recipe) then raise exception 'Community report review receipt missing'; end if;
 if (select count(*) from public.community_admin_audit where actor=moderator and action='resolve_concerns')<>3 then raise exception 'Resolution audits missing'; end if;
 -- A different account may report the same recipe, and a stale review must not resolve it.
 second_id:=public.recipe_concern_submit('natural-glass-cleaner',recipe,'Other','New concern from a different reporter');
 select created_at into cutoff from public.recipe_concerns where id=report_id;
 perform public.recipe_concerns_admin('resolve',jsonb_build_object('recipe',recipe,'cutoff',cutoff,'note','Review of earlier snapshot'));
 if not exists(select 1 from public.recipe_concerns where id=second_id and reviewed_at is null) then raise exception 'Stale review resolved a newer concern'; end if;
 select created_at into cutoff from public.recipe_concerns where id=second_id;
 perform public.recipe_concerns_admin('resolve',jsonb_build_object('recipe',recipe,'cutoff',cutoff,'ids',jsonb_build_array(report_id),'note','Review only the displayed concern'));
 if not exists(select 1 from public.recipe_concerns where id=second_id and reviewed_at is null) then raise exception 'An unselected concern was resolved'; end if;
end $$;
rollback;
