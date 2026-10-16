# Dependency security review — October 16, 2026

The PR check failed on npm security advisories, before app verification. Compatible transitive security updates are locked, Next.js/eslint-config-next are updated to 16.4.2, and web sharp is updated to 0.35.5. The website production audit remains strict and has zero findings.

Native overrides use brace-expansion 5.0.12, Metro's image-size 2.0.4, and @istanbuljs/load-nyc-config's js-yaml 4.3.2. Metro has two parser call sites. The default export remains available in 2.0.4, but filesystem path input was removed. A tracked patch makes Metro read file bytes before parsing asset dimensions; postinstall applies the patch and fails if it no longer applies. The Istanbul loader calls YAML.load, which remains available in 4.3.2. Tests and native bundling must verify these integration boundaries. React Native stays at 0.86.2.

## One temporary exception

GHSA-vfj7-8cjw-p6xm affects braces through 3.0.3 and has no published patch. In this project it is used by Node build/test tools for repository file patterns; it is not imported by application recipe, comment, or photo processing. The production dependency report includes it because React Native depends on tooling packages. Do not run Metro as a public service or feed untrusted patterns into these tools. Untrusted repository changes can still cause CI availability failures; use normal PR review and hosted-job time limits.

`scripts/audit-native.mjs` accepts only that exact advisory, package location, version, and severity until October 30, 2026. Every other leaf advisory still fails, including new findings in braces. Audit network/report failures fail closed. Parent package summaries are represented by their underlying advisory findings. The exception must be removed when an upstream patch is available, or explicitly reviewed before expiry. It does not mean the dependency has been patched or that the native audit has zero findings.

Sources: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm and the dependency/API inspection recorded above.
