import { getClientId } from '../anonId';
import { ApiError, codeForStatus, type ApiErrorBody } from './errors';

/**
 * Base URL for the ToyBox REST API. Vite replaces VITE_API_BASE_URL at build
 * time; the default targets the local backend (same machine as the dev
 * server / Playwright preview).
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? 'http://localhost:4000/api';

const DEFAULT_TIMEOUT_MS = 10_000;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** When true, the anonymous client id header is attached (default true). */
  withClientId?: boolean;
  timeoutMs?: number;
}

interface Envelope<T> {
  data?: T;
  error?: ApiErrorBody;
}

/**
 * The single API client. Every service (productService, orderService, …)
 * talks to the backend through here — nothing else calls fetch().
 *
 * Responses use `{ data: … }` / `{ error: { code, message } }` envelopes;
 * the client unwraps `data` and throws ApiError for failures.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, withClientId = true, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (withClientId) headers['X-Client-Id'] = getClientId();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      // Cookie-based authenticated sessions (HttpOnly, SameSite=Lax).
      credentials: 'include',
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('The request timed out — the ToyBox service is unreachable.', 0, 'network');
    }
    throw new ApiError('Network error — the ToyBox service is unreachable.', 0, 'network');
  } finally {
    clearTimeout(timer);
  }

  const payload = (await response.json().catch(() => null)) as Envelope<T> | null;

  if (!response.ok) {
    const errorBody = payload?.error;
    throw new ApiError(
      errorBody?.message ?? `Request failed with status ${response.status}`,
      response.status,
      errorBody?.code ?? codeForStatus(response.status),
      errorBody?.details
    );
  }

  // `{ data: … }` envelope, or the raw payload for endpoints that don't wrap.
  return (payload?.data ?? payload) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};

export { API_BASE_URL };
