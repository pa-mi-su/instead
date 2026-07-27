# INSTEAD MVP

An Expo reference app for finding the simplest evidence-aware way to handle everyday routines.

## Run it

```bash
npm install
npm run ios
```

Use `npm run android` or `npm run web` for other targets.

## Supabase

The app ships with an offline catalog, so it works without configuration. To load live published content:

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Copy `.env.example` to `.env`.
3. Add the project URL and anon key.
4. Insert rows matching the schema and set `published = true`.

If Supabase is unavailable or returns no published rows, the app automatically uses its bundled catalog.

## MVP scope

- Search and filter everyday routines
- Direct “can I skip it?” answer
- Essentials, avoid list, and practical alternatives
- Saved routines stored on-device
- Offline-first content with optional Supabase updates
- No account, ads, or tracking

The content is educational and does not replace individualized medical or dental advice.
