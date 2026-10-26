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
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz default now(), last_sign_in_at timestamptz, is_anonymous boolean default false,banned_until timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
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
finally:
 if started: run([str(bin/'pg_ctl'),'-D',str(base/'data'),'-m','immediate','stop'])
 shutil.rmtree(base)
