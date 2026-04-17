'use strict';

/**
 * CommonJS twin of locales.ts — used by the main app's Node proxy (server.js).
 * Keep this list in sync with ./locales.ts.
 */

const SUPPORTED_LOCALES = ['zh-cn', 'en'];
const DEFAULT_LOCALE = 'zh-cn';

function normalizeLocale(raw) {
  if (!raw) return DEFAULT_LOCALE;
  const lower = String(raw).toLowerCase();
  return SUPPORTED_LOCALES.includes(lower) ? lower : DEFAULT_LOCALE;
}

/**
 * Strip a leading `/<locale>` segment from the pathname. Returns both the
 * detected locale (if any) and the remaining path — unchanged if no prefix.
 */
function stripLocalePrefix(pathname) {
  if (!pathname || pathname === '/') return { locale: null, pathname: pathname || '/' };
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return { locale: null, pathname: '/' };
  const first = segments[0].toLowerCase();
  if (!SUPPORTED_LOCALES.includes(first)) return { locale: null, pathname };
  const rest = `/${segments.slice(1).join('/')}`;
  return { locale: first, pathname: rest === '/' || rest === '' ? '/' : rest };
}

module.exports = {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  normalizeLocale,
  stripLocalePrefix,
};
