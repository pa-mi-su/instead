import tempfile, subprocess, pathlib, shutil, os
root=pathlib.Path(__file__).resolve().parents[1]
base=pathlib.Path(tempfile.mkdtemp(prefix='instead-db-',dir='/private/tmp'))
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
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, is_anonymous boolean default false,banned_until timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,created_at timestamptz default now());
alter table storage.objects enable row level security;
grant usage on schema storage to anon,authenticated;
grant select on storage.objects to anon;
grant select,insert,delete on storage.objects to authenticated;
''')
 run(psql+['-f',str(fixture)])
 run(psql+['-f',str(root/'supabase/community.sql')])
 run(psql+['-f',str(root/'supabase/recipes.sql')])
 print(run(psql+['-f',str(root/'supabase/community.test.sql')])[-200:])
 print(run(psql+['-f',str(root/'supabase/recipes.test.sql')])[-1500:])
 run(psql+['-f',str(root/'supabase/community-safeguards.sql')])
 run(psql+['-f',str(root/'supabase/community-safeguards.sql')])
 print(run(psql+['-f',str(root/'supabase/safeguards.test.sql')])[-500:])
 run(psql+['-f',str(root/'supabase/admin-panel.sql')])
 run(psql+['-f',str(root/'supabase/admin-panel.sql')])
 print(run(psql+['-f',str(root/'supabase/admin-panel.test.sql')])[-800:])
finally:
 if started: run([str(bin/'pg_ctl'),'-D',str(base/'data'),'-m','immediate','stop'])
 shutil.rmtree(base)
