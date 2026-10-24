// Strait server example: create a deep link and send a conversion event.
// Deferred deep links happen in the app (the web and app SDKs); a server only creates links and records revenue.
import { StraitClient, StraitError } from '@straitlink/node';

const apiKey = process.env.STRAIT_API_KEY ?? '';
if (!apiKey || apiKey.includes('REPLACE_ME')) {
  console.error('Set STRAIT_API_KEY in .env (copy .env.example). Use a test workspace key, never commit it.');
  process.exit(1);
}

const strait = new StraitClient({ apiKey, baseUrl: process.env.STRAIT_BASE_URL ?? 'https://strait-dev.strait.link' });
const slug = `sample-${Date.now().toString(36)}`;

try {
  // 1. A deep link: opens /product/42 in the app, the store when the app is missing.
  const link = await strait.createLink({
    slug,
    longUrl: 'https://example.com/product/42',
    title: 'Strait sample link',
    tags: ['sample'],
  });
  console.log('link created:', link.slug, link.id);

  // 2. A conversion event. Pass the tap id your app forwarded (argv[2]) to put the revenue on that tap.
  await strait.sendEvent({ event: 'purchase', value: 4.99, currency: 'USD', linkId: link.id, clickId: process.argv[2] });
  console.log('event sent: purchase 4.99 USD');

  // 3. Clean up the sample link.
  await strait.deleteLink(slug);
  console.log('link deleted:', slug);
} catch (err) {
  if (err instanceof StraitError) console.error(`Strait said ${err.status}:`, err.body);
  else console.error(err);
  process.exit(1);
}
