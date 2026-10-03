# @strait/sdk-node

Server SDK for [Strait](../) — create & manage links and send conversion events
from your backend. Zero dependencies; uses your tenant API key.

## Install

<!-- brand:install -->
```sh
npm install @strait/sdk-node
```
<!-- /brand:install -->

## Use

```ts
import { StraitClient } from '@strait/sdk-node';

const strait = new StraitClient({
  apiKey: process.env.STRAIT_API_KEY!,   // st_live_… from the dashboard
  baseUrl: 'https://go.yourbrand.com',
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
