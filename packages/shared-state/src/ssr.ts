import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from 'next';
import { getSharedStateSnapshotFromCookieHeader, type SharedStateSnapshot } from '@miro/micro-core';

export interface SharedStatePageProps {
  __sharedStateSnapshot?: Partial<SharedStateSnapshot>;
}

export function getSharedStateServerSnapshot(
  context: Pick<GetServerSidePropsContext, 'req'>
): SharedStatePageProps {
  const cookieHeader = context.req?.headers.cookie ?? '';

  return {
    __sharedStateSnapshot: getSharedStateSnapshotFromCookieHeader(cookieHeader),
  };
}

export function withSharedStateServerSideProps<
  P extends { [key: string]: any } = { [key: string]: any }
>(
  handler?: GetServerSideProps<P>
): GetServerSideProps<P & SharedStatePageProps> {
  return async (context) => {
    const sharedPageProps = getSharedStateServerSnapshot(context);

    if (!handler) {
      return {
        props: sharedPageProps as P & SharedStatePageProps,
      };
    }

    const result = await handler(context);
    if (!('props' in result)) {
      return result as GetServerSidePropsResult<P & SharedStatePageProps>;
    }

    return {
      ...result,
      props: {
        ...result.props,
        ...sharedPageProps,
      },
    };
  };
}
