/**
 * Cookie used as the single source of truth for the auth token across SSR
 * and CSR. The token is intentionally NOT stored in localStorage — we don't
 * want JS-readable token material sitting on every sub-app's storage.
 *
 * Backend is expected to set this cookie on login. Whether it is httpOnly is
 * a backend decision: if httpOnly, the browser still sends it (we just can't
 * read it for the Authorization header); if not, we read it and forward it.
 */
export const COOKIE_AUTH_TOKEN = 'miro_auth_token';

/** Event name broadcast on 401/403 via `@miro/micro-core` event-bus. */
export const EVENT_AUTH_UNAUTHORIZED = 'auth:unauthorized';

/** Header names injected by request-core. Kept aligned with the proxy layer. */
export const HEADER_AUTHORIZATION = 'authorization';
export const HEADER_TRACE_ID = 'x-miro-trace-id';
export const HEADER_SOURCE_APP = 'x-miro-source-app';
export const HEADER_REQUEST_LOCALE = 'x-request-locale';
export const HEADER_THEME_HINT = 'x-theme';

/** Default request timeout (ms). Overridable per call. */
export const DEFAULT_TIMEOUT_MS = 15_000;
