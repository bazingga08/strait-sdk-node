# Changelog

## 0.1.0

- Typed, zero-dependency server SDK: `createLink`, `listLinks`, `updateLink`,
  `deleteLink`, `sendEvent` (authenticated with the secret key). Failures throw
  `BridgeError` with `.status` and `.body`.

### Packaging

- Publish-ready: complete package metadata (repository, homepage, bugs, keywords),
  `exports` map with types, `sideEffects: false`, MIT `LICENSE`. Only `dist/`,
  README, LICENSE and this changelog ship (no tests, fixtures or source maps).
- The package name, npm scope and URLs come from `brand.json` (applied by
  `scripts/brand.mjs`), so the brand switch is one command.
- Tag `vX.Y.Z` → GitHub Actions runs the tests and publishes to npm with
  provenance (see PUBLISHING.md). Nothing publishes until `NPM_TOKEN` is set and
  the brand is marked final.
