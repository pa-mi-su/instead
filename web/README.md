# INSTEAD website

This directory contains the React website for INSTEAD. It runs as a standard
Next.js application and is not tied to any hosting provider.

From the repository root:

```bash
npm run web
```

Then open `http://localhost:3000`.

Supabase owns the canonical guide catalog. The root environment generator
provides the public project URL and publishable key to the website. The website
imports the shared guide types, categories, and row validation
directly from the repository-level `src/` directory. There is one source of
truth for both the mobile and web applications.
