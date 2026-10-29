begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('bb000000-0000-0000-0000-000000000001','membership-admin@example.invalid',now()),
 ('bb000000-0000-0000-0000-000000000002','membership-user@example.invalid',now()),
 ('bb000000-0000-0000-0000-000000000003','membership-unverified@example.invalid',null);
insert into public.community_admins(user_id,label) values('bb000000-0000-0000-0000-000000000001','Membership admin');
insert into auth.mfa_factors values('bc000000-0000-0000-0000-000000000001','bb000000-0000-0000-0000-000000000001','totp','verified');
insert into auth.sessions values('bd000000-0000-0000-0000-000000000001','bb000000-0000-0000-0000-000000000001');
create function pg_temp.must_reject(q text) returns void language plpgsql as $$
begin begin execute q; exception when others then return; end; raise exception 'Expected rejection: %',q; end $$;
set local role anon;
select pg_temp.must_reject($q$select public.community_admin_add('bb000000-0000-0000-0000-000000000002','membership-user@example.invalid','New admin','Trusted team member')$q$);
set local role authenticated;
select set_config('request.jwt.claim.sub','bb000000-0000-0000-0000-000000000002',true);
select pg_temp.must_reject($q$select public.community_admin_add('bb000000-0000-0000-0000-000000000002','membership-user@example.invalid','New admin','Trusted team member')$q$);
select set_config('request.jwt.claim.sub','bb000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
select pg_temp.must_reject($q$select public.community_admin_add('bb000000-0000-0000-0000-000000000002','membership-user@example.invalid','New admin','Trusted team member')$q$);
select set_config('request.jwt.claims',jsonb_build_object('aal','aal2','session_id','bd000000-0000-0000-0000-000000000001','amr',jsonb_build_array(jsonb_build_object('method','totp','timestamp',extract(epoch from now()))))::text,true);
select pg_temp.must_reject($q$select public.community_admin_add('bb000000-0000-0000-0000-000000000003','membership-unverified@example.invalid','New admin','Trusted team member')$q$);
select pg_temp.must_reject($q$select public.community_admin_add('bb000000-0000-0000-0000-000000000002','wrong@example.invalid','New admin','Trusted team member')$q$);
select pg_temp.must_reject($q$select public.community_admin_add('bb000000-0000-0000-0000-000000000002','membership-user@example.invalid','New admin','')$q$);
reset role;
insert into public.community_account_controls(user_id,suspended) values('bb000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select pg_temp.must_reject($q$select public.community_admin_add('bb000000-0000-0000-0000-000000000002','membership-user@example.invalid','New admin','Trusted team member')$q$);
reset role;
delete from public.community_account_controls where user_id='bb000000-0000-0000-0000-000000000002';
set local role authenticated;
do $$ declare row jsonb; begin
 row:=public.community_admin_users('membership-user@example.invalid',0)->'items'->0;
 if row->>'is_admin'<>'false' then raise exception 'Normal user role is wrong'; end if;
end $$;
select public.community_admin_add('bb000000-0000-0000-0000-000000000002','membership-user@example.invalid','New admin','Trusted team member');
do $$ declare row jsonb; begin
 row:=public.community_admin_users('membership-user@example.invalid',0)->'items'->0;
 if row->>'is_admin'<>'true' or row->>'has_admin_membership'<>'true' then raise exception 'Admin role is missing'; end if;
end $$;
select pg_temp.must_reject($q$select public.community_admin_add('bb000000-0000-0000-0000-000000000002','membership-user@example.invalid','New admin','Duplicate grant')$q$);
select pg_temp.must_reject($q$select public.community_admin_prepare_deletion('bb000000-0000-0000-0000-000000000002','membership-user@example.invalid','Cannot delete new admin')$q$);
select set_config('request.jwt.claim.sub','bb000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
do $$ begin if public.community_is_admin() then raise exception 'New admin must complete MFA'; end if; end $$;
reset role;
do $$ begin
 if not exists(select 1 from public.community_admin_audit where actor='bb000000-0000-0000-0000-000000000001' and subject_user='bb000000-0000-0000-0000-000000000002' and action='admin_added' and note='Trusted team member') then raise exception 'Missing membership audit'; end if;
 if has_table_privilege('authenticated','public.community_admins','insert') then raise exception 'Direct admin grants must remain blocked'; end if;
end $$;
rollback;
