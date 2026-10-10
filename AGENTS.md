# AGENTS.md: Strait Node SDK (@straitlink/node)

Instructions for AI coding agents (Claude Code, Cursor, Codex, Copilot…) that add this SDK to an app or work on
this repo. Humans: see README.md.

Server-side: create and manage links and send conversion events from a backend. Zero dependencies. Uses the **secret key**.

## Install

Not on the npm registry yet: install from GitHub (it builds during install).

```sh
npm install github:bazingga08/strait-sdk-node#v0.6.3
```

Don't guess a package name. `@straitlink/node` is the name it will publish under, but it isn't on npm yet
(`npm view @straitlink/node` returns 404). Names like `strait`, `strait-node` or `@strait/node` are not this
SDK; `strait` on npm belongs to someone else. Use the GitHub line above until this file says otherwise.

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
console.log(link.shortUrl);   // https://hilltop.strait.link/launch: share this (Hilltop Shoes is a made-up shop used in examples)
await links.sendEvent({ event: 'purchase', value: 499, currency: 'INR', clickId });   // clickId from a webhook, when known
```

Failures throw `StraitError` with `.status` and `.body`. For many links use `POST /v1/links/batch` (up to 500 per
call) rather than a loop.

## Verify

```sh
STRAIT_SECRET_KEY=st_live_… node -e "import('@straitlink/node').then(async ({ StraitClient }) => { const c = new StraitClient({ apiKey: process.env.STRAIT_SECRET_KEY, baseUrl: 'https://strait.link' }); console.log((await c.listLinks()).length, 'links') })"
```

A 401 means a wrong or revoked key (or a publishable key by mistake).

### Verify loop (no phone needed)

After creating a link, check what a tap would do and whether the app's domain files are right. Repeat until both
pass, then hand off to the human for a real-device test.

1. **Dry-run a tap:** `GET https://strait.link/v1/simulate?url=<shortUrl>&ua=<user agent>` with
   `Authorization: Bearer $STRAIT_SECRET_KEY`. It returns the `decision` (`redirect`, `interstitial`, `escape`,
   `preview`, `expired`, `not_live`, `blocked`) and where the tap would be sent, without recording a tap, firing
   webhooks or counting toward the plan. Try an Android and an iPhone user agent.
2. **Check App Links / Universal Links files:** `GET https://strait.link/v1/tools/app-links?domain=<link domain>`
   (no key). Fix every finding with `severity: "error"` before shipping.

```sh
curl -s -H "Authorization: Bearer $STRAIT_SECRET_KEY" \
  "https://strait.link/v1/simulate?url=https%3A%2F%2Fhilltop.strait.link%2Flaunch&ua=Mozilla%2F5.0%20(Linux%3B%20Android%2014)"
curl -s "https://strait.link/v1/tools/app-links?domain=hilltop.strait.link"
```

Both are in the OpenAPI description (https://strait.link/v1/openapi.json). iPhone install matching is in beta, so a
simulated iPhone result is not proof of a match.

## Stop and ask the human

These need a person. Don't work around them, don't invent values, and don't mark the task done without them:

- **Signing up** and creating the workspace at https://app.straitlink.in (there is no signup API).
- **The secret key** `st_live_…` (Dashboard → Settings → Secret keys). Ask the human to put it in the server's
  environment; never ask them to paste it into chat, code or a commit.
- **Dashboard settings**: the workspace handle (custom link domains are coming soon), Android package and SHA-256 fingerprints,
  iOS team ID and bundle ID.
- **Store and DNS changes**: Play Console or App Store uploads, DNS records for a custom domain (once custom domains ship; they are coming soon).
- **Anything that costs money** or changes the plan.
- **A real-device test** on an Android phone and an iPhone before calling the integration finished.
- **Publishing this package** to npm, or any release tag (the Strait team does that; see PUBLISHING.md).

## Working on this repo

- Test: `npm ci && npm run typecheck && npm test` (must pass before any commit; check the exit code).
- This SDK has no match signature (that lives in the app and web SDKs). Its request and response shapes follow
  the engine's OpenAPI description (https://strait.link/v1/openapi.json); keep them in step.
- The package's public identity (name, scope, owner, domain) lives only in `brand.json`; change it with
  `shared-spec/scripts/rename-brand.sh` (all SDKs) or `node scripts/brand.mjs --write`.
- Wire names are part of the contract: query params `strait_click` / `strait_link`, storage keys `strait.*`,
  headers `X-Strait-*`. Don't rename them.
- Brand: Strait (the company name is never spelt "Straight"). "Straight" and "Stamped" name the two halves of
  the product (the tap goes straight to the exact screen; every tap is recorded); the tagline is "Straight to the screen. On the record." Don't write superlatives ("best", "cheapest") or speed / match-rate numbers in
  docs or comments. iPhone install matching is in beta.

## More

- Docs for this SDK: https://straitlink.in/docs/sdks/node/
- Help: talk to the Strait team at support@straitlink.in (replies within 1 working day) or a GitHub issue. Security issues: SECURITY.md.
- All docs: https://straitlink.in/docs/ · REST API: https://straitlink.in/docs/api/
- Strait from AI tools (MCP server: create links, check App Links files, trace taps): https://straitlink.in/ai/
