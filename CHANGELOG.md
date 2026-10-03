# Changelog

## 0.6.0

- `sendEvent({ clickId })`: pass the tap a conversion came from (contract B15); the
  engine keeps it only when it is a tap of your workspace, so revenue lands on that
  tap's channel and A/B variant.

## 0.5.0

- **Renamed to Strait** (breaking, clean break). The package is now
  `@strait/sdk-node`; `BridgeClient` / `BridgeClientOptions` / `BridgeError` are
  now `StraitClient` / `StraitClientOptions` / `StraitError`. Secret keys use the
  `st_live_` / `st_test_` prefix; the env var in the examples is `STRAIT_API_KEY`.
  No aliases for the old names are kept.

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
