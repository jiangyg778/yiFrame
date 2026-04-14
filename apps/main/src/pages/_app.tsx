import type { AppProps } from 'next/app';
import { MicroLinkProvider, createClientRegistry, type SharedStateSnapshot } from '@miro/micro-core';
import { SharedStateProvider } from '@miro/shared-state';

const clientRegistry = createClientRegistry();
const currentApp = process.env.NEXT_PUBLIC_APP_NAME || 'main';

type SharedAppProps = AppProps<{
  __sharedStateSnapshot?: Partial<SharedStateSnapshot>;
}>;

export default function App({ Component, pageProps }: SharedAppProps) {
  return (
    <SharedStateProvider initialSnapshot={pageProps.__sharedStateSnapshot}>
      <MicroLinkProvider registry={clientRegistry} currentApp={currentApp}>
        <Component {...pageProps} />
      </MicroLinkProvider>
    </SharedStateProvider>
  );
}
