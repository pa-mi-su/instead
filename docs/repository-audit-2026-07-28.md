# Repository audit — July 28, 2026

## Scope

The audit covered the React Native application, Next.js website, shared data
model, Supabase access and RLS schema, generated environment configuration,
native iOS and Android projects, tests, GitHub Actions, release signing,
privacy declarations, dependency manifests, and tracked-file secret exposure.

## Findings fixed

- Supabase responses and cached catalogs are now validated at runtime before
  data reaches either UI.
- A successful empty Supabase catalog now clears stale cached content, while a
  network or configuration failure still preserves offline content.
- Mobile and web now import one shared guide model and mapping layer. The
  generated source-copy step and duplicate web files were removed.
- The Supabase client now consistently calls the client credential a
  publishable key.
- Android release builds no longer fall back to the public debug signing key.
  Store signing is enabled only when all four protected upload-key values are
  supplied.
- The unused, empty iOS location permission description was removed.
- Missing iPad icon sizes were added to the source-controlled icon generator
  and iOS asset catalog.
- React Native, Next.js, Supabase, and related dependencies were updated to
  current compatible patch releases and locked to reviewed native versions.
- CI now verifies the website as well as native code and rejects critical
  production dependency advisories.
- Website metadata now accepts a deployment-provided `SITE_URL` and uses a
  localhost default only for local development.

## Security review

- No Supabase secret key, service-role key, private key, or committed
  environment file was found.
- The client uses only the public Supabase project URL and publishable key.
- The `guides` table has Row Level Security enabled. Anonymous and
  authenticated clients can select only published rows and cannot insert,
  update, or delete rows.
- Android's tracked keystore is the standard React Native debug key and is
  restricted to debug variants.
- iOS declares no tracking or collected data in its privacy manifest.

## Verification

- Formatting, ESLint, TypeScript, Jest, and guide payload tests pass.
- The Next.js production build, web lint, and rendered-page test pass.
- The Android debug application compiles successfully.
- Android signing inspection reports no signing configuration for release
  without protected upload credentials.
- The iOS simulator application compiles successfully with code signing
  disabled, and both iOS plist files validate.
- The web production dependency audit reports zero vulnerabilities.
- Production dependency audits contain no critical vulnerabilities.

## Residual dependency risk

The root production audit currently reports ten high-severity findings through
React Native's bundled Jest/Istanbul toolchain. npm offers only a breaking
React Native downgrade as an automatic remediation, so that downgrade was not
applied. These are build/test dependency paths rather than application runtime
code. CI blocks critical findings, and this transitive chain should be
rechecked when React Native publishes an upstream-compatible fix.

The full web audit also reports three development-only transitive findings
(one low and two high). The deployed web dependency graph reports zero.

## Release operations not stored in source

Apple signing certificates, provisioning profiles, the Android upload
keystore, store credentials, the final production `SITE_URL`, and Supabase
deployment values belong in protected build environments. They are
intentionally not committed to this repository.
