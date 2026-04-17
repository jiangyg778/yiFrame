import {
  DEFAULT_TIMEOUT_MS,
  HEADER_AUTHORIZATION,
  HEADER_REQUEST_LOCALE,
  HEADER_SOURCE_APP,
  HEADER_THEME_HINT,
  HEADER_TRACE_ID,
} from './constants';
import { AppRequestError, normalizeFetchThrown } from './errors';
import { fireUnauthorized } from './unauthorized';
import type {
  AuthToken,
  RequestClient,
  RequestClientBaseOptions,
  RequestContext,
  RequestOptions,
  ResolveAuthOptions,
  Runtime,
} from './types';

export interface InternalCreateClientOptions extends RequestClientBaseOptions {
  runtime: Runtime;
  getContext: () => RequestContext;
  resolveAuthOptions: () => ResolveAuthOptions;
}

function buildUrl(
  baseUrl: string | undefined,
  pathOrUrl: string,
  query: RequestOptions['query']
): string {
  let url = pathOrUrl;
  if (baseUrl && !/^https?:\/\//i.test(pathOrUrl)) {
    const left = baseUrl.replace(/\/+$/, '');
    const right = pathOrUrl.replace(/^\/+/, '');
    url = `${left}/${right}`;
  }

  if (query && Object.keys(query).length) {
    const search = new URLSearchParams();
    Object.keys(query).forEach((key) => {
      const value = query[key];
      if (value === undefined || value === null) return;
      search.append(key, String(value));
    });
    const qs = search.toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }

  return url;
}

function buildPublicHeaders(
  ctx: RequestContext,
  token: AuthToken,
  userHeaders: Record<string, string> | undefined,
  extraHeaders: Record<string, string> | undefined,
  hasJsonBody: boolean
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (hasJsonBody) {
    headers['content-type'] = 'application/json;charset=utf-8';
  }
  headers[HEADER_TRACE_ID] = ctx.traceId;
  headers[HEADER_SOURCE_APP] = ctx.appName;
  if (ctx.locale) headers[HEADER_REQUEST_LOCALE] = ctx.locale;
  if (ctx.theme) headers[HEADER_THEME_HINT] = ctx.theme;
  if (token) headers[HEADER_AUTHORIZATION] = `Bearer ${token}`;

  if (extraHeaders) Object.assign(headers, extraHeaders);
  if (userHeaders) Object.assign(headers, userHeaders);

  return headers;
}

function isPlainJsonBody(body: unknown): boolean {
  if (body === undefined || body === null) return false;
  if (typeof body === 'string') return false;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return false;
  if (typeof Blob !== 'undefined' && body instanceof Blob) return false;
  if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) return false;
  return true;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  if (response.status === 204) return null;
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  try {
    return await response.text();
  } catch {
    return null;
  }
}

export function createRequestClient(opts: InternalCreateClientOptions): RequestClient {
  const {
    appName,
    baseUrl,
    defaultTimeoutMs = DEFAULT_TIMEOUT_MS,
    resolveAuth,
    extraHeaders,
    runtime,
    getContext,
    resolveAuthOptions,
  } = opts;

  async function execute<T>(inputUrl: string, rawOpts: RequestOptions = {}): Promise<T> {
    const ctx = getContext();
    const method = rawOpts.method || 'GET';

    const token: AuthToken = resolveAuth
      ? await resolveAuth(resolveAuthOptions())
      : null;

    const hasBody = rawOpts.body !== undefined && rawOpts.body !== null;
    const isJson = hasBody && isPlainJsonBody(rawOpts.body);

    const headers = buildPublicHeaders(
      ctx,
      token,
      rawOpts.headers,
      extraHeaders ? extraHeaders(ctx) : undefined,
      isJson
    );

    const url = buildUrl(baseUrl, inputUrl, rawOpts.query);

    // Timeout + external signal composition
    const timeoutMs = rawOpts.timeoutMs ?? defaultTimeoutMs;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const externalAbort = () => controller.abort();
    if (rawOpts.signal) {
      if (rawOpts.signal.aborted) externalAbort();
      else rawOpts.signal.addEventListener('abort', externalAbort, { once: true });
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: hasBody
          ? isJson
            ? JSON.stringify(rawOpts.body)
            : (rawOpts.body as BodyInit)
          : undefined,
        signal: controller.signal,
        credentials: rawOpts.credentials ?? 'include',
      });
    } catch (error) {
      clearTimeout(timer);
      if (rawOpts.signal) rawOpts.signal.removeEventListener('abort', externalAbort);
      throw normalizeFetchThrown(error, {
        traceId: ctx.traceId,
        timedOut,
        aborted: !timedOut && controller.signal.aborted,
      });
    }
    clearTimeout(timer);
    if (rawOpts.signal) rawOpts.signal.removeEventListener('abort', externalAbort);

    const parsed = await parseResponseBody(response);
    const responseTraceId = response.headers.get(HEADER_TRACE_ID) || ctx.traceId;

    if (response.status === 401 || response.status === 403) {
      const status = response.status as 401 | 403;
      if (!rawOpts.silent401) {
        void fireUnauthorized({
          appName,
          traceId: responseTraceId,
          status,
          runtime,
        });
      }
      throw new AppRequestError({
        type: status === 401 ? 'unauthorized' : 'forbidden',
        status,
        message: extractErrorMessage(parsed, response),
        traceId: responseTraceId,
        raw: parsed,
      });
    }

    if (!response.ok) {
      throw new AppRequestError({
        type: 'http',
        status: response.status,
        message: extractErrorMessage(parsed, response),
        traceId: responseTraceId,
        raw: parsed,
      });
    }

    if (rawOpts.bizCodeFromBody && parsed && typeof parsed === 'object') {
      const body = parsed as { code?: string | number; message?: string; data?: unknown };
      if (body.code !== undefined && body.code !== 0 && body.code !== '0') {
        throw new AppRequestError({
          type: 'biz',
          status: response.status,
          code: body.code,
          message: body.message || 'Business error',
          traceId: responseTraceId,
          raw: parsed,
        });
      }
      return (body.data !== undefined ? body.data : body) as T;
    }

    return parsed as T;
  }

  const client: RequestClient = {
    request: execute,
    get: (url, o) => execute(url, { ...o, method: 'GET' }),
    post: (url, body, o) => execute(url, { ...o, method: 'POST', body }),
    put: (url, body, o) => execute(url, { ...o, method: 'PUT', body }),
    patch: (url, body, o) => execute(url, { ...o, method: 'PATCH', body }),
    delete: (url, o) => execute(url, { ...o, method: 'DELETE' }),
  };

  return client;
}

function extractErrorMessage(parsed: unknown, response: Response): string {
  if (parsed && typeof parsed === 'object') {
    const asRecord = parsed as { message?: unknown; error?: unknown };
    if (typeof asRecord.message === 'string') return asRecord.message;
    if (typeof asRecord.error === 'string') return asRecord.error;
  }
  return `HTTP ${response.status} ${response.statusText}`;
}
