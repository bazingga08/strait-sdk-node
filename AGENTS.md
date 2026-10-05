# AGENTS.md: Strait Node SDK (@straitlink/node)

Instructions for AI coding agents (Claude Code, Cursor, Codex, Copilot…) that add this SDK to an app or work on
this repo. Humans: see README.md.

Server-side: create and manage links and send conversion events from a backend. Zero dependencies. Uses the **secret key**.

## Install

Not on the npm registry yet: install from GitHub (it builds during install).

```sh
npm install github:bazingga08/strait-sdk-node#v0.6.3
```

## Keys (the rule agents get wrong most)

- **Publishable key** `st_pub_live_…` (Dashboard → Get started): for apps and websites (the mobile and web SDKs). This SDK doesn't use it.
- **Secret key** `st_live_…` (Dashboard → Settings → Secret keys): what this SDK takes (`apiKey`). Read it from an environment variable on the server; never ship it in an app, a web page or a public repo. If it leaks, revoke it in the dashboard.
- Never commit either key's real value to this repo, tests or examples. Use placeholders like `st_pub_live_…`.

## Receive links: the one pattern

This SDK doesn't receive links (apps do that with the mobile SDKs). It creates them:

```ts
import { StraitClient } from '@straitlink/node';

const links = new StraitClient({ apiKey: process.env.STRAIT_SECRET_KEY!, baseUrl: 'https://strait.link' });
const link = await links.createLink({ slug: 'launch', longUrl: 'https://yourapp.com/launch', tags: ['campaign'] });
console.log(link.shortUrl);   // https://acme.strait.link/launch: share this
await links.sendEvent({ event: 'purchase', value: 499, currency: 'INR', clickId });   // clickId from a webhook, when known
```

Failures throw `StraitError` with `.status` and `.body`. For many links use `POST /v1/links/batch` (up to 500 per
call) rather than a loop.

## Verify

```sh
STRAIT_SECRET_KEY=st_live_… node -e "import('@straitlink/node').then(async ({ StraitClient }) => { const c = new StraitClient({ apiKey: process.env.STRAIT_SECRET_KEY, baseUrl: 'https://strait.link' }); console.log((await c.listLinks()).length, 'links') })"
```

A 401 means a wrong or revoked key (or a publishable key by mistake).

## Working on this repo

- Test: `npm ci && npm run typecheck && npm test` (must pass before any commit; check the exit code).
- This SDK has no match signature (that lives in the app and web SDKs). Its request and response shapes follow
  the engine's OpenAPI description (https://strait.link/v1/openapi.json); keep them in step.
- The package's public identity (name, scope, owner, domain) lives only in `brand.json`; change it with
  `shared-spec/scripts/rename-brand.sh` (all SDKs) or `node scripts/brand.mjs --write`.
- Wire names are part of the contract: query params `strait_click` / `strait_link`, storage keys `strait.*`,
  headers `X-Strait-*`. Don't rename them.
- Brand: Strait (never "Straight"). Don't write superlatives ("best", "cheapest") or speed / match-rate numbers in
  docs or comments. iPhone install matching is in beta.

## More

- Docs for this SDK: https://straitlink.in/docs/sdks/node/
- All docs: https://straitlink.in/docs/ · REST API: https://straitlink.in/docs/api/
- Strait from AI tools (MCP server: create links, check App Links files, trace taps): https://straitlink.in/ai/
