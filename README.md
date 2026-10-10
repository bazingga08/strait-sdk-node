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
  <a href="https://github.com/bazingga08/strait-sdk-node/tags"><img alt="Latest version" src="https://img.shields.io/github/v/tag/bazingga08/strait-sdk-node?sort=semver&label=version&style=flat-square&labelColor=0F0D0A&color=423B33"></a>
  <a href="https://straitlink.in/platform-status/"><img alt="SDK: Beta" src="https://img.shields.io/badge/SDK-beta-423B33?style=flat-square&labelColor=0F0D0A"></a>
  <a href="https://github.com/bazingga08/strait-sdk-node/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/bazingga08/strait-sdk-node/ci.yml?branch=main&label=CI&style=flat-square&labelColor=0F0D0A&color=423B33"></a>
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

## Platform features

| Feature | Status | Notes |
|---|---|---|
| Create, list, update and delete links | ◐ Beta | `StraitClient`, with your tenant API key. |
| Conversion events from your backend (`sendEvent`) | ◐ Beta | Pass the `clickId` from the app to tie an event to its tap. |
| iPhone install matching | ◐ Beta | Happens in your app (the mobile SDKs), not on the server. Your choice in Dashboard → Settings → iPhone installs: device matching, paste handoff, both or neither, read from Strait at runtime. Device matching is off by default. iPhone matches are labelled Estimated until measured. |
| Published on npm | – Not yet | Install from GitHub until it is. |

● Live · ◐ Beta · ○ Planned · – Not yet. The same words as the [platform status](https://straitlink.in/platform-status/) page.

## Install

The package will publish as `@straitlink/node`. It isn't on npm yet, so the first command below
doesn't work today. Don't install other names that look similar (`strait` on npm is someone else's package).

<!-- brand:install -->
```sh
npm install @straitlink/node
```
<!-- /brand:install -->

Not on the npm registry yet. Until it is, install from GitHub (npm builds it on install):

```sh
npm install github:bazingga08/strait-sdk-node#v0.6.3
```

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

Failures throw a `StraitError` with `.status` and the parsed `.body`.

## API

| method | endpoint |
|--------|----------|
| `createLink(input)` | `POST /v1/links` |
| `listLinks()` | `GET /v1/links` |
| `updateLink(slug, fields)` | `PATCH /v1/links/:slug` |
| `deleteLink(slug)` | `DELETE /v1/links/:slug` |
| `sendEvent(input)` | `POST /v1/event` |

## Docs and support

- **Docs:** [straitlink.in/docs/sdks/node/](https://straitlink.in/docs/sdks/node/) · [platform status](https://straitlink.in/platform-status/) · [troubleshooting](https://straitlink.in/docs/troubleshooting/)
- **Talk to the Strait team:** [support@straitlink.in](mailto:support@straitlink.in) (replies within 1 working day, IST) or call +91 81218 61890.
- **Bugs and feature requests:** [open an issue](https://github.com/bazingga08/strait-sdk-node/issues) on this repo.
- **Security:** never in a public issue. Write to security@straitlink.in (see [SECURITY.md](SECURITY.md)).
