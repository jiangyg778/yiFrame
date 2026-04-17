import { COOKIE_AUTH_TOKEN } from './constants';
import type { AuthToken, ResolveAuthOptions } from './types';

/**
 * In-memory override for CSR. Highest priority.
 *
 * Why in-memory and not localStorage:
 *   - localStorage is readable by any script on the same origin (XSS fodder).
 *   - Token lives in an httpOnly/secure cookie as source of truth.
 *   - This override exists only to support login flows that hand the token
 *     back via response body (e.g. OAuth redirect landing page) before the
 *     browser persists the cookie.
 */
let csrTokenOverride: AuthToken = null;

export function setAuthTokenOverride(token: AuthToken): void {
  csrTokenOverride = token;
}

export function clearAuthTokenOverride(): void {
  csrTokenOverride = null;
}

export function getAuthTokenOverride(): AuthToken {
  return csrTokenOverride;
}

export function readTokenFromCookieHeader(cookieHeader: string): AuthToken {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${COOKIE_AUTH_TOKEN}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function readTokenFromDocumentCookie(): AuthToken {
  if (typeof document === 'undefined') return null;
  return readTokenFromCookieHeader(document.cookie || '');
}

function extractBearer(authorizationHeader: string | undefined): AuthToken {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : authorizationHeader;
}

/**
 * Single entry point for auth resolution. Host apps can swap this entirely
 * via `RequestClientBaseOptions.resolveAuth`.
 *
 * Resolution order:
 *   - SSR:  cookie `miro_auth_token` → `Authorization` header → null
 *   - CSR:  in-memory override        → document.cookie `miro_auth_token` → null
 */
export function resolveAuth(opts: ResolveAuthOptions): AuthToken {
  if (opts.runtime === 'server') {
    const fromCookie = readTokenFromCookieHeader(opts.cookieHeader || '');
    if (fromCookie) return fromCookie;
    return extractBearer(opts.authorizationHeader);
  }
  if (csrTokenOverride) return csrTokenOverride;
  return readTokenFromDocumentCookie();
}
