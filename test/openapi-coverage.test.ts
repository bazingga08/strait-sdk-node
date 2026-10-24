// The client against the API's own description (openapi.json, pinned from https://strait.link/openapi.json;
// scripts/openapi-drift.mjs compares the pin with the live file every day). Every secret-key operation, plus
// recordEvent, must be a method named after its operationId that sends that HTTP method to that path.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { StraitClient } from '../src/index.js';

type Op = { method: string; path: string; id: string };
const spec = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8')) as {
  paths: Record<string, Record<string, { operationId?: string; security?: Array<Record<string, unknown>> }>>;
};
const ops: Op[] = Object.entries(spec.paths).flatMap(([path, methods]) =>
  Object.entries(methods)
    .filter(([m, o]) => ['get', 'post', 'put', 'patch', 'delete'].includes(m) && (o.security?.some((s) => 'bearerAuth' in s) || o.operationId === 'recordEvent'))
    .map(([m, o]) => ({ method: m.toUpperCase(), path, id: o.operationId! })),
);

// Arguments that fill each path's {params}; every value is distinct so the URL shows it was used.
const ARGS: Record<string, unknown[]> = {
  listLinks: [],
  createLink: [{ slug: 's', longUrl: 'https://x.example' }],
  batchCreateLinks: [[{ slug: 's', longUrl: 'https://x.example' }]],
  getLink: ['the-slug'],
  updateLink: ['the-slug', { title: 't' }],
  deactivateLink: ['the-slug'],
  getLinkQr: ['the-slug'],
  getAnalytics: [],
  getUsage: [],
  getReferrals: [],
  testWebhook: ['wh-id'],
  simulateTap: [{ url: 'https://x.example' }],
  exportData: [{ part: 'links' }],
  createExportToken: [{ part: 'links' }],
  listDomains: [],
  addDomain: ['go.example.com'],
  removeDomain: ['go.example.com'],
  listWebhookDeliveries: ['wh-id'],
  redeliverWebhookDelivery: ['dl-id'],
  recordEvent: [{ event: 'signup' }],
};
const PARAM: Record<string, string> = { slug: 'the-slug', id: 'wh-id', hostname: 'go.example.com' };

describe('openapi coverage', () => {
  it('the pinned spec has the secret-key operations (sanity)', () => {
    expect(ops.length).toBeGreaterThanOrEqual(20);
  });

  it.each(ops.map((o) => [o.id, o] as const))('%s', async (id, op) => {
    const calls: Array<{ url: string; method: string }> = [];
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method ?? 'GET' });
      return { ok: true, status: 200, text: async () => '{}', arrayBuffer: async () => new ArrayBuffer(0), headers: new Headers() } as unknown as Response;
    }) as unknown as typeof fetch;
    const client = new StraitClient({ apiKey: 'st_live_k', baseUrl: 'https://strait.link', fetch: fetchMock }) as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>;
    expect(typeof client[id], `StraitClient.${id}() is missing`).toBe('function');
    expect(ARGS[id], `add sample arguments for ${id} to ARGS`).toBeDefined();
    await client[id]!(...ARGS[id]!);
    const want = op.path.replace(/\{(\w+)\}/g, (_, p: string) => (id === 'redeliverWebhookDelivery' ? 'dl-id' : PARAM[p] ?? p));
    expect(calls).toHaveLength(1);
    expect(calls[0]!.method).toBe(op.method);
    expect(new URL(calls[0]!.url).pathname).toBe(want);
  });

  it('no method of the table points at an operation the spec no longer has', () => {
    const ids = new Set(ops.map((o) => o.id));
    expect(Object.keys(ARGS).filter((k) => !ids.has(k))).toEqual([]);
  });
});
