import {
  getSharedState,
  getSharedStateSnapshotFromCookieHeader,
} from '@miro/micro-core';
import type { RequestContext } from './types';

export function generateTraceId(prefix = 'miro-req'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface BrowserContextInput {
  appName: string;
}

export function collectBrowserContext(input: BrowserContextInput): RequestContext {
  return {
    runtime: 'browser',
    appName: input.appName,
    traceId: generateTraceId(),
    locale: getSharedState('locale') ?? undefined,
    theme: getSharedState('theme') ?? undefined,
  };
}

export interface ServerContextInput {
  appName: string;
  /** Incoming request object (Next.js `req` or generic Node `IncomingMessage`). */
  req?: {
    headers?: Record<string, string | string[] | undefined>;
  };
}

export function collectServerContext(input: ServerContextInput): RequestContext {
  const headers = input.req?.headers ?? {};
  const cookieHeader = typeof headers.cookie === 'string' ? headers.cookie : '';
  const snapshot = getSharedStateSnapshotFromCookieHeader(cookieHeader);
  const incomingTraceId = headers['x-miro-trace-id'];
  const traceId =
    typeof incomingTraceId === 'string' && incomingTraceId.length
      ? incomingTraceId
      : generateTraceId();

  return {
    runtime: 'server',
    appName: input.appName,
    traceId,
    locale: snapshot.locale,
    theme: snapshot.theme,
  };
}
