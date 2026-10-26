# INSTEAD guide-directory web app

This directory contains the Next.js guide-directory application. It is separate from the React Native app in the repository root and from the script-free policy/admin site in `website/`.

From the repository root:

```bash
npm --prefix web ci
npm run web
```

Open `http://localhost:3000`. The app uses the repository-level `src/` types and guide-row mapping. It requests published rows from Supabase `public.guides` with no-store fetches. Its data path differs from native: mobile begins with the bundled `src/catalog.ts` catalog and overlays built-in recipe edits from a scoped RPC.

The root `scripts/generate-env.mjs` generates the ignored `web/.env.local` from `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SITE_URL`, and `SUPPORT_EMAIL`. The browser app uses the `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, and `NEXT_PUBLIC_SUPPORT_EMAIL` values. Only a public publishable key belongs in browser code; never configure a service-role key here.

Useful commands from the repository root:

```bash
npm run web:build
npm run web:test
npm --prefix web run lint
```

CI builds, lints, and tests this app. Its website deployment job publishes `website/dist/` (policy/support pages and the static admin console), not the Next.js output. See the root [README](../README.md) for the architecture and [release safety](../docs/release-safety.md) for deployment scope.
