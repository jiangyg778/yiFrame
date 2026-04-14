import { getAppByName, matchApp, toInternalAppPath, toPublicAppPath } from './registry';
import type { MicroAppEntry, MicroRegistry } from './registry';

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

export type NavigationMode = 'auto' | 'spa' | 'reload';

export interface NavigationContext {
  registry: MicroRegistry;
  currentApp: string;
  currentPathname?: string;
  locales?: readonly string[];
  locale?: string | false;
}

export interface ResolvedNavigationTarget {
  mode: NavigationMode;
  targetApp: MicroAppEntry | undefined;
  publicHref: string;
  internalHref: string;
  pathname: string;
  search: string;
  hash: string;
  isExternal: boolean;
  isSameApp: boolean;
}

const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

function getNavigationOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return 'http://miro.local';
}

function isDevelopmentRuntime(): boolean {
  return process?.env?.NODE_ENV !== 'production';
}

function getMainAppOrigin(): string | undefined {
  const configuredOrigin =
    process?.env?.MAIN_APP_ORIGIN ?? process?.env?.NEXT_PUBLIC_MAIN_APP_ORIGIN;

  if (!configuredOrigin) {
    return undefined;
  }

  try {
    return new URL(configuredOrigin).origin;
  } catch {
    return undefined;
  }
}

function normalizeCurrentPathname(currentPathname?: string): string {
  return currentPathname && currentPathname !== '' ? currentPathname : '/';
}

function stripLocale(pathname: string, locales?: readonly string[]): { localePrefix: string; pathname: string } {
  if (!locales || locales.length === 0 || pathname === '/') {
    return { localePrefix: '', pathname };
  }

  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  if (!firstSegment || !locales.includes(firstSegment)) {
    return { localePrefix: '', pathname };
  }

  const remaining = `/${segments.slice(1).join('/')}`;
  return {
    localePrefix: `/${firstSegment}`,
    pathname: remaining === '/' || remaining === '' ? '/' : remaining,
  };
}

function hasScheme(href: string): boolean {
  return ABSOLUTE_URL_PATTERN.test(href);
}

function withLocalePrefix(pathname: string, localePrefix: string): string {
  if (!localePrefix) return pathname;
  if (pathname === '/') return localePrefix;
  return `${localePrefix}${pathname}`;
}

export function resolveNavigationTarget(
  href: string,
  context: NavigationContext,
  requestedMode: NavigationMode = 'auto'
): ResolvedNavigationTarget {
  const navigationOrigin = getNavigationOrigin();

  if (hasScheme(href) && !href.startsWith('http://') && !href.startsWith('https://')) {
    return {
      mode: 'reload',
      targetApp: undefined,
      publicHref: href,
      internalHref: href,
      pathname: href,
      search: '',
      hash: '',
      isExternal: true,
      isSameApp: false,
    };
  }

  const currentPathname = normalizeCurrentPathname(context.currentPathname);
  const parsedUrl = new URL(href, `${navigationOrigin}${currentPathname}`);
  if (parsedUrl.origin !== navigationOrigin) {
    return {
      mode: 'reload',
      targetApp: undefined,
      publicHref: parsedUrl.toString(),
      internalHref: parsedUrl.toString(),
      pathname: parsedUrl.pathname,
      search: parsedUrl.search,
      hash: parsedUrl.hash,
      isExternal: true,
      isSameApp: false,
    };
  }

  const { localePrefix, pathname } = stripLocale(parsedUrl.pathname, context.locales);
  const targetApp = matchApp(context.registry, pathname);
  const currentApp = getAppByName(context.registry, context.currentApp) ?? getAppByName(context.registry, 'main');

  let effectiveApp = targetApp;
  let publicPathname = pathname;

  if (!effectiveApp && currentApp) {
    effectiveApp = currentApp;
    publicPathname = currentApp.isMainApp ? pathname : toPublicAppPath(currentApp, pathname);
  }

  const isSameApp = Boolean(
    effectiveApp &&
      currentApp &&
      effectiveApp.name === currentApp.name
  );

  const activeLocalePrefix =
    localePrefix || (typeof context.locale === 'string' ? `/${context.locale}` : '');
  const localizedPathname = withLocalePrefix(publicPathname, activeLocalePrefix).replace(/\/{2,}/g, '/');
  const mainAppOrigin = getMainAppOrigin();
  const pathWithQueryAndHash = `${localizedPathname}${parsedUrl.search}${parsedUrl.hash}`;
  const shouldUseDevMainOriginFallback =
    isDevelopmentRuntime() &&
    Boolean(mainAppOrigin) &&
    Boolean(currentApp?.devFallbackToMainOrigin) &&
    Boolean(effectiveApp) &&
    Boolean(currentApp) &&
    !isSameApp &&
    navigationOrigin !== mainAppOrigin;

  const publicHref = shouldUseDevMainOriginFallback
    ? new URL(pathWithQueryAndHash, `${mainAppOrigin}/`).toString()
    : pathWithQueryAndHash;
  const internalHref = effectiveApp
    ? `${toInternalAppPath(effectiveApp, publicPathname)}${parsedUrl.search}${parsedUrl.hash}`
    : publicHref;

  let mode = requestedMode;
  if (requestedMode === 'auto') {
    mode = isSameApp ? 'spa' : 'reload';
  } else if (requestedMode === 'spa' && !isSameApp) {
    mode = 'reload';
  }

  return {
    mode,
    targetApp: effectiveApp,
    publicHref,
    internalHref,
    pathname: publicPathname,
    search: parsedUrl.search,
    hash: parsedUrl.hash,
    isExternal: false,
    isSameApp,
  };
}

export function shouldHandleAsNativeNavigation(
  event: Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>,
  target?: string
): boolean {
  if (target && target !== '_self') return true;
  if (event.button !== 0) return true;
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}
