export type Runtime = 'browser' | 'server';

export type AuthToken = string | null;

export interface ResolveAuthOptions {
  runtime: Runtime;
  /** Raw `Cookie` header, SSR only. */
  cookieHeader?: string;
  /** Raw `Authorization` header, SSR only (for request passthrough). */
  authorizationHeader?: string;
}

export interface RequestContext {
  runtime: Runtime;
  appName: string;
  traceId: string;
  locale?: string;
  theme?: string;
}

export interface UnauthorizedContext {
  runtime: Runtime;
  appName: string;
  traceId: string;
  status: 401 | 403;
}

export type UnauthorizedHandler = (ctx: UnauthorizedContext) => void | Promise<void>;

export interface RequestClientBaseOptions {
  appName: string;
  /** Optional base URL prefix; if omitted, callers pass absolute or proxy-relative paths. */
  baseUrl?: string;
  defaultTimeoutMs?: number;
  /** Override the built-in auth resolver (e.g. for OAuth or custom storage). */
  resolveAuth?: (opts: ResolveAuthOptions) => AuthToken | Promise<AuthToken>;
  /** Additional headers merged with the built-in public headers per request. */
  extraHeaders?: (ctx: RequestContext) => Record<string, string>;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | null | undefined>;
  /** JSON-serialisable body, or a raw `BodyInit` if you need file upload etc. */
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Skip unauthorized pipeline on 401/403 (still throws AppRequestError). */
  silent401?: boolean;
  credentials?: RequestCredentials;
  /** Treat HTTP 200 with non-zero `body.code` as biz error. Default: false. */
  bizCodeFromBody?: boolean;
}

export interface RequestClient {
  get<T = unknown>(url: string, opts?: Omit<RequestOptions, 'method' | 'body'>): Promise<T>;
  post<T = unknown>(url: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>): Promise<T>;
  put<T = unknown>(url: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>): Promise<T>;
  delete<T = unknown>(url: string, opts?: Omit<RequestOptions, 'method' | 'body'>): Promise<T>;
  patch<T = unknown>(url: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>): Promise<T>;
  request<T = unknown>(url: string, opts?: RequestOptions): Promise<T>;
}

export type AppRequestErrorType =
  | 'network'
  | 'timeout'
  | 'abort'
  | 'http'
  | 'biz'
  | 'unauthorized'
  | 'forbidden';
