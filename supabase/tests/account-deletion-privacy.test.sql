-- Disposable local database only. No hosted/production execution.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('ba000000-0000-0000-0000-000000000001','privacy-target@example.invalid',now()),
 ('ba000000-0000-0000-0000-000000000002','privacy-other@example.invalid',now());
insert into public.community_profiles(user_id,nickname,username,bio) values
 ('ba000000-0000-0000-0000-000000000001','Privacy target','PrivacyTarget','Original private biography');
insert into public.community_admin_audit(actor,subject_user,action,kind,note) values
 ('ba000000-0000-0000-0000-000000000002','ba000000-0000-0000-0000-000000000001','permanent_deletion_requested','account','private supplied note'),
 ('ba000000-0000-0000-0000-000000000002',null,'review','recipe','Contact PRIVACY-TARGET@example.invalid or PrivacyTarget'),
 ('ba000000-0000-0000-0000-000000000002',null,'review','recipe','Unrelated audit note');
insert into public.community_builtin_recipe_audit(actor,recipe_id,product_id,action,note,before_content,after_content) values
 ('ba000000-0000-0000-0000-000000000002','test','natural-glass-cleaner','updated','PrivacyTarget submitted this','{"name":"privacy-target@example.invalid"}','{"name":"Unrelated recipe"}');
insert into public.community_moderation_audit(kind,content_id,decision,note,reviewer) values
 ('recipe','bc000000-0000-0000-0000-000000000001','approved','Original private biography','Moderator');
-- A failed Auth transaction must not create a completion receipt or erase notes.
savepoint before_deletion;
delete from auth.users where id='ba000000-0000-0000-0000-000000000001';
rollback to savepoint before_deletion;
do $$ begin
 if not exists(select 1 from public.community_admin_audit where note='private supplied note') then raise exception 'Rollback did not preserve audit'; end if;
end $$;
delete from auth.users where id='ba000000-0000-0000-0000-000000000001';
do $$ begin
 if exists(select 1 from public.community_profiles where user_id='ba000000-0000-0000-0000-000000000001') then raise exception 'Profile remains'; end if;
 if exists(select 1 from public.community_admin_audit where subject_user='ba000000-0000-0000-0000-000000000001' or note ilike '%privacytarget%' or note ilike '%privacy-target@example.invalid%' or note='private supplied note') then raise exception 'Identifying audit remains'; end if;
 if not exists(select 1 from public.community_admin_audit where action='account_deleted' and note='Account deletion completed; initiated by admin.' and actor is null and subject_user is null and content_id is null) then raise exception 'Minimal admin receipt missing'; end if;
 if not exists(select 1 from public.community_admin_audit where note='Unrelated audit note') then raise exception 'Unrelated audit removed'; end if;
 if exists(select 1 from public.community_builtin_recipe_audit where before_content::text ilike '%privacy-target%' or note ilike '%privacytarget%') then raise exception 'Snapshot PII remains'; end if;
 if not exists(select 1 from public.community_builtin_recipe_audit where after_content->>'name'='Unrelated recipe') then raise exception 'Unrelated snapshot removed'; end if;
 if exists(select 1 from public.community_moderation_audit where note='Original private biography') then raise exception 'Moderation PII remains'; end if;
end $$;
-- Self-service/direct Auth deletion follows the same cleanup without admin authorization.
delete from auth.users where id='ba000000-0000-0000-0000-000000000002';
do $$ begin
 if not exists(select 1 from public.community_admin_audit where action='account_deleted' and note='Account deletion completed; initiated by user.' and actor is null and subject_user is null) then raise exception 'User receipt missing'; end if;
end $$;
set local role authenticated;
do $$ begin
 begin perform public.community_delete_private_audit(); raise exception 'Trigger function exposed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
