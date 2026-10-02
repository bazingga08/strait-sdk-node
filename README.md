# @bridge/sdk-node

Server SDK for [Bridge](../) — create & manage links and send conversion events
from your backend. Zero dependencies; uses your tenant API key.

## Install

```sh
npm install @bridge/sdk-node
```

## Use

```ts
import { BridgeClient } from '@bridge/sdk-node';

const bridge = new BridgeClient({
  apiKey: process.env.BRIDGE_API_KEY!,   // bk_live_… from the dashboard
  baseUrl: 'https://go.yourbrand.com',
});

// Create a link
const link = await bridge.createLink({
  slug: 'launch',
  longUrl: 'https://yourapp.com/launch',
  tags: ['campaign'],
});

// List / update / delete
await bridge.listLinks();
await bridge.updateLink('launch', { longUrl: 'https://yourapp.com/launch-v2' });
await bridge.deleteLink('launch');

// Send a conversion / revenue event (ties revenue to the funnel)
// Authenticated with your secret key — no publishable key needed server-side.
await bridge.sendEvent({ event: 'purchase', value: 49.99, currency: 'USD' });
```

Failures throw a `BridgeError` with `.status` and the parsed `.body`.

## API

| method | endpoint |
|--------|----------|
| `createLink(input)` | `POST /v1/links` |
| `listLinks()` | `GET /v1/links` |
| `updateLink(slug, fields)` | `PATCH /v1/links/:slug` |
| `deleteLink(slug)` | `DELETE /v1/links/:slug` |
| `sendEvent(input)` | `POST /v1/event` |
