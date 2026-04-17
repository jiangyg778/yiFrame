export {
  COOKIE_AUTH_TOKEN,
  DEFAULT_TIMEOUT_MS,
  EVENT_AUTH_UNAUTHORIZED,
  HEADER_AUTHORIZATION,
  HEADER_REQUEST_LOCALE,
  HEADER_SOURCE_APP,
  HEADER_THEME_HINT,
  HEADER_TRACE_ID,
} from './constants';

export {
  clearAuthTokenOverride,
  getAuthTokenOverride,
  readTokenFromCookieHeader,
  resolveAuth,
  setAuthTokenOverride,
} from './auth';

export { collectBrowserContext, collectServerContext, generateTraceId } from './context';

export { AppRequestError, isAppRequestError, normalizeFetchThrown } from './errors';

export { clearUnauthorizedHandlers, fireUnauthorized, onUnauthorized } from './unauthorized';

export { createRequestClient } from './create-client';
export { getBrowserRequestClient, resetBrowserRequestClients } from './browser-client';
export { createServerRequestClient } from './server-client';
export type { ServerRequestClientOptions } from './server-client';

export type {
  AppRequestErrorType,
  AuthToken,
  HttpMethod,
  RequestClient,
  RequestClientBaseOptions,
  RequestContext,
  RequestOptions,
  ResolveAuthOptions,
  Runtime,
  UnauthorizedContext,
  UnauthorizedHandler,
} from './types';
