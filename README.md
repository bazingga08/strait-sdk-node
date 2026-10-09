# Strait SDK for Node.js (server)

`@straitlink/node`

> **Availability:** Server SDK: Beta (installed from GitHub; not on npm yet).
> [Platform status](https://straitlink.in/platform-status/) · [Docs](https://straitlink.in/docs/)

Server SDK for [Strait](https://straitlink.in): create and manage links and send conversion events
from your backend. Zero dependencies; uses your tenant API key.

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

## Support

Questions or a bug: email support@straitlink.in (replies within 1 working day, IST) or open a
[GitHub issue](https://github.com/bazingga08/strait-sdk-node/issues).
Security issues: see [SECURITY.md](SECURITY.md); please don't file them as public issues.
