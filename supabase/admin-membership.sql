-- Repeatable. Apply after recipe-saves-and-admin-users.sql and admin-user-deletion.sql.
-- Does not grant any memberships until an authenticated admin explicitly adds one.
begin;
create or replace function public.community_admin_users(p_search text default '',p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare needle text:=btrim(coalesce(p_search,'')); offset_n integer:=coalesce(p_offset,0); items jsonb; total_n bigint;
begin
 if not public.community_is_admin() then
  raise exception 'Administrator access required.' using errcode='42501';
 end if;
 if char_length(needle)>100 or offset_n<0 or offset_n>100000 then
  raise exception 'Invalid user search or page.';
 end if;
 select count(*) into total_n
 from auth.users u left join public.community_profiles p on p.user_id=u.id
 where not coalesce(u.is_anonymous,false) and u.email_confirmed_at is not null
 and (needle='' or u.email ilike '%'||needle||'%' or p.username ilike '%'||needle||'%' or u.id::text=needle);
 select coalesce(jsonb_agg(to_jsonb(q)-'total'),'[]'::jsonb) into items from (
  select u.id as user_id,u.email,p.username,u.created_at,u.last_sign_in_at,
   coalesce(c.suspended,false) as suspended,
   exists(select 1 from public.community_admins a where a.user_id=u.id and a.enabled) as is_admin,
   exists(select 1 from public.community_admins a where a.user_id=u.id) as has_admin_membership,
   (select count(*) from public.community_recipes r where r.user_id=u.id) as recipes,
   total_n as total
  from auth.users u left join public.community_profiles p on p.user_id=u.id
  left join public.community_account_controls c on c.user_id=u.id
  where not coalesce(u.is_anonymous,false) and u.email_confirmed_at is not null
   and (needle='' or u.email ilike '%'||needle||'%' or p.username ilike '%'||needle||'%' or u.id::text=needle)
  order by u.created_at desc,u.id
  limit 20 offset offset_n
 ) q;
 return jsonb_build_object('items',items,'total',total_n,'offset',offset_n);
end $$;

create or replace function public.community_admin_add(p_user uuid,p_email text,p_label text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if not public.community_is_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
 if p_user is null or p_user=actor then raise exception 'Choose another verified account.'; end if;
 if p_label is null or char_length(btrim(p_label)) not between 3 and 100 or
    p_note is null or char_length(btrim(p_note)) not between 3 and 1000 then
  raise exception 'Enter an admin name (3–100 characters) and reason (3–1000 characters).';
 end if;
 -- Lock the target against concurrent account deletion.
 perform 1 from auth.users u where u.id=p_user and lower(u.email)=lower(btrim(p_email))
  and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
  and (u.banned_until is null or u.banned_until<=now()) for update;
 if not found then raise exception 'Choose a verified, active account and confirm its email.'; end if;
 if exists(select 1 from public.community_account_controls c where c.user_id=p_user and (c.suspended or c.deletion_requested_at is not null)) then
  raise exception 'Restricted accounts and accounts awaiting deletion cannot become admins.';
 end if;
 if exists(select 1 from public.community_admins where user_id=p_user and enabled) then
  raise exception 'This account is already an admin.';
 end if;
 insert into public.community_admins(user_id,label,enabled) values(p_user,btrim(p_label),true)
 on conflict(user_id) do update set label=excluded.label,enabled=true;
 insert into public.community_admin_audit(actor,action,kind,subject_user,note)
 values(actor,'admin_added','account',p_user,btrim(p_note));
end $$;
revoke all on function public.community_admin_add(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.community_admin_add(uuid,text,text,text) to authenticated;
-- Recheck admin protection after taking the same target lock as promotion.
create or replace function public.community_admin_prepare_deletion(p_user uuid,p_email text,p_note text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target_email text;
begin
 if not public.community_is_admin() then
  raise exception 'Administrator access with recent MFA required.' using errcode='42501';
 end if;
 if char_length(btrim(coalesce(p_note,''))) not between 3 and 2000 then
  raise exception 'Enter a deletion reason between 3 and 2000 characters.';
 end if;
 select email into target_email from auth.users where id=p_user for update;
 if not found then raise exception 'Account no longer exists. Refresh the user list.'; end if;
 if p_user is null or p_user=actor or exists(select 1 from public.community_admins where user_id=p_user) then
  raise exception 'Administrator accounts cannot be deleted here.';
 end if;
 if target_email is null or lower(btrim(coalesce(p_email,'')))<>lower(target_email) then
  raise exception 'Type the account email exactly to confirm deletion.';
 end if;
 insert into public.community_account_controls(user_id,deletion_requested_at)
 values(p_user,now()) on conflict(user_id) do update
 set deletion_requested_at=coalesce(public.community_account_controls.deletion_requested_at,now());
 insert into public.community_admin_audit(actor,action,kind,subject_user,note)
 values(actor,'permanent_deletion_requested','account',p_user,btrim(p_note));
 return p_user;
end $$;
notify pgrst,'reload schema';
commit;
