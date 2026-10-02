import { describe, expect, it, vi } from 'vitest';
import { BridgeClient, BridgeError } from '../src/index.js';

function clientWith(handler: (url: string, init: RequestInit) => Response) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return handler(url, init);
  }) as unknown as typeof fetch;
  const client = new BridgeClient({
    apiKey: 'bk_live_test',
    baseUrl: 'https://go.example.com/',
    fetch: fetchMock,
  });
  return { client, calls };
}

const json = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }) as Response;

describe('BridgeClient', () => {
  it('requires apiKey + baseUrl', () => {
    expect(() => new BridgeClient({ apiKey: '', baseUrl: 'x' })).toThrow();
    expect(() => new BridgeClient({ apiKey: 'k', baseUrl: '' })).toThrow();
  });

  it('createLink POSTs with Bearer auth and trims the base slash', async () => {
    const { client, calls } = clientWith(() =>
      json({ id: 'lnk_1', tenantId: 't', slug: 'promo', longUrl: 'https://x.com', isActive: true }),
    );
    const link = await client.createLink({ slug: 'promo', longUrl: 'https://x.com' });
    expect(link.id).toBe('lnk_1');
    expect(calls[0]!.url).toBe('https://go.example.com/v1/links');
    expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe('Bearer bk_live_test');
    expect(calls[0]!.init.method).toBe('POST');
  });

  it('listLinks GETs', async () => {
    const { client, calls } = clientWith(() => json([{ id: 'lnk_1' }]));
    const links = await client.listLinks();
    expect(links).toHaveLength(1);
    expect(calls[0]!.init.method).toBe('GET');
  });

  it('updateLink PATCHes the slug path', async () => {
    const { client, calls } = clientWith(() => json({ id: 'lnk_1', slug: 'p', longUrl: 'https://y.com' }));
    await client.updateLink('p', { longUrl: 'https://y.com' });
    expect(calls[0]!.url).toBe('https://go.example.com/v1/links/p');
    expect(calls[0]!.init.method).toBe('PATCH');
  });

  it('deleteLink DELETEs', async () => {
    const { client, calls } = clientWith(() => ({ ok: true, status: 204, text: async () => '' }) as Response);
    await client.deleteLink('gone');
    expect(calls[0]!.init.method).toBe('DELETE');
  });

  it('sendEvent POSTs with the secret key (server-side, no publishable key)', async () => {
    const { client, calls } = clientWith(() => json({ ok: true }, 202));
    await client.sendEvent({ event: 'purchase', value: 9.99 });
    expect(calls[0]!.url).toBe('https://go.example.com/v1/event');
    expect((calls[0]!.init.headers as Record<string, string>).Authorization).toMatch(/^Bearer /);
    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body).toMatchObject({ event: 'purchase', value: 9.99 });
    expect(body).not.toHaveProperty('appId');
  });

  it('throws BridgeError with status + parsed body on failure', async () => {
    const { client } = clientWith(() => json({ error: 'slug already exists' }, 409));
    await expect(client.createLink({ slug: 'dup', longUrl: 'https://x.com' })).rejects.toMatchObject({
      name: 'BridgeError',
      status: 409,
      message: 'slug already exists',
    });
  });
});
