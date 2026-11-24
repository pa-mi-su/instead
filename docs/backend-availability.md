# Backend availability monitor

The November 24, 2026 App Review failure showed the sign-in connection error
while the Supabase project was paused. This monitor checks public email-auth
settings and performs a real, read-only query for at most one published guide ID.
It does not sign in, send email, access private accounts, or modify database data.

`Backend availability` runs at 02:23, 08:23, 14:23, and 20:23 UTC daily on the
default branch, and can be run manually on main. Its PR job uses mocked requests.
It reuses `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from the production
environment; no service-role key or reviewer password is required. The production
environment had no approval rules when this workflow was prepared. Adding approval
rules later can block unattended monitoring.

On failure, the run fails and opens one GitHub issue per ongoing outage. Repeated
failures do not create duplicate issues. Recovery adds a comment and closes the
monitor's issue. Enable GitHub Actions failure notifications and watch repository
issues to receive alerts; issue creation alone does not guarantee email delivery.
Checkout/setup failures remain visible as failed runs even when issue creation
cannot run. A failure in GitHub's scheduler itself cannot be detected by this job.

## Activation

Merge the monitoring PR into main, then run Actions → Backend availability → Run
workflow on main and verify a successful public auth and database probe. It does
not deploy the app or website. Resume a paused project in Supabase first; this
workflow cannot resume it. After recovery, test the exact reviewer credentials on
the submitted build and a supported physical device before resubmission.

## Limits and production recommendation

Supabase says a few database requests daily are typically enough to prevent
inactivity pausing, but does not guarantee this for the Free plan. This schedule
provides activity and availability checks, not a pausing guarantee. GitHub schedules
can be delayed or disabled (including after 60 days without activity in public
repositories). A paid Supabase plan is the supported way to prevent automatic
inactivity pausing for an app that users and reviewers depend on.

Passing checks prove public API availability, not successful password login,
email delivery, private database permissions, or device-specific connectivity.

Sources:

- https://supabase.com/docs/guides/platform/free-project-pausing
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
