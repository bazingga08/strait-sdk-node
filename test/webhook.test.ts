import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyWebhook } from '../src/index.js';

// Produced by the engine's own signer (redirect-engine src/core/webhook.ts signPayload, origin/main 1a79830)
// for a buildDelivery('install.matched', …) body at t = 1767225600 (2026-01-01T00:00:00Z).
const SECRET = 'test-signing-secret-not-real';
const T = 1767225600;
const BODY =
  '{"id":"7f3e2c1a-9b4d-4e8f-a6c5-2d1b0e9f8a73","event":"install.matched","createdAt":"2026-01-01T00:00:00.000Z",' +
  '"data":{"linkId":"lnk_123","clickId":"clk_abc","matchMethod":"referrer","platform":"android"}}';
const SIGNATURE = 't=1767225600,v1=d2cdfdfbd495ee284aa5bfd18a1537ea51572eeb7449d8d24b393e27217a8391';

describe('verifyWebhook', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: (T + 10) * 1000 });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts a delivery signed by the engine (string or Buffer body)', () => {
    expect(verifyWebhook(BODY, { 'x-strait-signature': SIGNATURE }, SECRET)).toBe(true);
    expect(verifyWebhook(Buffer.from(BODY), { 'x-strait-signature': SIGNATURE }, SECRET)).toBe(true);
  });

  it('reads the header from fetch Headers, any-case keys and Node header arrays', () => {
    expect(verifyWebhook(BODY, new Headers({ 'X-Strait-Signature': SIGNATURE }), SECRET)).toBe(true);
    expect(verifyWebhook(BODY, { 'X-Strait-Signature': SIGNATURE }, SECRET)).toBe(true);
    expect(verifyWebhook(BODY, { 'x-strait-signature': [SIGNATURE] }, SECRET)).toBe(true);
  });

  it('refuses a tampered body', () => {
    expect(verifyWebhook(BODY.replace('lnk_123', 'lnk_999'), { 'x-strait-signature': SIGNATURE }, SECRET)).toBe(false);
    expect(verifyWebhook(`${BODY} `, { 'x-strait-signature': SIGNATURE }, SECRET)).toBe(false);
  });

  it('refuses the wrong secret', () => {
    expect(verifyWebhook(BODY, { 'x-strait-signature': SIGNATURE }, 'another-secret')).toBe(false);
  });

  it('refuses a timestamp more than 5 minutes from now, either way', () => {
    vi.setSystemTime((T + 301) * 1000);
    expect(verifyWebhook(BODY, { 'x-strait-signature': SIGNATURE }, SECRET)).toBe(false);
    vi.setSystemTime((T - 301) * 1000);
    expect(verifyWebhook(BODY, { 'x-strait-signature': SIGNATURE }, SECRET)).toBe(false);
    vi.setSystemTime((T + 300) * 1000);
    expect(verifyWebhook(BODY, { 'x-strait-signature': SIGNATURE }, SECRET)).toBe(true);
  });

  it('takes a custom toleranceSeconds', () => {
    vi.setSystemTime((T + 3600) * 1000);
    expect(verifyWebhook(BODY, { 'x-strait-signature': SIGNATURE }, SECRET, { toleranceSeconds: 3600 })).toBe(true);
    vi.setSystemTime((T + 30) * 1000);
    expect(verifyWebhook(BODY, { 'x-strait-signature': SIGNATURE }, SECRET, { toleranceSeconds: 10 })).toBe(false);
  });

  it('refuses a missing or malformed header, and a retimed signature', () => {
    const v1 = SIGNATURE.split('v1=')[1];
    for (const h of [undefined, '', 'garbage', `v1=${v1}`, `t=${T}`, `t=abc,v1=${v1}`, `t=${T + 1},v1=${v1}`, `sha256=${v1}`]) {
      expect(verifyWebhook(BODY, { 'x-strait-signature': h }, SECRET)).toBe(false);
    }
    expect(verifyWebhook(BODY, {}, SECRET)).toBe(false);
  });

  it('throws on an empty secret (a config error, never a pass)', () => {
    expect(() => verifyWebhook(BODY, { 'x-strait-signature': SIGNATURE }, '')).toThrow(/secret is required/);
  });

  it('throws a clear error when given parsed JSON instead of the raw body', () => {
    expect(() => verifyWebhook(JSON.parse(BODY), { 'x-strait-signature': SIGNATURE }, SECRET)).toThrow(/raw request body/);
  });

  it('throws on a toleranceSeconds that would switch replay protection off', () => {
    for (const toleranceSeconds of [Number.NaN, Infinity, -1]) {
      expect(() => verifyWebhook(BODY, { 'x-strait-signature': SIGNATURE }, SECRET, { toleranceSeconds })).toThrow(/toleranceSeconds/);
    }
  });

  it('accepts an ArrayBuffer body (fetch request.arrayBuffer())', () => {
    const buf = new TextEncoder().encode(BODY).buffer;
    expect(verifyWebhook(buf, { 'x-strait-signature': SIGNATURE }, SECRET)).toBe(true);
  });
});
