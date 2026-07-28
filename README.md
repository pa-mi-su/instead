# INSTEAD

INSTEAD is a practical reference app for finding safer, simpler, and less
expensive ways to handle everyday decisions. Before buying a product or booking
a service, open a guide to see what matters, what to try first, and when
professional help is the right choice.

## Technology

| Layer          | Technology                                          |
| -------------- | --------------------------------------------------- |
| Mobile         | React Native 0.86, React 19, TypeScript             |
| Web            | React 19, TypeScript, Vite/vinext                   |
| Native iOS     | Xcode, Swift application shell                      |
| Native Android | Gradle, Kotlin application shell                    |
| Data           | Supabase PostgreSQL with an offline bundled catalog |
| Local storage  | React Native AsyncStorage                           |
| Icons          | Lucide React Native                                 |
| Testing        | Jest, ESLint, Prettier, TypeScript                  |

This is a bare React Native Community CLI project. The native `ios/` and
`android/` projects are committed and maintained directly. It does not use
Expo, Expo Go, or EAS.

## Prerequisites

- Node.js 22.11 or newer
- npm
- Xcode and CocoaPods for iOS
- Android Studio and a supported JDK for Android

## Install

```bash
npm install
```

For iOS, install CocoaPods once:

```bash
bundle install
bundle exec pod install --project-directory=ios
```

## Run

Start Metro:

```bash
npm start
```

In a second terminal, run one platform:

```bash
npm run ios
npm run android
```

The iOS command uses the simulator by default. The Android command requires a
running emulator or connected device.

## Run the website

Start the React website:

```bash
npm run web
```

Then open `http://localhost:3000`. The website and native apps use the same
guide catalog; `npm run web` synchronizes that shared content before starting.

Build or test the production website:

```bash
npm run web:build
npm run web:test
```

## Supabase

INSTEAD works offline without any backend configuration. To load published
content from Supabase:

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Copy `.env.example` to `.env`.
3. Add the project URL and publishable key.
4. Insert guide rows and set `published = true`.

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

The environment generator writes a gitignored TypeScript configuration before
development, tests, and builds. Never put a Supabase service-role key in the
mobile application.

If the backend is missing, unavailable, or has no published guides, the app
automatically uses the bundled catalog in `src/data/guides.ts`.

## Verification

Run all project checks:

```bash
npm run verify
```

Or run them individually:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
```

## MVP scope

- Search and filter practical everyday guides
- Direct “can I skip it?” answers
- Time, cost, supplies, savings, and difficulty
- Essentials, reconsiderations, and practical alternatives
- Safety boundaries and when to get professional help
- Saved guides stored on-device
- Offline-first content with optional Supabase updates
- No account, advertising, or tracking

The content is educational and does not replace individualized medical or
dental advice.
