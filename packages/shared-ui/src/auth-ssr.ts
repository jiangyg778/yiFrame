import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from 'next';
import {
  createServerRequestClient,
  isAppRequestError,
} from '@miro/request-core';
import type { PublicUser } from './auth-client';

const SESSION_COOKIE_NAME = 'miro_session';

export interface AuthSnapshotPageProps {
  __authSnapshot?: PublicUser | null;
}

function mainAppOrigin(): string {
  return process.env.MAIN_APP_ORIGIN || 'http://localhost:3000';
}

function hasSessionCookie(cookieHeader: string | undefined): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.indexOf(`${SESSION_COOKIE_NAME}=`) !== -1;
}

/**
 * Resolve the current user snapshot on the server.
 *
 * Always goes through the main app's `/api/auth/me` so both main and sub-apps
 * share the same authority. If the cookie is missing we short-circuit without
 * any HTTP round-trip.
 */
export async function resolveAuthSnapshot(
  context: Pick<GetServerSidePropsContext, 'req'>,
  appName: string
): Promise<PublicUser | null> {
  const cookieHeader = context.req?.headers?.cookie;
  if (!hasSessionCookie(cookieHeader)) return null;

  try {
    const client = createServerRequestClient({
      appName,
      baseUrl: mainAppOrigin(),
      req: context.req,
    });
    const { user } = await client.get<{ user: PublicUser }>('/api/auth/me', {
      silent401: true,
      timeoutMs: 2000,
      // createServerRequestClient resolves the session into an Authorization
      // header, but the auth API only reads the `miro_session` cookie.
      // Forward the raw cookie header explicitly so the session round-trips.
      headers: { cookie: cookieHeader as string },
    });
    return user ?? null;
  } catch (error) {
    if (
      isAppRequestError(error) &&
      (error.type === 'unauthorized' || error.type === 'forbidden')
    ) {
      return null;
    }
    // Never fail SSR for a transient auth lookup — the CSR useEffect in
    // AuthMenu will correct the state on mount.
    return null;
  }
}

/**
 * Next.js helper that injects `__authSnapshot` into pageProps. Compose it with
 * `withSharedStateServerSideProps` or a page-specific handler via chaining.
 *
 * Opt-in per page — pages that do not use this helper keep their existing
 * rendering mode (including ASO for purely static pages).
 */
export function withAuthSnapshotServerSideProps<
  P extends { [key: string]: any } = { [key: string]: any }
>(
  appName: string,
  handler?: GetServerSideProps<P>
): GetServerSideProps<P & AuthSnapshotPageProps> {
  return async (context) => {
    const __authSnapshot = await resolveAuthSnapshot(context, appName);

    if (!handler) {
      return {
        props: { __authSnapshot } as P & AuthSnapshotPageProps,
      };
    }

    const result = await handler(context);
    if (!('props' in result)) {
      return result as GetServerSidePropsResult<P & AuthSnapshotPageProps>;
    }

    const innerProps = (await Promise.resolve(result.props)) as P;
    return {
      ...result,
      props: { ...innerProps, __authSnapshot } as P & AuthSnapshotPageProps,
    };
  };
}
