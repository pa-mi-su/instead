# INSTEAD website

This directory contains the React website for INSTEAD. It runs as a standard
Next.js application and is not tied to any hosting provider.

From the repository root:

```bash
npm run web
```

Then open `http://localhost:3000`.

The native app owns the canonical guide catalog in `src/data/guides.ts`.
Starting or building the website synchronizes that content into `web/shared/`.
