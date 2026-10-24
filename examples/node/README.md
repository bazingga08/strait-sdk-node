# Strait example: Node (server)

Built against this repo's own source (`"@straitlink/node": "file:../.."`), so CI fails here when the public API changes.
A server creates deep links and records revenue; the deferred link is resolved in the app (see the web and React Native SDKs).
`index.mjs` creates a link, sends a `purchase` event (pass a tap id your app forwarded as the first argument) and deletes the link.

1. `npm ci && npm run build` in the repo root, then `npm ci` here.
2. `cp .env.example .env` and set your **secret** key (`st_live_…`; server only, use a test workspace).
3. `npm start` (or `npm start -- <clickId>`), then see the event in Dashboard → Analytics.
