/**
 * @straitlink/node — manage Strait links and send conversion events from your
 * backend. Authenticates with a tenant API key (Bearer). Zero dependencies.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export interface StraitClientOptions {
  /** Your Strait API key (st_live_… / st_test_…). */
  apiKey: string;
  /** Strait API base: https://strait.link. */
  baseUrl: string;
  /** Override fetch (tests / custom agents). Defaults to global fetch. */
  fetch?: typeof fetch;
}

export interface Link {
  id: string;
  tenantId: string;
  slug: string;
  /** The link to share, e.g. https://<your-handle>.strait.link/launch (the engine adds it to every link it returns). */
  shortUrl: string;
  longUrl: string;
  isActive: boolean;
  title?: string | null;
  description?: string;
  imageUrl?: string;
  campaign?: string;
  tags?: string[];
  iosFallbackUrl?: string;
  androidFallbackUrl?: string;
  desktopUrl?: string;
  /** Unix ms. */
  expiresAt?: number | null;
  startsAt?: number | null;
  passwordProtected?: boolean;
  variants?: Array<{ url: string; weight?: number }>;
  referralCode?: string;
  [field: string]: unknown;
}

/** POST /v1/links body (OpenAPI `NewLink`). */
export interface CreateLinkInput {
  slug: string;
  longUrl: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  campaign?: string;
  tags?: string[];
  iosFallbackUrl?: string;
  androidFallbackUrl?: string;
  desktopUrl?: string;
  /** ISO date-time or unix ms. */
  expiresAt?: string | number;
  startsAt?: string | number;
  password?: string;
  referralCode?: string;
  [field: string]: unknown;
}

export interface LinkPage {
  links: Link[];
  nextCursor: string | null;
}

export interface ListLinksOptions {
  limit?: number;
  cursor?: string;
  /** Default active. */
  status?: 'active' | 'paused';
}

export interface BatchResult {
  results: Array<{ index: number; ok: boolean; status?: number; link?: Link; error?: string }>;
  [field: string]: unknown;
}

export interface Domain {
  hostname: string;
  verified: boolean;
  status: string;
  message?: string;
  records?: Array<Record<string, unknown>>;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: string;
  attempts: number;
  lastStatus: number | null;
  lastError: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

/** A binary or text answer (a QR image, an export file). */
export interface FileResponse {
  contentType: string;
  body: Uint8Array;
}

export type ExportPart = 'links' | 'taps' | 'events' | 'webhooks' | 'worker';
type Query = Record<string, string | number | boolean | undefined>;

export interface SendEventInput {
  event: string;
  value?: number;
  currency?: string;
  linkId?: string;
  platform?: string;
  /**
   * The tap this conversion came from (contract B15): the tap id your app
   * forwarded (the mobile SDKs attach it to their own events automatically).
   * Kept only when it is a tap of your workspace; otherwise ignored.
   */
  clickId?: string;
}

export class StraitError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'StraitError';
  }
}

/** Hosts where plain http is allowed (local development only). */
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * The API key is sent with every request, so the base URL must be https.
 * Plain http is accepted only for localhost, 127.0.0.1 and ::1.
 */
function checkBaseUrl(baseUrl: string): void {
  let u: URL;
  try {
    u = new URL(baseUrl);
  } catch {
    throw new Error(`StraitClient: baseUrl must be an absolute https URL, e.g. https://strait.link (got "${baseUrl}")`);
  }
  if (u.protocol === 'https:') return;
  if (u.protocol === 'http:' && LOOPBACK.has(u.hostname)) return;
  throw new Error(
    `StraitClient: baseUrl must use https:// (got ${u.protocol}//${u.host}). Your API key is sent with every ` +
      'request, so plain http is only allowed for localhost, 127.0.0.1 and ::1.',
  );
}

export class StraitClient {
  // A true private field (#), so console.log / util.inspect / JSON.stringify never show the key.
  readonly #apiKey: string;
  private readonly baseUrl: string;
  private readonly doFetch: typeof fetch;

  constructor(opts: StraitClientOptions) {
    if (!opts.apiKey) throw new Error('StraitClient: apiKey is required');
    if (!opts.baseUrl) throw new Error('StraitClient: baseUrl is required');
    checkBaseUrl(opts.baseUrl);
    this.#apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.doFetch = opts.fetch ?? globalThis.fetch;
  }

