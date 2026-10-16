-- Ignore historical self-votes without deleting user data; block new ones.
begin;
create or replace function public.community_list(p_product text, p_offset integer default 0)
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
create or replace function public.community_vote(p_comment uuid, p_upvoted boolean) returns void
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
notify pgrst,'reload schema';
commit;
