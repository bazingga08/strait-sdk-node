<!-- Header: the same in every Strait SDK README (design system v5). -->
<p align="center">
  <a href="https://straitlink.in">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset=".github/assets/strait-lockup-dark.svg">
      <img src=".github/assets/strait-lockup.svg" alt="Strait" width="160" height="53">
    </picture>
  </a>
</p>

<h1 align="center">Strait SDK for Node.js</h1>

<p align="center"><strong>Straight to the screen. On the record.</strong><br>
A tap opens the exact screen, and every link open and install is recorded in your Strait dashboard.</p>

<p align="center">
  <a href="https://github.com/strait-link/strait-sdk-node/tags"><img alt="Latest version" src="https://img.shields.io/github/v/tag/strait-link/strait-sdk-node?sort=semver&label=version&style=flat-square&labelColor=0F0D0A&color=423B33"></a>
  <a href="https://straitlink.in/platform-status/"><img alt="SDK: Beta" src="https://img.shields.io/badge/SDK-beta-423B33?style=flat-square&labelColor=0F0D0A"></a>
  <a href="https://github.com/strait-link/strait-sdk-node/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/strait-link/strait-sdk-node/ci.yml?branch=main&label=CI&style=flat-square&labelColor=0F0D0A"></a>
  <a href="LICENSE"><img alt="Licence: MIT" src="https://img.shields.io/badge/licence-MIT-423B33?style=flat-square&labelColor=0F0D0A"></a>
</p>

<p align="center">
  <a href="https://straitlink.in/docs/sdks/node/">Docs</a> ·
  <a href="https://straitlink.in/platform-status/">Platform status</a> ·
  <a href="CHANGELOG.md">Changelog</a> ·
  <a href="#docs-and-support">Talk to the Strait team</a>
</p>

`@straitlink/node`

Server SDK for [Strait](https://straitlink.in): create and manage
links and send conversion events from your backend. Zero dependencies; uses your tenant API key.

## Quick start (60 seconds)

**1. Install.**

```sh
npm install @straitlink/node
```

**2. Make a link from your server.** Save this as `quickstart.mjs`. The secret key (`st_live_…`) is in **Dashboard → Settings → Secret keys**; keep it on servers only.

```ts
import { StraitClient } from '@straitlink/node';

const strait = new StraitClient({ apiKey: process.env.STRAIT_API_KEY, baseUrl: 'https://strait.link' });
const link = await strait.createLink({ slug: 'hello', longUrl: 'https://shop.example.com/product/42' });
console.log(link.shortUrl);
```

```sh
STRAIT_API_KEY=st_live_… node quickstart.mjs
```

**You should see:** `https://<your-handle>.strait.link/hello`, and the same link in **Dashboard → Links**. Run it twice and the second run throws a `StraitError` with status `409`, because the path is taken.

## Platform features

| Feature | Status | Notes |
|---|---|---|
| Create, list, update and delete links | ◐ Beta | `StraitClient`, with your tenant API key. |
| Conversion events from your backend (`sendEvent`) | ◐ Beta | Pass the `clickId` from the app to tie an event to its tap. |
| iPhone install matching | ◐ Beta | Happens in your app (the mobile SDKs), not on the server. Your choice in Dashboard → Settings → iPhone installs: device matching, paste handoff, both or neither, read from Strait at runtime. Device matching is off by default. iPhone matches are labelled Estimated until measured. |
| Published on npm | ● Live | `npm install @straitlink/node` |

● Live · ◐ Beta · ○ Planned · – Not yet. The same words as the [platform status](https://straitlink.in/platform-status/) page.

## Install

Don't install other names that look similar (`strait` on npm is someone else's package).

<!-- brand:install -->
```sh
npm install @straitlink/node
```
<!-- /brand:install -->

## Use

```ts
import { StraitClient } from '@straitlink/node';

const strait = new StraitClient({
  apiKey: process.env.STRAIT_API_KEY!,   // st_live_… from the dashboard
  baseUrl: 'https://strait.link',        // must be https (http only for localhost)
});

// Create a link
const link = await strait.createLink({
  slug: 'launch',
  longUrl: 'https://yourapp.com/launch',
  tags: ['campaign'],
});

// List / update / delete
await strait.listLinks();
await strait.updateLink('launch', { longUrl: 'https://yourapp.com/launch-v2' });
await strait.deleteLink('launch');

// Send a conversion / revenue event (ties revenue to the funnel)
// Authenticated with your secret key — no publishable key needed server-side.
await strait.sendEvent({ event: 'purchase', value: 49.99, currency: 'USD' });
// Optional: the tap it came from (B15), e.g. forwarded by your app, so the
// dashboard places the revenue on that tap's channel / A/B variant.
await strait.sendEvent({ event: 'purchase', value: 49.99, currency: 'USD', clickId });
```

Failures throw a `StraitError` with `.status` and the parsed `.body` (the raw text when the reply
is not JSON, such as a proxy's HTML 502 page).

## API

| method | endpoint |
|--------|----------|
| `createLink(input)` | `POST /v1/links` |
| `listLinks()` | `GET /v1/links` |
| `updateLink(slug, fields)` | `PATCH /v1/links/:slug` |
| `deleteLink(slug)` | `DELETE /v1/links/:slug` |
| `sendEvent(input)` | `POST /v1/event` |
| `verifyWebhook(rawBody, headers, secret, { toleranceSeconds })` | checks a webhook delivery (no request) |

## Verify a webhook

Pass the raw body (before JSON parsing), the headers and your webhook's signing secret. It checks the
`X-Strait-Signature` HMAC in constant time and refuses deliveries more than 5 minutes old.

```ts
import express from 'express';
import { verifyWebhook } from '@straitlink/node';

const app = express();
app.post('/webhooks/strait', express.raw({ type: 'application/json' }), (req, res) => {
  if (!verifyWebhook(req.body, req.headers, process.env.STRAIT_WEBHOOK_SECRET!)) return res.status(401).end();
  const delivery = JSON.parse(req.body.toString('utf8')); // { id, event, createdAt, data }
  res.status(204).end();
});
```

## Example app

[`examples/node`](examples/node) creates a link, sends a `purchase` event and deletes the link, built against this repo's source (CI builds it on every PR).

1. `npm ci` here, then `cd examples/node && npm ci`.
2. `cp .env.example .env` and set your secret key (`st_live_…`, a test workspace).
3. `npm start`

## Docs and support

- **Docs:** [straitlink.in/docs/sdks/node/](https://straitlink.in/docs/sdks/node/) · [platform status](https://straitlink.in/platform-status/) · [troubleshooting](https://straitlink.in/docs/troubleshooting/)
- **Talk to the Strait team:** [support@straitlink.in](mailto:support@straitlink.in) (replies within 1 working day, IST) or call +91 81218 61890.
- **Bugs and feature requests:** [open an issue](https://github.com/strait-link/strait-sdk-node/issues) on this repo.
- **Security:** never in a public issue. Write to security@straitlink.in (see [SECURITY.md](SECURITY.md)).
