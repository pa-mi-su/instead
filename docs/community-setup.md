# Community comments and email-code sign-in

## Current project status (October 16, 2026)

The existing project was resumed and the community migration has been applied. Public comment reads return HTTP 200; direct reads of private profiles are denied (HTTP 401). Email sign-in and signups are enabled; confirmation is required and anonymous sign-ins are disabled. Code expiry was set to 600 seconds, retaining eight-digit codes.

SES is now verified for insteadtry.com in us-east-1 (DKIM SUCCESS). Dedicated SMTP IAM user/group instead-supabase-smtp-20261016 is restricted to ses:SendRawEmail for the Instead identity and no-reply@insteadtry.com. Credentials were generated in a private temporary handoff file outside the repository, with directory mode 0700 and file mode 0600. The owner entered the SMTP credentials in Supabase. Custom SMTP and code email templates are active, and the owner confirmed receipt of a test email. Do not rerun the one-time migration or generate duplicate keys. The repeatable `supabase/no-self-votes.sql` patch was also applied: users cannot upvote their own comments, and historical self-votes are excluded from counts.

## Activate the backend

1. Run `supabase/community.sql` once in the existing Supabase project's SQL editor (project-owner privileges required). This adds separate tables and RPCs; it does not modify guides. This is a one-time transactional migration, not a repeatable seed script.
2. Enable Email sign-in and user signups in Authentication → Providers. Disable anonymous sign-in unless needed for another feature; community writes reject anonymous accounts anyway.
3. In Authentication → Email Templates → Magic Link, replace the link template with:

   ```html
   <h2>Your INSTEAD sign-in code</h2>
   <p>Enter this code in INSTEAD: {{ .Token }}</p>
   <p>If you did not request this, ignore this email.</p>
   ```

   Configure code expiry to 10 minutes, keep the existing eight-digit code length, and at least 60 seconds between sends. No deep links or auth callback route are needed.
4. Configure custom SMTP for real users. Supabase's default sender is restricted and is unsuitable for a public launch. Keep sender credentials in Supabase, never in the app.
5. Keep the existing public URL/key in native `.env` and web `.env.local`. The browser uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Do not put service-role keys in either client.
6. Run `npm run verify`, `npm run web:test`, then test on a native device and two independent browsers with real email addresses. No test emails are sent by automated checks.

Official references: [Email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Behavior and limits

Anyone can read visible comments. Only accounts with a confirmed email can post, vote, or report. Email and account IDs are never returned by the public comments RPC. No public profiles or nicknames are required; comments are labeled Community member. Recipe submissions and photos are covered in recipe-moderation.md. Native sessions persist in AsyncStorage; browser sessions persist in local storage. Sign-out removes the local session. The older device-only comments are not uploaded automatically.

Votes use a `(comment_id, user_id)` primary key and explicit desired state, making retries idempotent. Each account gets 5 posts, 60 vote changes, 10 reports, and 10 nickname changes per rolling hour, enforced in SQL with a transaction lock. Reads return 50 rows per page, ordered by vote count then recency; pagination is best effort while votes change. Email verification cannot ensure one human per account. Enable Supabase CAPTCHA protection before a large public launch (requires adding the provider widget/token to the sign-in UI); auth-provider limits alone do not prevent all automated signups.

A successful write followed by a failed refresh shows an error; use Refresh comments before retrying a post. Reports remain private. They do not automatically hide content, so coordinated reports cannot remove a comment. A moderator must review reports in the Supabase dashboard:

```sql
select r.comment_id, r.reason, r.created_at, c.body, c.hidden
from public.community_reports r join public.community_comments c on c.id = r.comment_id
order by r.created_at desc;
-- After review, hide or restore a specific comment:
-- update public.community_comments set hidden = true where id = '<comment uuid>';
```

RLS is enabled with no client table policies or grants. Only scoped RPCs have client execute permission. Private security-definer helpers have no client execute permission and an empty search path. Do not grant direct client writes to these tables. Owners can delete their comments; reports and votes cascade. Account deletion can be handled by a project owner in Supabase Auth (cascades community records; delete photo files separately first); the support page is the request path for now. No admin key is shipped.

## Release checklist

- Confirm a guest can read but cannot call write RPCs or read tables directly.
- Confirm two verified accounts see the same comments and independent votes; repeat the same desired vote and ensure the count does not increase.
- Confirm an account cannot delete another user's comment, and one report per account/comment is enforced.
- Confirm a hidden comment disappears for guests and members and cannot receive votes or reports.
- Verify incorrect/expired code errors, resend cooldown, nickname validation, sign-out, app restart, offline retry, and rate limits.
- SQL integration assertions are in `supabase/community.test.sql`; run only in a disposable local database after the migration. They roll back their fixtures.
