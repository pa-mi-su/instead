import tempfile, subprocess, pathlib, shutil, os
root=pathlib.Path(__file__).resolve().parents[1]
base=pathlib.Path(tempfile.mkdtemp(prefix='instead-db-'))
bin=pathlib.Path(os.environ.get('INSTEAD_PG_BIN', str(pathlib.Path(shutil.which('initdb')).parent) if shutil.which('initdb') else '/opt/homebrew/opt/postgresql@15/bin'))
if not (bin/'initdb').exists(): raise SystemExit('Install PostgreSQL or set INSTEAD_PG_BIN to its bin directory. Tests always create a disposable local cluster.')
def run(args):
 p=subprocess.run(args,text=True,capture_output=True)
 if p.returncode: raise RuntimeError(p.stdout[-3000:]+'\n'+p.stderr[-3000:])
 return p.stdout
started=False
try:
 run([str(bin/'initdb'),'-D',str(base/'data'),'-A','trust','--no-locale'])
 run([str(bin/'pg_ctl'),'-D',str(base/'data'),'-l',str(base/'postgres.log'),'-o',f"-k {base} -h '' -p 55487",'start'])
 started=True
 psql=[str(bin/'psql'),'-h',str(base),'-p','55487','-d','postgres','-v','ON_ERROR_STOP=1']
 fixture=base/'fixture.sql'
 fixture.write_text('''create role anon; create role authenticated; create role service_role;
create schema auth;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz default now(), last_sign_in_at timestamptz, raw_user_meta_data jsonb default '{}', is_anonymous boolean default false,banned_until timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
create table auth.mfa_factors(id uuid primary key,user_id uuid references auth.users on delete cascade,factor_type text,status text);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users on delete cascade);
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,created_at timestamptz default now());
alter table storage.objects enable row level security;
grant usage on schema storage to anon,authenticated;
grant select on storage.objects to anon;
grant select,insert,update,delete on storage.objects to authenticated;
''')
 run(psql+['-f',str(fixture)])
 run(psql+['-f',str(root/'supabase/community.sql')])
 run(psql+['-f',str(root/'supabase/recipes.sql')])
 print(run(psql+['-f',str(root/'supabase/tests/community.test.sql')])[-200:])
 print(run(psql+['-f',str(root/'supabase/tests/recipes.test.sql')])[-1500:])
 run(psql+['-f',str(root/'supabase/community-safeguards.sql')])
 run(psql+['-f',str(root/'supabase/community-safeguards.sql')])
 print(run(psql+['-f',str(root/'supabase/tests/safeguards.test.sql')])[-500:])
 run(psql+['-f',str(root/'supabase/recipe-comments.sql')])
 run(psql+['-f',str(root/'supabase/recipe-comments.sql')])
 run(psql+['-f',str(root/'supabase/admin-panel.sql')])
 run(psql+['-f',str(root/'supabase/admin-panel.sql')])
 run(psql+['-f',str(root/'supabase/recipe-voting.sql')])
 run(psql+['-f',str(root/'supabase/recipe-voting.sql')])
 run(psql+['-f',str(root/'supabase/builtin-recipe-admin.sql')])
 run(psql+['-f',str(root/'supabase/builtin-recipe-admin.sql')])
 run(psql+['-f',str(root/'supabase/private-account-hub.sql')])
 run(psql+['-f',str(root/'supabase/private-account-hub.sql')])
 print(run(psql+['-f',str(root/'supabase/tests/private-account-hub.test.sql')])[-500:])
 run(psql+['-f',str(root/'supabase/profile-avatars.sql')])
 run(psql+['-f',str(root/'supabase/profile-avatars.sql')])
 print(run(psql+['-f',str(root/'supabase/tests/profile-avatars.test.sql')])[-500:])
 run(psql+['-c',"""alter table public.community_moderation_audit add column qualifications text;
alter table public.community_moderation_audit add column sources text;
insert into auth.users(id,email,email_confirmed_at) values('99000000-0000-0000-0000-000000000001','legacy-rejection@example.invalid',now());
insert into public.community_recipes(id,product_id,user_id,title,ingredients,instructions,storage_notes,cautions,status,review_record)
 values('99000000-0000-0000-0000-000000000002','natural-glass-cleaner','99000000-0000-0000-0000-000000000001','Legacy rejection','Test ingredients','Test instructions','Test storage','Test cautions','rejected',jsonb_build_object('qualifications','legacy','sources','legacy'));
insert into public.community_comments(id,product_id,user_id,body,moderation_status,review_record)
 values('99000000-0000-0000-0000-000000000003','natural-glass-cleaner','99000000-0000-0000-0000-000000000001','Legacy rejected comment','rejected',jsonb_build_object('qualifications','legacy','sources','legacy'));"""])
 run(psql+['-f',str(root/'supabase/simplify-admin-review.sql')])
 run(psql+['-f',str(root/'supabase/simplify-admin-review.sql')])
 run(psql+['-f',str(root/'supabase/recipe-saves-and-admin-users.sql')])
 run(psql+['-f',str(root/'supabase/recipe-saves-and-admin-users.sql')])
 run(psql+['-f',str(root/'supabase/admin-user-deletion.sql')])
 run(psql+['-f',str(root/'supabase/admin-user-deletion.sql')])
 print(run(psql+['-f',str(root/'supabase/tests/admin-user-deletion.test.sql')])[-500:])
 run(psql+['-f',str(root/'supabase/admin-membership.sql')])
 run(psql+['-f',str(root/'supabase/admin-membership.sql')])
 print(run(psql+['-f',str(root/'supabase/tests/admin-membership.test.sql')])[-500:])
 run(psql+['-f',str(root/'supabase/account-deletion-privacy.sql')])
 run(psql+['-f',str(root/'supabase/account-deletion-privacy.sql')])
 print(run(psql+['-f',str(root/'supabase/tests/account-deletion-privacy.test.sql')])[-800:])
 run(psql+['-f',str(root/'supabase/recipe-concerns.sql')])
 run(psql+['-f',str(root/'supabase/recipe-concerns.sql')])
 run(psql+['-f',str(root/'supabase/recipe-concern-history.sql')])
 run(psql+['-f',str(root/'supabase/recipe-concern-history.sql')])
 print(run(psql+['-f',str(root/'supabase/tests/recipe-concern-history.test.sql')])[-800:])
 print(run(psql+['-f',str(root/'supabase/tests/recipe-concerns.test.sql')])[-800:])
 print(run(psql+['-f',str(root/'supabase/tests/recipe-concern-abuse.test.sql')])[-800:])
 # Separate sessions verify that simultaneous submissions cannot create duplicates.
 run(psql+['-c',"""insert into auth.users(id,email,email_confirmed_at) values('98000000-0000-0000-0000-000000000001','report-race@example.invalid',now());
insert into public.community_builtin_recipes(id,product_id,title,is_active) values('builtin:reportRace','natural-glass-cleaner','Report race fixture',true);"""])
 race_sql="""begin; select set_config('request.jwt.claim.sub','98000000-0000-0000-0000-000000000001',true);
select public.recipe_concern_submit('natural-glass-cleaner','builtin:reportRace','Other','Concurrent report fixture'); select pg_sleep(1); commit;"""
 racers=[subprocess.Popen(psql+['-c',race_sql],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True) for _ in range(2)]
 for racer in racers:
  output,errors=racer.communicate(timeout=15)
  if racer.returncode: raise RuntimeError(output+'\n'+errors)
 run(psql+['-c',"""do $$ begin
if (select count(*) from public.recipe_concerns where user_id='98000000-0000-0000-0000-000000000001')<>1 then raise exception 'Concurrent duplicate concerns created'; end if;
if (select count(*) from public.community_actions where user_id='98000000-0000-0000-0000-000000000001' and kind='recipe_concern')<>1 then raise exception 'Concurrent creation quota was not idempotent'; end if;
end $$;
delete from auth.users where id='98000000-0000-0000-0000-000000000001';
delete from public.community_builtin_recipes where id='builtin:reportRace';"""])
 print('Concurrent report submissions produced exactly one concern.')

 run(psql+['-c',"""do $$ begin
if exists(select 1 from information_schema.columns where table_schema='public' and table_name='community_moderation_audit' and column_name in ('qualifications','sources')) then raise exception 'Obsolete moderation audit columns remain'; end if;
if not exists(select 1 from public.community_recipes where id='99000000-0000-0000-0000-000000000002' and admin_removed_at is not null and not review_record ? 'qualifications' and not review_record ? 'sources') then raise exception 'Legacy rejected recipe was not cleaned into Trash'; end if;
if not exists(select 1 from public.community_comments where id='99000000-0000-0000-0000-000000000003' and admin_removed_at is not null and hidden and not review_record ? 'qualifications' and not review_record ? 'sources') then raise exception 'Legacy rejected comment was not cleaned into Trash'; end if;
end $$;"""])
 run(psql+['-c',"delete from auth.users where id='99000000-0000-0000-0000-000000000001';"])
 print(run(psql+['-f',str(root/'supabase/tests/admin-panel.test.sql')])[-800:])
 print(run(psql+['-f',str(root/'supabase/tests/recipe-saves-and-admin-users.test.sql')])[-800:])
 print(run(psql+['-f',str(root/'supabase/tests/recipe-voting.test.sql')])[-500:])
 print(run(psql+['-f',str(root/'supabase/tests/builtin-recipe-admin.test.sql')])[-500:])
 run(psql+['-f',str(root/'supabase/personal-recipe-visibility.sql')])
 run(psql+['-f',str(root/'supabase/personal-recipe-visibility.sql')])
 print(run(psql+['-f',str(root/'supabase/tests/personal-recipe-visibility.test.sql')])[-800:])
 run(psql+['-c',"""insert into auth.users(id,email,email_confirmed_at) values('97000000-0000-0000-0000-000000000001','visibility-reapply@example.invalid',now());
insert into public.community_builtin_recipes(id,product_id,title,is_active) values('builtin:visibilityReapply','natural-glass-cleaner','Reapply fixture',true);
select set_config('request.jwt.claim.sub','97000000-0000-0000-0000-000000000001',false);
select public.recipe_concern_submit('natural-glass-cleaner','builtin:visibilityReapply','Other','Migration repeatability fixture');
select public.community_recipe_hide('natural-glass-cleaner','builtin:visibilityReapply',false,'97000000-0000-0000-0000-000000000001');"""])
 run(psql+['-f',str(root/'supabase/personal-recipe-visibility.sql')])
 run(psql+['-c',"""do $$ begin
if exists(select 1 from public.community_recipe_visibility where user_id='97000000-0000-0000-0000-000000000001') then raise exception 'Reapplying migration re-hid restored recipe'; end if;
end $$;
delete from auth.users where id='97000000-0000-0000-0000-000000000001';
delete from public.community_builtin_recipes where id='builtin:visibilityReapply';"""])
 print('Personal hiding is private across recipe types; repeated deployment preserves restored recipes.')
 # Simulate an existing report that the superseded UI allowed the user to restore.
 run(psql+['-c',"""insert into auth.users(id,email,email_confirmed_at) values('96000000-0000-0000-0000-000000000001','permanent-backfill@example.invalid',now());
insert into public.community_builtin_recipes(id,product_id,title,is_active) values('builtin:permanentBackfill','natural-glass-cleaner','Permanent backfill fixture',true);
select set_config('request.jwt.claim.sub','96000000-0000-0000-0000-000000000001',false);
select public.recipe_concern_submit('natural-glass-cleaner','builtin:permanentBackfill','Other','Earlier reported recipe fixture');
select public.community_recipe_hide('natural-glass-cleaner','builtin:permanentBackfill',false,'96000000-0000-0000-0000-000000000001');
select public.community_saved_recipes_set('natural-glass-cleaner','builtin:permanentBackfill','Backfill fixture',true);"""])
 run(psql+['-f',str(root/'supabase/permanent-recipe-exclusions.sql')])
 run(psql+['-f',str(root/'supabase/permanent-recipe-exclusions.sql')])
 run(psql+['-c',"""do $$ begin
if not exists(select 1 from public.community_recipe_visibility where user_id='96000000-0000-0000-0000-000000000001' and recipe_id='builtin:permanentBackfill') then raise exception 'Existing restored report was not permanently excluded'; end if;
if exists(select 1 from public.community_saved_recipes where user_id='96000000-0000-0000-0000-000000000001') then raise exception 'Reconciled report bookmark retained'; end if;
if not exists(select 1 from public.community_builtin_recipes where id='builtin:permanentBackfill' and is_active) then raise exception 'Private backfill changed publication'; end if;
end $$;
delete from auth.users where id='96000000-0000-0000-0000-000000000001';
delete from public.community_builtin_recipes where id='builtin:permanentBackfill';"""])
 print(run(psql+['-f',str(root/'supabase/tests/permanent-recipe-exclusions.test.sql')])[-800:])
 print('Permanent exclusions: no restore/history APIs; reporter-only contributor filtering and explicit global removal verified.')
 run(psql+['-f',str(root/'supabase/signup-integrity.sql')])
 run(psql+['-f',str(root/'supabase/signup-integrity.sql')])
 print(run(psql+['-f',str(root/'supabase/tests/signup-integrity.test.sql')])[-800:])
 print('Signup integrity: public availability, final uniqueness, verified-only profiles, and deletion release verified.')
finally:
 if started: run([str(bin/'pg_ctl'),'-D',str(base/'data'),'-m','immediate','stop'])
 shutil.rmtree(base)
