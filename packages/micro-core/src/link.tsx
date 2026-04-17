'use client';

import React, { useCallback, useMemo } from 'react';
import NextLink from 'next/link';
import { useRouter as useNextRouter } from 'next/router';
import type { MicroRegistry } from './registry';
import { resolveNavigationTarget, shouldHandleAsNativeNavigation, type NavigationMode } from './navigation';
import { SUPPORTED_LOCALES, type SupportedLocale } from './locales';

export interface MicroLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  appName?: string;
  mode?: NavigationMode;
  locale?: string | false;
  prefetch?: boolean;
  children: React.ReactNode;
}

interface MicroLinkContextValue {
  registry: MicroRegistry;
  currentApp: string;
  /** Active locale (cookie / URL). Propagated into navigation so generated
   *  public hrefs carry the `/zh-cn` or `/en` prefix automatically. */
  locale?: SupportedLocale;
}

export const MicroLinkContext = React.createContext<MicroLinkContextValue>({
  registry: { apps: [] },
  currentApp: 'main',
});

export function MicroLinkProvider({
  registry,
  currentApp,
  locale,
  children,
}: MicroLinkContextValue & { children: React.ReactNode }) {
  const value = useMemo(
    () => ({ registry, currentApp, locale }),
    [registry, currentApp, locale]
  );
  return <MicroLinkContext.Provider value={value}>{children}</MicroLinkContext.Provider>;
}

export function MicroLink({
  href,
  mode = 'auto',
  children,
  onClick,
  target,
  locale,
  prefetch,
  ...rest
}: MicroLinkProps) {
  const { registry, currentApp, locale: contextLocale } = React.useContext(MicroLinkContext);
  const nextRouter = useNextRouter();

  // `locale === false` opts out of locale-aware routing for this single link
  // (e.g. external absolute URLs that already encode their own locale).
  const effectiveLocale = locale === false ? undefined : locale ?? contextLocale;
  const effectiveLocales = nextRouter.locales ?? SUPPORTED_LOCALES;

  const resolved = useMemo(
    () =>
      resolveNavigationTarget(
        href,
        {
          registry,
          currentApp,
          currentPathname: nextRouter.asPath,
          locales: effectiveLocales,
          locale: effectiveLocale,
        },
        mode
      ),
    [href, registry, currentApp, nextRouter.asPath, effectiveLocales, effectiveLocale, mode]
  );

  const handleReloadClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      if (shouldHandleAsNativeNavigation(event.nativeEvent, target)) {
        return;
      }

      event.preventDefault();
      window.location.assign(resolved.publicHref);
    },
    [onClick, resolved.publicHref, target]
  );

  if (resolved.mode === 'spa') {
    return (
      <NextLink
        href={resolved.internalHref}
        onClick={onClick}
        target={target}
        locale={locale}
        prefetch={prefetch}
        {...rest}
      >
        {children}
      </NextLink>
    );
  }

  return (
    <a href={resolved.publicHref} onClick={handleReloadClick} target={target} {...rest}>
      {children}
    </a>
  );
}
