# INSTEAD security fork

This private local package is deepmerge 4.3.1 (MIT), with INSTEAD's reviewed fix for GHSA-gcqx-w48m-w2h4 applied to dist/cjs.js and dist/umd.js; index.js delegates to the self-contained CommonJS build. It is versioned 4.3.2-instead.1 to distinguish our patched code; this is not an upstream release. The original license and readme are retained. No network services, install scripts, or new runtime dependencies are added.

Both implementations use Object.defineProperty for destination keys, so an own `__proto__` key cannot invoke the prototype setter. API behavior is retained. The regression suite covers malicious source/target keys, null-prototype targets, nested merges, arrays, custom merges, and symbols.

npm audit does not analyze local packages. scripts/verify-deepmerge.mjs therefore verifies exact reviewed SHA-256 hashes, the local link, version, and absence of nested lockfile copies on every install and audit. The normal production audit rejects every registry advisory without exceptions. Any change to this fork requires explicit review of hashes and regression tests.

Upstream source: https://github.com/TehShrike/deepmerge/tree/v4.3.1
Advisory: https://github.com/advisories/GHSA-gcqx-w48m-w2h4
