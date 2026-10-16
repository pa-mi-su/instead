-- Run once in the Supabase SQL editor as the project owner.
-- Existing guides are unaffected. Access is exclusively through bounded RPCs.
begin;
create table public.community_products (id text primary key);
insert into public.community_products values
 ('natural-dish-cleaner'), ('natural-toothpaste'), ('natural-shampoo'),
 ('natural-body-soap'), ('natural-weed-killer'), ('natural-deodorant'),
 ('natural-glass-cleaner'), ('natural-laundry-care'), ('natural-surface-cleaner'),
 ('natural-skin-care'),
 ('natural-sunburn-care'),
 ('natural-bug-bite-care'),
 ('natural-cough-comfort'),
 ('natural-clogged-drains'),
 ('natural-mouse-deterrents'),
 ('natural-spider-deterrents');
create table public.community_profiles (
 user_id uuid primary key references auth.users on delete cascade,
 nickname text not null check (char_length(btrim(nickname)) between 2 and 32)
);
create table public.community_comments (
 id uuid primary key default gen_random_uuid(),
 product_id text not null references public.community_products,
 user_id uuid not null references auth.users on delete cascade,
 body text not null check (char_length(btrim(body)) between 1 and 1000),
 created_at timestamptz not null default now(),
 hidden boolean not null default false
);
create table public.community_votes (
 comment_id uuid not null references public.community_comments on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 primary key (comment_id, user_id)
);
create table public.community_reports (
 comment_id uuid not null references public.community_comments on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 reason text not null check (reason in ('Unsafe advice', 'Spam or abuse', 'Other')),
 created_at timestamptz not null default now(),
 primary key (comment_id, user_id)
);
create table public.community_actions (
 user_id uuid not null references auth.users on delete cascade,
 kind text not null,
 created_at timestamptz not null default now()
);
create index community_comments_product on public.community_comments(product_id, created_at desc) where not hidden;
create index community_actions_rate on public.community_actions(user_id, kind, created_at);

alter table public.community_products enable row level security;
alter table public.community_profiles enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_votes enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_actions enable row level security;
revoke all on public.community_products, public.community_profiles,
 public.community_comments, public.community_votes, public.community_reports,
 public.community_actions from public, anon, authenticated;

-- Private helper: verification and rate limits cannot be bypassed by a client.
create function public.community_require_user() returns uuid
language plpgsql security definer set search_path = '' as $$
declare who uuid := auth.uid();
begin
 if who is null or not exists (
  select 1 from auth.users where id = who and email_confirmed_at is not null
   and email is not null and not coalesce(is_anonymous, false)
 ) then raise exception 'Sign in with a verified email to contribute.'; end if;
 return who;
end $$;
create function public.community_limit(who uuid, action_kind text, maximum integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
 -- Serialize actions for one account, including concurrent requests.
 perform pg_advisory_xact_lock(hashtextextended(who::text, 0));
 if (select count(*) from public.community_actions
     where user_id = who and kind = action_kind and created_at > now() - interval '1 hour') >= maximum
 then raise exception 'Too many actions. Please try again later.'; end if;
 insert into public.community_actions(user_id, kind) values (who, action_kind);
 -- Retain only the rate-limit window for this account.
 delete from public.community_actions where user_id = who and created_at < now() - interval '1 day';
end $$;
create function public.community_list(p_product text, p_offset integer default 0)
returns table (id uuid, nickname text, body text, created_at timestamptz, votes bigint, upvoted boolean, mine boolean, reported boolean)
language sql stable security definer set search_path = '' as $$
 select c.id, p.nickname, c.body, c.created_at,
 (select count(*) from public.community_votes v where v.comment_id = c.id and v.user_id <> c.user_id) as votes,
 exists(select 1 from public.community_votes v where v.comment_id = c.id and v.user_id = auth.uid() and v.user_id <> c.user_id),
 coalesce(c.user_id = auth.uid(), false),
 exists(select 1 from public.community_reports r where r.comment_id = c.id and r.user_id = auth.uid())
 from public.community_comments c join public.community_profiles p on p.user_id = c.user_id
 where c.product_id = p_product and not c.hidden and p_offset between 0 and 10000
 order by votes desc, c.created_at desc, c.id
 limit 50 offset greatest(0, least(p_offset, 10000));
$$;
create function public.community_profile() returns text
language sql stable security definer set search_path = '' as $$
 select nickname from public.community_profiles where user_id = auth.uid();
$$;
create function public.community_set_profile(p_nickname text) returns void
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_user();
begin
 if char_length(btrim(p_nickname)) not between 2 and 32 or p_nickname is null
 then raise exception 'Choose a nickname between 2 and 32 characters.'; end if;
 perform public.community_limit(who, 'profile', 10);
 insert into public.community_profiles values(who, btrim(p_nickname))
 on conflict(user_id) do update set nickname = excluded.nickname;
end $$;
create function public.community_post(p_product text, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_user(); result uuid;
begin
 if char_length(btrim(p_body)) not between 1 and 1000 or p_body is null
 then raise exception 'Comments must be between 1 and 1000 characters.'; end if;
 if not exists(select 1 from public.community_profiles where user_id = who)
 then raise exception 'Choose a public nickname first.'; end if;
 perform public.community_limit(who, 'post', 5);
 insert into public.community_comments(product_id, user_id, body)
 values(p_product, who, btrim(p_body)) returning id into result;
 return result;
end $$;
create function public.community_vote(p_comment uuid, p_upvoted boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_user();
begin
 perform pg_advisory_xact_lock(hashtextextended(who::text, 0));
 if not exists(select 1 from public.community_comments where id = p_comment and not hidden)
 then raise exception 'Comment is unavailable.'; end if;
 if p_upvoted is null then raise exception 'Choose a vote state.'; end if;
 if p_upvoted and exists(select 1 from public.community_comments where id=p_comment and user_id=who) then raise exception 'You cannot upvote your own comment.'; end if;
 if p_upvoted = exists(select 1 from public.community_votes where comment_id = p_comment and user_id = who)
 then return; end if;
 perform public.community_limit(who, 'vote', 60);
 if p_upvoted then
  insert into public.community_votes values(p_comment, who) on conflict do nothing;
 else delete from public.community_votes where comment_id = p_comment and user_id = who;
 end if;
end $$;
create function public.community_report(p_comment uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_user();
begin
 perform pg_advisory_xact_lock(hashtextextended(who::text, 0));
 if not exists(select 1 from public.community_comments where id = p_comment and not hidden)
 then raise exception 'Comment is unavailable.'; end if;
 if exists(select 1 from public.community_reports where comment_id = p_comment and user_id = who) then return; end if;
 perform public.community_limit(who, 'report', 10);
 insert into public.community_reports values(p_comment, who, p_reason, now());
end $$;
create function public.community_delete(p_comment uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare who uuid := public.community_require_user();
begin
 delete from public.community_comments where id = p_comment and user_id = who;
 if not found then raise exception 'You can only delete your own comments.'; end if;
end $$;
revoke all on function public.community_require_user(), public.community_limit(uuid,text,integer),
 public.community_list(text,integer), public.community_profile(), public.community_set_profile(text),
 public.community_post(text,text), public.community_vote(uuid,boolean),
 public.community_report(uuid,text), public.community_delete(uuid) from public, anon, authenticated;
grant execute on function public.community_list(text,integer) to anon, authenticated;
grant execute on function public.community_profile(), public.community_set_profile(text),
 public.community_post(text,text), public.community_vote(uuid,boolean),
 public.community_report(uuid,text), public.community_delete(uuid) to authenticated;
commit;
