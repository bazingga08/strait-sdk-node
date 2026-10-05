/**
 * @straitlink/node — manage Strait links and send conversion events from your
 * backend. Authenticates with a tenant API key (Bearer). Zero dependencies.
 */

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
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly doFetch: typeof fetch;

  constructor(opts: StraitClientOptions) {
    if (!opts.apiKey) throw new Error('StraitClient: apiKey is required');
    if (!opts.baseUrl) throw new Error('StraitClient: baseUrl is required');
    checkBaseUrl(opts.baseUrl);
    this.apiKey = opts.apiKey;
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
    if (auth) headers.Authorization = `Bearer ${this.apiKey}`;
    const res = await this.doFetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const parsed = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const msg =
        (parsed && typeof parsed === 'object' && 'error' in parsed
          ? String((parsed as { error: unknown }).error)
          : `HTTP ${res.status}`);
      throw new StraitError(msg, res.status, parsed);
    }
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