  private url(path: string, query?: Query): string {
    const u = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) u.searchParams.set(k, String(v));
    return u.toString();
  }

  private async request<T>(method: string, path: string, body?: unknown, auth = true, query?: Query): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) headers.Authorization = `Bearer ${this.#apiKey}`;
    const res = await this.doFetch(this.url(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    // A proxy or host error page (an HTML 502) is not JSON: keep the raw text and still throw StraitError.
    let parsed: unknown = null;
    let isJson = true;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
      isJson = false;
    }
    if (!res.ok) {
      const msg =
        (parsed && typeof parsed === 'object' && 'error' in parsed
          ? String((parsed as { error: unknown }).error)
          : `HTTP ${res.status}`);
      throw new StraitError(msg, res.status, parsed);
    }
    if (!isJson) throw new StraitError(`HTTP ${res.status}: response is not JSON`, res.status, parsed);
    return parsed as T;
  }

  /** For answers that are files (QR images, exports): the bytes and their content type. */
  private async file(path: string, query: Query): Promise<FileResponse> {
    const res = await this.doFetch(this.url(path, query), { method: 'GET', headers: { Authorization: `Bearer ${this.#apiKey}` } });
    if (!res.ok) {
      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        /* keep the text */
      }
      const msg = parsed && typeof parsed === 'object' && 'error' in parsed ? String((parsed as { error: unknown }).error) : `HTTP ${res.status}`;
      throw new StraitError(msg, res.status, parsed);
    }
    return { contentType: res.headers?.get('content-type') ?? '', body: new Uint8Array(await res.arrayBuffer()) };
  }

  // Method names follow the OpenAPI operationIds (https://strait.link/openapi.json, pinned in openapi.json);
  // test/openapi-coverage.test.ts fails when a secret-key operation has no method here.

  /** Create a short link. */
  createLink(input: CreateLinkInput): Promise<Link> {
    return this.request<Link>('POST', '/v1/links', input);
  }

  /** Create up to 500 links in one call; each item answers on its own (results[i].ok). */
  batchCreateLinks(links: CreateLinkInput[]): Promise<BatchResult> {
    return this.request<BatchResult>('POST', '/v1/links/batch', { links });
  }

  /** One link by its short path. */
  getLink(slug: string): Promise<Link> {
    return this.request<Link>('GET', `/v1/links/${encodeURIComponent(slug)}`);
  }

  /** The workspace's active links (all of them), or one page with `{ limit, cursor, status }`. */
  listLinks(): Promise<Link[]>;
  listLinks(opts: ListLinksOptions): Promise<LinkPage>;
  listLinks(opts?: ListLinksOptions): Promise<Link[] | LinkPage> {
    return opts ? this.request<LinkPage>('GET', '/v1/links', undefined, true, { ...opts }) : this.request<Link[]>('GET', '/v1/links');
  }

  /** Change a link's destination, preview, campaign, tags or schedule. */
  updateLink(slug: string, fields: Partial<CreateLinkInput>): Promise<Link> {
    return this.request<Link>('PATCH', `/v1/links/${encodeURIComponent(slug)}`, fields);
  }

  /** Pause a link: it stops redirecting; its taps stay and it can be turned back on in the dashboard. */
  async deactivateLink(slug: string): Promise<void> {
    await this.request<null>('DELETE', `/v1/links/${encodeURIComponent(slug)}`);
  }

  /** @deprecated Same as deactivateLink (the link is paused, not deleted). */
  deleteLink(slug: string): Promise<void> {
    return this.deactivateLink(slug);
  }

  /** The link's QR code as PNG (default) or SVG. */
  getLinkQr(
    slug: string,
    opts: { format?: 'svg' | 'png'; size?: number; margin?: number; color?: string; background?: string; logo?: string; track?: boolean } = {},
  ): Promise<FileResponse> {
    return this.file(`/v1/links/${encodeURIComponent(slug)}/qr`, { ...opts });
  }

  /** Taps, opens, installs and revenue for a period, optionally for one link and grouped (day, channel, link…). */
  getAnalytics(q: { from?: string; to?: string; link?: string; group?: string } = {}): Promise<Record<string, unknown>> {
    return this.request('GET', '/v1/analytics', undefined, true, q);
  }

  /** This month's taps against the plan. */
  getUsage(): Promise<Record<string, unknown>> {
    return this.request('GET', '/v1/usage');
  }

  /** Taps and installs per referral code. */
  getReferrals(q: { from?: string; to?: string } = {}): Promise<Record<string, unknown>> {
    return this.request('GET', '/v1/referrals', undefined, true, q);
  }

  /** What a tap on `url` would do for a user agent (no tap is recorded). */
  simulateTap(q: { url: string; ua?: string; country?: string }): Promise<Record<string, unknown>> {
    return this.request('GET', '/v1/simulate', undefined, true, q);
  }

  /** Download a part of your data (links, taps, events, webhooks, worker) as a file. */
  exportData(q: { part: ExportPart; from?: string; to?: string }): Promise<FileResponse> {
    return this.file('/v1/export', q);
  }

  /** A short-lived token to download an export without your key (e.g. from a browser). */
  createExportToken(input: { part: ExportPart; from?: string; to?: string }): Promise<{ token: string; part: string; expiresAt: string; path: string }> {
    return this.request('POST', '/v1/export/token', input);
  }

  /** Send a signed test delivery to one of your webhooks. */
  testWebhook(webhookId: string): Promise<Record<string, unknown>> {
    return this.request('POST', `/v1/webhooks/${encodeURIComponent(webhookId)}/test`);
  }

  /** A webhook's recent deliveries, newest first. */
  listWebhookDeliveries(webhookId: string, opts: { limit?: number; cursor?: string } = {}): Promise<{ deliveries: WebhookDelivery[]; nextCursor: string | null }> {
    return this.request('GET', `/v1/webhooks/${encodeURIComponent(webhookId)}/deliveries`, undefined, true, opts);
  }

  /** Send one delivery again. */
  redeliverWebhookDelivery(deliveryId: string): Promise<Record<string, unknown>> {
    return this.request('POST', `/v1/webhook-deliveries/${encodeURIComponent(deliveryId)}/redeliver`);
  }

  /** Your custom link domains and their verification state. */
  listDomains(): Promise<{ domains: Domain[]; [field: string]: unknown }> {
    return this.request('GET', '/v1/domains');
  }

  /** Add a custom link domain; the answer lists the DNS records to create. */
  addDomain(hostname: string): Promise<Domain> {
    return this.request('POST', '/v1/domains', { hostname });
  }

  async removeDomain(hostname: string): Promise<void> {
    await this.request<null>('DELETE', `/v1/domains/${encodeURIComponent(hostname)}`);
  }

  /** Record a conversion/revenue event (authenticated with your secret key). */
  recordEvent(input: SendEventInput): Promise<{ ok: boolean; clickId: string | null; linkId: string | null }> {
    return this.request('POST', '/v1/event', input);
  }

  /** Same as recordEvent, without the answer. */
  async sendEvent(input: SendEventInput): Promise<void> {
    await this.recordEvent(input);
  }
}

