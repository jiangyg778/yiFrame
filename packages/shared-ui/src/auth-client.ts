import { EventBus } from '@miro/micro-core';
import {
  getBrowserRequestClient,
  isAppRequestError,
} from '@miro/request-core';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
}

interface AuthResponse {
  user: PublicUser;
}

export const EVENT_AUTH_LOGIN = 'auth:login';
export const EVENT_AUTH_LOGOUT = 'auth:logout';

function resolveAppName(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_NAME) {
    return process.env.NEXT_PUBLIC_APP_NAME;
  }
  return 'shared-ui';
}

function client() {
  return getBrowserRequestClient({
    appName: resolveAppName(),
    // Empty baseUrl means all calls are relative to the current origin, so
    // they always hit the main app's API routes when accessed through the
    // main origin proxy.
    baseUrl: '',
    defaultTimeoutMs: 8_000,
  });
}

/**
 * Current user from the server. Returns null when the session is missing or
 * expired — we swallow 401 here because "not logged in" is a normal state
 * for the Header.
 */
export async function fetchMe(): Promise<PublicUser | null> {
  try {
    const { user } = await client().get<AuthResponse>('/api/auth/me', {
      silent401: true,
    });
    return user;
  } catch (error) {
    if (
      isAppRequestError(error) &&
      (error.type === 'unauthorized' || error.type === 'forbidden')
    ) {
      return null;
    }
    throw error;
  }
}

export async function login(email: string, password: string): Promise<PublicUser> {
  const { user } = await client().post<AuthResponse>('/api/auth/login', {
    email,
    password,
  });
  EventBus.emit(EVENT_AUTH_LOGIN, { user } as unknown as Record<string, unknown>);
  return user;
}

export async function register(
  email: string,
  password: string,
  name: string
): Promise<PublicUser> {
  const { user } = await client().post<AuthResponse>('/api/auth/register', {
    email,
    password,
    name,
  });
  EventBus.emit(EVENT_AUTH_LOGIN, { user } as unknown as Record<string, unknown>);
  return user;
}

export async function logout(): Promise<void> {
  try {
    await client().post('/api/auth/logout');
  } finally {
    EventBus.emit(EVENT_AUTH_LOGOUT, {});
  }
}
