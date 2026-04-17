import { EventBus } from '@miro/micro-core';
import { EVENT_AUTH_UNAUTHORIZED } from './constants';
import type { UnauthorizedContext, UnauthorizedHandler } from './types';

const handlers = new Set<UnauthorizedHandler>();

/**
 * Register a global handler for 401/403 responses.
 *
 * The host app is expected to bind this once during bootstrap (e.g. in main
 * app's `_app.tsx`) to redirect to the login page or pop a re-auth modal.
 *
 * Sub-apps normally do NOT need to register — the event-bus broadcast will
 * reach every tab of the same origin, and main app's handler will drive the
 * actual redirect.
 */
export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function clearUnauthorizedHandlers(): void {
  handlers.clear();
}

export async function fireUnauthorized(ctx: UnauthorizedContext): Promise<void> {
  // Cross-tab, cross-app broadcast. Even if this sub-app has no handler,
  // main app (or any other listener) will pick it up.
  try {
    EventBus.emit(EVENT_AUTH_UNAUTHORIZED, ctx as unknown as Record<string, unknown>);
  } catch (error) {
    // EventBus only works in the browser; on the server we just skip broadcasting.
    if (ctx.runtime === 'browser') {
      // eslint-disable-next-line no-console
      console.error('[request-core] EventBus.emit failed', error);
    }
  }

  const snapshot: UnauthorizedHandler[] = [];
  handlers.forEach((handler) => {
    snapshot.push(handler);
  });
  for (let index = 0; index < snapshot.length; index += 1) {
    try {
      await snapshot[index](ctx);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[request-core] Unauthorized handler threw', error);
    }
  }
}
