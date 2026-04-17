import type { AppProps } from 'next/app';
import {
  MicroLinkProvider,
  createClientRegistry,
  normalizeLocale,
  warnIfSharedStateBoundaryViolated,
  type SharedStateSnapshot,
  type SupportedLocale,
} from '@miro/micro-core';
import { SharedStateProvider, useLocale } from '@miro/shared-state';
import { AuthSnapshotProvider, ThemeRuntime, type PublicUser } from '@miro/shared-ui';

const clientRegistry = createClientRegistry();
const currentApp = process.env.NEXT_PUBLIC_APP_NAME || 'activity';

if (typeof window !== 'undefined') {
  warnIfSharedStateBoundaryViolated();
}

type SharedAppProps = AppProps<{
  __sharedStateSnapshot?: Partial<SharedStateSnapshot>;
  __authSnapshot?: PublicUser | null;
}>;

function LocaleAwareShell({ children }: { children: React.ReactNode }) {
  const [rawLocale] = useLocale();
  const locale: SupportedLocale = normalizeLocale(rawLocale);
  return (
    <MicroLinkProvider registry={clientRegistry} currentApp={currentApp} locale={locale}>
      <ThemeRuntime />
      {children}
    </MicroLinkProvider>
  );
}

export default function App({ Component, pageProps }: SharedAppProps) {
  return (
    <SharedStateProvider initialSnapshot={pageProps.__sharedStateSnapshot}>
      <AuthSnapshotProvider initialUser={pageProps.__authSnapshot ?? null}>
        <LocaleAwareShell>
          <Component {...pageProps} />
        </LocaleAwareShell>
      </AuthSnapshotProvider>
    </SharedStateProvider>
  );
}
