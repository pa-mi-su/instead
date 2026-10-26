# INSTEAD public policy site and admin console

`website/` contains the public support/policy pages and the separate static `/admin` console. It is distinct from the Next.js guide-directory application in `web/`.

## Public site

`npm run website:build` generates six static HTML routes and one stylesheet under `website/dist/`. Privacy and Terms text is compiled from the shared `src/policies.ts`; the other public pages provide app information, safety, support, and account-deletion instructions. These pages have no sign-in, cookies, analytics, or server runtime.

Public routes:

- `https://insteadtry.com/`
- `https://insteadtry.com/privacy`
- `https://insteadtry.com/terms`
- `https://insteadtry.com/safety`
- `https://insteadtry.com/support`
- `https://insteadtry.com/delete-account`

The custom domains and public routes were verified over HTTPS. The configured support inbox was verified by the owner. Policy content and operational attestations can change; consult `release/readiness.json` and [release safety](../docs/release-safety.md) before a store submission.

## Admin console

The build also copies the static sources in `website/admin/` into `website/dist/admin/`, and generates `builtin-recipes.json` from the bundled mobile catalog. Set both `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` when building the live console. Only a public publishable/anon key is permitted. The database checks explicit admin membership, authenticated session, and recent verified TOTP MFA on protected requests; visiting `/admin` alone grants no access.

The console supports community moderation and built-in recipe editing. The built-in editor changes recipe text and records an audit trail; packaged recipe photos remain in the app bundle. See [admin operations](../docs/admin-panel.md) for authorization, review, and recovery details.

## Hosting and deployment

The static output is hosted in the private S3 bucket `insteadtry-website-160885294528` through CloudFront distribution `EMXS0LG36D5KE`, with `insteadtry.com` and `www.insteadtry.com` aliases. CI deploys `website/dist/` and invalidates CloudFront after a successful push to `main`; do not upload the repository, local environment files, or privileged credentials.

The website deployment job runs `npm run website:build` with the production URL and publishable key, then uses the repository's OIDC role to synchronize the generated site and invalidate the distribution. The Next.js app under `web/` is separately linted, built, and tested in CI; it is not part of this S3/CloudFront deployment job.
