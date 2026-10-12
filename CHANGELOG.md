# Changelog

## 0.6.4

The first npm release since 0.6.3 (B-SDK-07). Everything below was on main but unpublished.

- Security (TM-07): the secret key is now a true private field, so `console.log(client)`,
  `util.inspect` and `JSON.stringify` never print it. http is still refused except on localhost.
- Fix (SDK-22): a reply that is not JSON (say a proxy's HTML 502 page) now throws `StraitError`
  with its `.status` and the raw text as `.body`, instead of a bare `SyntaxError` with no status.
  A 2xx reply that is not JSON throws `StraitError` too ("HTTP 200: response is not JSON").

- `Link` type: new `shortUrl` field, the link to share (e.g. `https://<your-handle>.strait.link/launch`).
  The engine already returns it on every link; this only adds it to the TypeScript type.
- Packaging: the tarball holds only `dist/`, README, LICENSE and package.json (CHANGELOG.md is no
  longer shipped; read it on GitHub), and `prepublishOnly` rebuilds `dist/` before every publish.
- README: the common Strait SDK header (logo, the promise "Straight to the screen. On the record.",
  badges, links to docs, platform status and the changelog), a platform features table in the
  availability words (Live / Beta / Planned / Not yet) with the iPhone beta truth (the method is
  the customer's choice, device matching off by default), and a "Docs and support" section
  (Talk to the Strait team). The same structure in all seven SDK READMEs (design system v5).

## 0.6.3

- **Package renamed** to `@straitlink/node` (npm scope `@straitlink`; it was `@strait/sdk-node`, never
  published to npm). Update imports: `from '@straitlink/node'`. The GitHub repo name is unchanged.
  The code is otherwise identical to 0.6.2. Tag v0.6.2 (cut before the rename) still carries the old
  name `@strait/sdk-node` in its package.json, so install v0.6.3 or later for the new import path.

## 0.6.2

- `new StraitClient()` now refuses a `baseUrl` that is not `https://`, with a clear
  error, because the API key is sent with every request. Plain `http://` is still
  accepted for local development on `localhost`, `127.0.0.1` and `::1`. A `baseUrl`
  that is not an absolute URL is also refused up front instead of failing on the
  first request.

## 0.6.1

- Installable straight from GitHub: `npm install github:bazingga08/strait-sdk-node#v0.6.1`.
  The build now runs as a `prepare` script (was `prepack`), so npm compiles `dist/`
  when it installs from a git URL. No code changes.

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
