'use client';

import { useRouter as useNextRouter } from 'next/router';
import { useContext, useCallback, useMemo } from 'react';
import { MicroLinkContext } from './link';
import { resolveNavigationTarget, type NavigationMode, type ResolvedNavigationTarget } from './navigation';

export interface NavigateOptions {
  mode?: NavigationMode;
  locale?: string | false;
}

export interface MicroRouter {
  push: (url: string, options?: NavigateOptions) => Promise<boolean>;
  replace: (url: string, options?: NavigateOptions) => Promise<boolean>;
  prefetch: (url: string, options?: NavigateOptions) => Promise<void>;
  back: () => void;
  pathname: string;
  query: Record<string, string | string[] | undefined>;
  isSameApp: (url: string, options?: NavigateOptions) => boolean;
  resolveTargetApp: (url: string, options?: NavigateOptions) => ResolvedNavigationTarget;
}

export function useMicroRouter(): MicroRouter {
  const nextRouter = useNextRouter();
  const { registry, currentApp } = useContext(MicroLinkContext);

  const resolveTarget = useCallback(
    (url: string, options?: NavigateOptions) =>
      resolveNavigationTarget(
        url,
        {
          registry,
          currentApp,
          currentPathname: nextRouter.asPath,
          locales: nextRouter.locales,
          locale: options?.locale,
        },
        options?.mode ?? 'auto'
      ),
    [registry, currentApp, nextRouter.asPath, nextRouter.locales]
  );

  const push = useCallback(
    async (url: string, options?: NavigateOptions) => {
      const resolved = resolveTarget(url, options);
      if (resolved.mode === 'spa') {
        return nextRouter.push(resolved.internalHref, undefined, {
          locale: options?.locale,
        });
      }

      window.location.assign(resolved.publicHref);
      return false;
    },
    [nextRouter, resolveTarget]
  );

  const replace = useCallback(
    async (url: string, options?: NavigateOptions) => {
      const resolved = resolveTarget(url, options);
      if (resolved.mode === 'spa') {
        return nextRouter.replace(resolved.internalHref, undefined, {
          locale: options?.locale,
        });
      }

      window.location.replace(resolved.publicHref);
      return false;
    },
    [nextRouter, resolveTarget]
  );

  const prefetch = useCallback(
    async (url: string, options?: NavigateOptions) => {
      const resolved = resolveTarget(url, options);
      if (resolved.mode !== 'spa') return;
      await nextRouter.prefetch(resolved.internalHref);
    },
    [nextRouter, resolveTarget]
  );

  const back = useCallback(() => {
    nextRouter.back();
  }, [nextRouter]);

  const isSameApp = useCallback(
    (url: string, options?: NavigateOptions) => resolveTarget(url, options).isSameApp,
    [resolveTarget]
  );

  return useMemo(
    () => ({
      push,
      replace,
      prefetch,
      back,
      pathname: nextRouter.pathname,
      query: nextRouter.query as Record<string, string | string[] | undefined>,
      isSameApp,
      resolveTargetApp: resolveTarget,
    }),
    [push, replace, prefetch, back, nextRouter.pathname, nextRouter.query, isSameApp, resolveTarget]
  );
}
