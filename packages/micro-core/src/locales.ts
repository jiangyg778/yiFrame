/**
 * Framework-wide locale contract. Kept intentionally small — just two locales
 * are enough to prove the URL-prefixed navigation loop.
 *
 * ⚠️ Keep in sync with ./locales.runtime.js (the CommonJS twin consumed by
 * the main app's Node proxy).
 */

export const SUPPORTED_LOCALES = ['zh-cn', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'zh-cn';

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value.toLowerCase())
  );
}

/**
 * Normalize a raw locale string (e.g. from cookie or URL). Falls back to the
 * default locale. Always lowercase — URLs are case-insensitive for locale
 * segments by convention here.
 */
export function normalizeLocale(raw: string | undefined | null): SupportedLocale {
  if (!raw) return DEFAULT_LOCALE;
  const lower = raw.toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(lower)
    ? (lower as SupportedLocale)
    : DEFAULT_LOCALE;
}

export interface StripLocaleResult {
  locale: SupportedLocale | null;
  pathname: string;
}

export function stripLocalePrefix(pathname: string): StripLocaleResult {
  if (!pathname || pathname === '/') return { locale: null, pathname: pathname || '/' };
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return { locale: null, pathname: '/' };
  const first = segments[0].toLowerCase();
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(first)) {
    return { locale: null, pathname };
  }
  const rest = `/${segments.slice(1).join('/')}`;
  return {
    locale: first as SupportedLocale,
    pathname: rest === '/' || rest === '' ? '/' : rest,
  };
}

/**
 * Replace (or insert) the locale prefix at the head of a pathname. Used by
 * LocaleSwitcher to compute the target URL of the language switch navigation.
 */
export function replaceLocaleInPath(pathname: string, locale: SupportedLocale): string {
  const { pathname: stripped } = stripLocalePrefix(pathname || '/');
  if (stripped === '/' || stripped === '') return `/${locale}`;
  return `/${locale}${stripped.startsWith('/') ? stripped : `/${stripped}`}`;
}
