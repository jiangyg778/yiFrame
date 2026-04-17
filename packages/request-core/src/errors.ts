import type { AppRequestErrorType } from './types';

export interface AppRequestErrorInit {
  type: AppRequestErrorType;
  message: string;
  status?: number;
  code?: string | number;
  traceId?: string;
  raw?: unknown;
}

export class AppRequestError extends Error {
  readonly type: AppRequestErrorType;
  readonly status?: number;
  readonly code?: string | number;
  readonly traceId?: string;
  readonly raw?: unknown;

  constructor(init: AppRequestErrorInit) {
    super(init.message);
    this.name = 'AppRequestError';
    this.type = init.type;
    this.status = init.status;
    this.code = init.code;
    this.traceId = init.traceId;
    this.raw = init.raw;
  }
}

export function isAppRequestError(err: unknown): err is AppRequestError {
  return err instanceof AppRequestError;
}

/**
 * Map a raw thrown value from fetch/AbortController to an AppRequestError.
 * Only called for pre-response failures (network / timeout / abort).
 */
export function normalizeFetchThrown(
  err: unknown,
  meta: { traceId?: string; timedOut: boolean; aborted: boolean }
): AppRequestError {
  if (meta.timedOut) {
    return new AppRequestError({
      type: 'timeout',
      message: 'Request timed out',
      traceId: meta.traceId,
      raw: err,
    });
  }
  if (meta.aborted) {
    return new AppRequestError({
      type: 'abort',
      message: 'Request aborted',
      traceId: meta.traceId,
      raw: err,
    });
  }
  const message =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message: unknown }).message)
      : 'Network error';
  return new AppRequestError({ type: 'network', message, traceId: meta.traceId, raw: err });
}