export interface VerifyWebhookOptions {
  /** How far the signed timestamp may be from your clock, in seconds. Default 300 (5 minutes). */
  toleranceSeconds?: number;
}

/**
 * Check that a webhook delivery really came from Strait. Pass the raw request body (the exact
 * bytes, before JSON parsing), the request headers and your webhook's signing secret. Returns
 * false when the `X-Strait-Signature` header is missing or malformed, the timestamp is more than
 * `toleranceSeconds` from now (a replay), or the HMAC-SHA256 of "<t>.<raw body>" doesn't match.
 * Reply 401 when it returns false.
 */
export function verifyWebhook(
  rawBody: string | Uint8Array | ArrayBuffer,
  headers: Headers | Record<string, string | string[] | undefined>,
  secret: string,
  opts: VerifyWebhookOptions = {},
): boolean {
  // An empty secret would accept anything signed with an empty key: a config error, not a bad request.
  if (!secret) throw new Error('verifyWebhook: secret is required');
  const body = rawBody instanceof ArrayBuffer ? new Uint8Array(rawBody) : rawBody;
  if (typeof body !== 'string' && !(body instanceof Uint8Array)) {
    throw new TypeError('verifyWebhook: pass the raw request body (string or Buffer), not parsed JSON (Express: express.raw())');
  }
  const tolerance = opts.toleranceSeconds ?? 300;
  // NaN / Infinity / negative would silently turn the replay check off (or reject everything).
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new TypeError('verifyWebhook: toleranceSeconds must be a finite number of seconds, 0 or more');
  }
  const header = signatureHeader(headers);
  if (!header) return false;
  const parts = new Map(
    header
      .split(',')
      .filter((p) => p.includes('='))
      .map((p) => {
        const i = p.indexOf('=');
        return [p.slice(0, i).trim(), p.slice(i + 1).trim()] as const;
      }),
  );
  const t = parts.get('t') ?? '';
  const v1 = parts.get('v1') ?? '';
  if (!/^\d+$/.test(t) || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > tolerance) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(`${t}.`).update(body).digest('hex'));
  const got = Buffer.from(v1);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

/** X-Strait-Signature from a fetch Headers or a Node/Express headers object (any case). */
function signatureHeader(headers: Headers | Record<string, string | string[] | undefined>): string | undefined {
  if (typeof (headers as Headers).get === 'function') return (headers as Headers).get('x-strait-signature') ?? undefined;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === 'x-strait-signature');
  const value = key === undefined ? undefined : (headers as Record<string, string | string[] | undefined>)[key];
  return Array.isArray(value) ? value[0] : value;
}
