import { resolveAuth } from './auth';
import { collectServerContext } from './context';
import { createRequestClient } from './create-client';
import type { RequestClient, RequestClientBaseOptions } from './types';

type IncomingReqLike = {
  headers?: Record<string, string | string[] | undefined>;
};

type OutgoingResLike = unknown; // unused today, kept for future (setCookie propagation)

export interface ServerRequestClientOptions extends RequestClientBaseOptions {
  req?: IncomingReqLike;
  res?: OutgoingResLike;
}

function readHeaderString(
  headers: Record<string, string | string[] | undefined> | undefined,
  key: string
): string | undefined {
  const value = headers?.[key];
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Create a new server-side request client bound to the incoming request.
 *
 * Must NOT be cached across requests — the auth token and trace id come
 * from `req`. Call it once per request (e.g. inside `getServerSideProps`).
 */
export function createServerRequestClient(
  opts: ServerRequestClientOptions
): RequestClient {
  const { req, appName, resolveAuth: customResolveAuth } = opts;

  return createRequestClient({
    ...opts,
    runtime: 'server',
    resolveAuth: customResolveAuth ?? resolveAuth,
    getContext: () => collectServerContext({ appName, req }),
    resolveAuthOptions: () => ({
      runtime: 'server',
      cookieHeader: readHeaderString(req?.headers, 'cookie') || '',
      authorizationHeader: readHeaderString(req?.headers, 'authorization'),
    }),
  });
}
