/**
 * @bridge/sdk-node — manage Bridge links and send conversion events from your
 * backend. Authenticates with a tenant API key (Bearer). Zero dependencies.
 */

export interface BridgeClientOptions {
  /** Your Bridge API key (bk_live_… / bk_test_…). */
  apiKey: string;
  /** Bridge API base, e.g. https://go.yourbrand.com. */
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
  /** Your app id (tenant id). Required by the public /v1/event endpoint. */
  appId: string;
  event: string;
  value?: number;
  currency?: string;
  linkId?: string;
  platform?: string;
}

export class BridgeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'BridgeError';
  }
}

export class BridgeClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly doFetch: typeof fetch;

  constructor(opts: BridgeClientOptions) {
    if (!opts.apiKey) throw new Error('BridgeClient: apiKey is required');
    if (!opts.baseUrl) throw new Error('BridgeClient: baseUrl is required');
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
      throw new BridgeError(msg, res.status, parsed);
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

  /** Send a conversion/revenue event (the /v1/event endpoint is unauthenticated). */
  async sendEvent(input: SendEventInput): Promise<void> {
    await this.request<unknown>('POST', '/v1/event', input, false);
  }
}
