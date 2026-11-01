# Dependency security review — October 16, 2026

The PR check failed on npm security advisories, before app verification. Compatible transitive security updates are locked, Next.js/eslint-config-next are updated to 16.4.2, and web sharp is updated to 0.35.5. The website production audit remains strict and has zero findings.

Native overrides use brace-expansion 5.0.12, Metro's image-size 2.0.4, and @istanbuljs/load-nyc-config's js-yaml 4.3.2. Metro has two parser call sites. The default export remains available in 2.0.4, but filesystem path input was removed. A tracked patch makes Metro read file bytes before parsing asset dimensions; postinstall applies the patch and fails if it no longer applies. The Istanbul loader calls YAML.load, which remains available in 4.3.2. Tests and native bundling must verify these integration boundaries. React Native stays at 0.86.2.

## Retired braces exception — October 30, 2026

The exact braces advisory exception (GHSA-vfj7-8cjw-p6xm) expired on October 30 and has been removed. The current production dependency audit passes without it. A report containing this advisory now fails the audit gate, including in the regression fixture; this does not claim that braces 3.0.3 has been patched. New findings and registry errors continue to fail closed.

## Patched deepmerge advisory — October 27, 2026

GHSA-gcqx-w48m-w2h4 affects deepmerge 4.2.0 through 4.3.1; no patched release is published. React Native CLI configuration and Jest use 4.3.1. The advisory is included in npm's production tree through React Native's tooling peer dependency. It is not used to merge user recipes or photo data.

`patches/deepmerge+4.3.1.patch` defines merged keys as own data properties in the source, CommonJS, and UMD builds. This prevents an own `__proto__` key from invoking the prototype setter, including malicious target objects and null-prototype targets. Existing nested configuration, arrays, custom merges, and symbol-key behavior are regression tested. The malicious-input tests fail before this patch and pass after it.

Because npm audit recognizes published versions rather than local patches, the audit gate accepts only this exact low-severity advisory at the top-level deepmerge 4.3.1 location until November 3, 2026, and only when all three installed patched files match their recorded SHA-256 hashes. Missing or modified patches, new advisories, changed severity, nested copies, and audit failures continue to fail CI. Replace the patch and this exact exception when an upstream release is available; otherwise review before expiry.

Source: https://github.com/advisories/GHSA-gcqx-w48m-w2h4

## CI audit fixes — October 31, 2026

PR #47's production audit reported GHSA-3g3m-2fjr-6pw4 (glob), GHSA-4528-x5fx-h6hg (joi), and GHSA-g3hv-75wg-m249 (minimatch). Pin Joi to patched 17.13.9 and scope glob 14.0.2 / minimatch 11.0.1 to test-exclude 8.0.0. The latter remains in npm's production tree through React Native's Jest preset; older CommonJS minimatch callers elsewhere are not forced onto the new API. The patched packages support Node 22 used in CI. These are dependency updates, not new audit exceptions. Native verification (100 tests), safety tests and both production audit gates pass locally.

Sources:

- https://github.com/advisories/GHSA-3g3m-2fjr-6pw4
- https://github.com/advisories/GHSA-4528-x5fx-h6hg
- https://github.com/advisories/GHSA-g3hv-75wg-m249

## Exception removed — November 1, 2026

The expiring deepmerge exception and patch-package patch are retired. Upstream still publishes 4.3.1, so INSTEAD maintains the reviewed implementation in `vendor/deepmerge`, version `4.3.2-instead.1`. This version identifies a local security fork, not an upstream release. The CommonJS and UMD builds retain the reviewed fix, and the source entry delegates to the self-contained CommonJS build. The original MIT license remains included.

A direct local dev dependency plus the `$deepmerge` override routes all CLI/Jest users to the same fork. A clean `npm ci` verifies the fork before applying the remaining package patches. `scripts/verify-deepmerge.mjs` checks exact implementation hashes, package identity/entry point, local resolution, and absence of nested lockfile copies. This compensates for npm audit not scanning local forks. Tampering, missing files, changed versions, and nested copies fail the regression suite. The audit gate accepts zero registry advisory exceptions and fails closed on registry errors. The November 3 expiry no longer exists.

Malicious-key regressions and normal nested/array/symbol/custom merges pass against the fork; native app verification and a clean install pass. Future vendor changes select both mobile platforms for CI validation.
