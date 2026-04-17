import type { AppProps } from 'next/app';
import {
  MicroLinkProvider,
  createClientRegistry,
  warnIfSharedStateBoundaryViolated,
  type SharedStateSnapshot,
} from '@miro/micro-core';
import { SharedStateProvider } from '@miro/shared-state';
import { AuthSnapshotProvider, type PublicUser } from '@miro/shared-ui';

const clientRegistry = createClientRegistry();
const currentApp = process.env.NEXT_PUBLIC_APP_NAME || 'account';

if (typeof window !== 'undefined') {
  warnIfSharedStateBoundaryViolated();
}

type SharedAppProps = AppProps<{
  __sharedStateSnapshot?: Partial<SharedStateSnapshot>;
  __authSnapshot?: PublicUser | null;
}>;

export default function App({ Component, pageProps }: SharedAppProps) {
  return (
    <SharedStateProvider initialSnapshot={pageProps.__sharedStateSnapshot}>
      <AuthSnapshotProvider initialUser={pageProps.__authSnapshot ?? null}>
        <MicroLinkProvider registry={clientRegistry} currentApp={currentApp}>
          <Component {...pageProps} />
        </MicroLinkProvider>
      </AuthSnapshotProvider>
    </SharedStateProvider>
  );
}
