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
  title?: string;
  tags?: string[];
  expiresAt?: number;
}

export interface CreateLinkInput {
  slug: string;
  longUrl: string;
  title?: string;
  tags?: string[];
  iosFallbackUrl?: string;
  androidFallbackUrl?: string;
  desktopUrl?: string;
}

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

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    auth = true,
  ): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) headers.Authorization = `Bearer ${this.#apiKey}`;
    const res = await this.doFetch(`${this.baseUrl}${path}`, {
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

  /** Create a short link. */
  createLink(input: CreateLinkInput): Promise<Link> {
    return this.request<Link>('POST', '/v1/links', input);
  }

  /** List the workspace's active links. */
  listLinks(): Promise<Link[]> {
    return this.request<Link[]>('GET', '/v1/links');
  }

  /** Update a link's destination/metadata. */
  updateLink(
    slug: string,
    fields: Partial<Pick<CreateLinkInput, 'longUrl' | 'title' | 'tags'>>,
  ): Promise<Link> {
    return this.request<Link>('PATCH', `/v1/links/${encodeURIComponent(slug)}`, fields);
  }

  /** Deactivate a link. */
  async deleteLink(slug: string): Promise<void> {
    await this.request<null>('DELETE', `/v1/links/${encodeURIComponent(slug)}`);
  }

  /** Send a conversion/revenue event (authenticated with your secret key). */
  async sendEvent(input: SendEventInput): Promise<void> {
    // Server-side: authenticated with the secret key, so no publishable key needed.
    await this.request<unknown>('POST', '/v1/event', input, true);
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
