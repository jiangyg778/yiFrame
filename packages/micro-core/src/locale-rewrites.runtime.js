'use strict';

/**
 * Shared Next.js rewrite factory for the MAIN app only.
 *
 * Why main needs this:
 *   The browser URL for a main-owned page is `/<locale>/<...>`. We want
 *   Next to render the existing `/pages/<...>.tsx` file under that URL
 *   without duplicating the file tree per locale, so we rewrite the
 *   locale-prefixed URL onto the underlying page. `asPath` is preserved,
 *   so the address bar stays `/<locale>/<...>`.
 *
 * Why sub-apps DON'T use this:
 *   Next.js 14 refuses any rewrite whose source lives outside the app's
 *   `basePath` unless the destination is an absolute http(s) URL. That
 *   makes it impossible for a sub-app with basePath `/activity` to
 *   internally rewrite `/<locale>/activity/...` → `/activity/...`.
 *   Instead, `apps/main/server.js` strips the locale prefix from the
 *   forwarded URL entirely, so sub-apps never see a locale segment.
 */

const { SUPPORTED_LOCALES } = require('./locales.runtime');

const LOCALE_PATTERN = SUPPORTED_LOCALES.join('|');

function createMainAppLocaleRewrites() {
  return [
    { source: `/:locale(${LOCALE_PATTERN})`, destination: '/' },
    { source: `/:locale(${LOCALE_PATTERN})/:path*`, destination: '/:path*' },
  ];
}

module.exports = {
  LOCALE_PATTERN,
  createMainAppLocaleRewrites,
};
