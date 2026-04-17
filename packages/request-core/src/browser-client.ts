import { getSharedStateOriginBoundary } from '@miro/micro-core';
import { resolveAuth } from './auth';
import { collectBrowserContext } from './context';
import { createRequestClient } from './create-client';
import type { RequestClient, RequestClientBaseOptions } from './types';

const clients = new Map<string, RequestClient>();
let multiOriginWarned = false;

function warnMultiOriginOnce(appName: string): void {
  if (multiOriginWarned) return;
  if (typeof process === 'undefined') return;
  if (process.env?.NODE_ENV === 'production') return;
  try {
    const report = getSharedStateOriginBoundary();
    if (!report.mainAppOrigin || report.matchesMainOrigin) return;
    multiOriginWarned = true;
    // eslint-disable-next-line no-console
    console.warn(
      `[request-core] app "${appName}" is running on ${report.currentOrigin} ` +
        `while MAIN_APP_ORIGIN is ${report.mainAppOrigin}. Cookies are per-origin, ` +
        `so the auth token set on the main origin will NOT be visible here. ` +
        `Navigate through ${report.mainAppOrigin} for end-to-end auth.`
    );
  } catch {
    // shared-state helper is optional at bootstrap time; ignore.
  }
}

/**
 * Get or create a browser-side request client for the given app.
 *
 * Clients are cached per `appName` so repeated imports share the same
 * instance (and therefore the same default settings + extra headers).
 */
export function getBrowserRequestClient(opts: RequestClientBaseOptions): RequestClient {
  warnMultiOriginOnce(opts.appName);

  const existing = clients.get(opts.appName);
  if (existing) return existing;

  const client = createRequestClient({
    ...opts,
    runtime: 'browser',
    resolveAuth: opts.resolveAuth ?? resolveAuth,
    getContext: () => collectBrowserContext({ appName: opts.appName }),
    resolveAuthOptions: () => ({ runtime: 'browser' }),
  });

  clients.set(opts.appName, client);
  return client;
}

export function resetBrowserRequestClients(): void {
  clients.clear();
}
