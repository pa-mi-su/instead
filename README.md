# INSTEAD

INSTEAD is a practical reference app for finding safer, simpler, and less
expensive ways to handle everyday decisions. Before buying a product or booking
a service, open a guide to see what matters, what to try first, and when
professional help is the right choice.

## Technology

| Layer          | Technology                                    |
| -------------- | --------------------------------------------- |
| Mobile         | React Native 0.86, React 19, TypeScript       |
| Web            | Next.js 16, React 19, TypeScript              |
| Native iOS     | Xcode, Swift application shell                |
| Native Android | Gradle, Kotlin application shell              |
| Data           | Supabase PostgreSQL                           |
| Local storage  | AsyncStorage and browser local storage caches |
| Icons          | Lucide React Native                           |
| Testing        | Jest, ESLint, Prettier, TypeScript            |

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

For iOS, install the CocoaPods version recorded in `ios/Podfile.lock` once:

```bash
sudo gem install cocoapods -v 1.16.2 --no-document
pod _1.16.2_ install --project-directory=ios
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

Then open `http://localhost:3000`. The website and native apps load the same
published guide catalog from Supabase.

Build or test the production website:

```bash
npm run web:build
npm run web:test
```

## Supabase

Supabase is the source of truth for the guide catalog:

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Run `supabase/seed.sql` to load or update the starter guides.
3. Copy `.env.example` to `.env`.
4. Add the project URL and publishable key.

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SITE_URL=http://localhost:3000
```

`.env` is an optional local-development convenience and is never committed.
The environment generator reads the same `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY` variables directly from CI or deployment
environments, with local `.env` values used only when those variables have not
already been injected. It writes gitignored native and web build
configurations before development, tests, and builds.

Set `SITE_URL` to the final HTTPS website origin in the deployment environment
so social sharing metadata uses production URLs.

The publishable key is intentionally included in client builds and protected by
Row Level Security. Never put a Supabase secret or service-role key in either
client application.

After the first successful load, native and web cache the published catalog
locally so previously viewed content remains available during an outage.

## Android release signing

Debug builds use the standard public React Native debug keystore. Release
builds are never signed with that key. A release pipeline supplies the upload
keystore and these protected variables:

```text
INSTEAD_UPLOAD_STORE_FILE
INSTEAD_UPLOAD_STORE_PASSWORD
INSTEAD_UPLOAD_KEY_ALIAS
INSTEAD_UPLOAD_KEY_PASSWORD
```

Without all four values, Gradle can compile an unsigned release artifact but
cannot accidentally create a debug-signed production release.

## Mobile release automation

After a change reaches `main` and the `CI` workflow passes, GitHub Actions:

- builds a signed Android App Bundle and uploads it to Google Play Internal
  Testing;
- builds a signed iOS archive and uploads it to App Store Connect for
  TestFlight processing; and
- retains both signed artifacts in GitHub Actions for 14 days.

The workflow can also be started manually. It uses the protected `production`
GitHub environment. It does not publish either app to the public stores.

Required environment variables:

```text
APP_VERSION
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
ANDROID_PLAY_PACKAGE_NAME
ANDROID_PLAY_TRACK
ANDROID_PLAY_RELEASE_STATUS
IOS_TEAM_ID
IOS_PROFILE_NAME
APP_STORE_CONNECT_API_KEY_ID
APP_STORE_CONNECT_API_ISSUER_ID
```

Required environment secrets:

```text
ANDROID_UPLOAD_KEYSTORE_BASE64
ANDROID_UPLOAD_KEYSTORE_PASSWORD
ANDROID_UPLOAD_KEY_ALIAS
ANDROID_UPLOAD_KEY_PASSWORD
ANDROID_PLAY_SERVICE_ACCOUNT_JSON
IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64
IOS_DISTRIBUTION_CERTIFICATE_PASSWORD
IOS_PROVISIONING_PROFILE_BASE64
APP_STORE_CONNECT_API_PRIVATE_KEY_BASE64
```

Store signing files and private keys remain outside the repository.

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
