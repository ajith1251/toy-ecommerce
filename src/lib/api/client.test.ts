import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, isApiError } from './errors';
import { api } from './client';

describe('api client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('unwraps the data envelope on success', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 1, name: 'Hero Squad Action Pack' } }));

    const result = await api.get<{ id: number }>('/products/1');
    expect(result).toEqual({ id: 1, name: 'Hero Squad Action Pack' });
  });

  it('returns the raw payload when the endpoint does not use an envelope', async () => {
    fetchMock.mockResolvedValue(jsonResponse([1, 2, 3]));
    expect(await api.get<number[]>('/health/raw')).toEqual([1, 2, 3]);
  });

  it('attaches the anonymous client id header and JSON content type', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: {} }));
    await api.post('/orders', { items: [] });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/orders');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-Client-Id']).toMatch(/^[A-Za-z0-9-]{8,}$/);
  });

  it('throws a typed ApiError with code and message for error envelopes', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'insufficient_stock', message: 'Not enough stock' } }, 409)
    );

    const err = await api.get('/orders').catch(e => e);
    expect(isApiError(err)).toBe(true);
    expect(err).toMatchObject({ status: 409, code: 'insufficient_stock', message: 'Not enough stock' });
  });

  it('maps unknown status codes to a stable code', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { message: 'boom' } }, 503));
    const err = await api.get('/x').catch(e => e);
    expect(err).toMatchObject({ status: 503, code: 'internal' });
  });

  it('throws a network ApiError when fetch rejects', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await api.get('/x').catch(e => e);
    expect(isApiError(err)).toBe(true);
    expect(err).toMatchObject({ status: 0, code: 'network' });
  });

  it('throws a network ApiError when the request times out', async () => {
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    });

    const err = await api.get('/slow', { timeoutMs: 5 }).catch(e => e);
    expect(isApiError(err)).toBe(true);
    expect(err).toMatchObject({ code: 'network' });
  });

  it('throws a network ApiError for a non-JSON 500 (no leak of internals)', async () => {
    fetchMock.mockResolvedValue(new Response('<html>oops</html>', { status: 500 }));
    const err = await api.get('/x').catch(e => e);
    expect(isApiError(err)).toBe(true);
    expect(err).toMatchObject({ status: 500, code: 'internal' });
  });
});

describe('ApiError', () => {
  it('is identifiable via isApiError', () => {
    const err = new ApiError('nope', 404, 'not_found');
    expect(isApiError(err)).toBe(true);
    expect(isApiError(new Error('plain'))).toBe(false);
    expect(isApiError('string')).toBe(false);
  });
});
