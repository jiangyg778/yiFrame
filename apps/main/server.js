const { createServer } = require('http');
const next = require('next');
const { createAppResolver, createRuntimeRegistry } = require('./server/app-resolution');
const { renderProxyError } = require('./server/fallback-response');
const { createLogger } = require('./server/logging');
const { extractPathname, normalizeLegacyUrl } = require('./server/path-normalization');
const { createProxyLayer } = require('./server/proxy-request');
const { applyRequestContext, createRequestContext } = require('./server/request-context');
const {
  DEFAULT_LOCALE,
  stripLocalePrefix,
} = require('../../packages/micro-core/src/locales.runtime');

function parseCookieHeader(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (!k) continue;
    out[k] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const proxyTimeout = parseInt(process.env.PROXY_TIMEOUT || '10000', 10);
const enableLogging = process.env.PROXY_ENABLE_LOGGING !== 'false';

// WS upgrade proxy is only needed to forward Next.js dev HMR (`_next/webpack-hmr`)
// from the main origin to the correct sub-app dev server. In production builds
// sub-apps don't emit HMR sockets, so we default to off there.
//
// Switch: PROXY_WS_PROXY
//   'auto' (default) -> on in development, off in production
//   'on'             -> force enable (useful if you proxy a remote dev server)
//   'off'            -> force disable (fall back to directly hitting sub-app ports)
const wsProxyMode = (process.env.PROXY_WS_PROXY || 'auto').toLowerCase();
const enableWsProxy =
  wsProxyMode === 'on' ? true : wsProxyMode === 'off' ? false : dev;

const logger = createLogger(enableLogging);
const registry = createRuntimeRegistry(process.env);
const { matchApp, isProxyableRequest } = createAppResolver(registry);
const { proxy, proxyRequest } = createProxyLayer({
  proxyTimeout,
  logger,
  matchApp,
  extractPathname,
  renderProxyError,
});

const app = next({ dev });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = createServer((req, res) => {
      const requestContext = createRequestContext(req);
      const normalizedUrl = normalizeLegacyUrl(requestContext.requestUrl);
      const rawPathname = extractPathname(normalizedUrl);

      // ---- Locale routing layer -----------------------------------------
      // Contract:
      //   1. The browser URL always carries a /<locale> prefix for
      //      user-facing pages (/, /activity, /account, /futures, ...).
      //   2. Asset and API paths (/_next/*, /api/*, /favicon.ico, etc.) are
      //      NOT locale-prefixed and pass through untouched.
      //   3. We pick the sub-app by the locale-stripped path, but forward
      //      the ORIGINAL url (with prefix) downstream so that
      //      window.location === __NEXT_DATA__.asPath on every page.
      //   4. Any user-facing request missing a locale prefix gets a 302
      //      to /<DEFAULT_LOCALE>/<same-path>.
      const searchIndex = normalizedUrl.indexOf('?');
      const searchSuffix = searchIndex === -1 ? '' : normalizedUrl.slice(searchIndex);
      // Anything Next reserves (`_next`, `api`) OR well-known static files
      // should bypass the locale layer. Note `/activity/_next/...` and
      // `/activity/api/...` also need to pass through untouched, so we
      // match on containment rather than just the leading segment.
      const isAssetPath =
        rawPathname.includes('/_next/') ||
        rawPathname.includes('/api/') ||
        rawPathname.startsWith('/.well-known/') ||
        rawPathname === '/favicon.ico' ||
        rawPathname === '/robots.txt';

      const { locale: urlLocale, pathname: localeStrippedPath } =
        stripLocalePrefix(rawPathname);

      if (!urlLocale && !isAssetPath) {
        const redirectTo = `/${DEFAULT_LOCALE}${
          rawPathname === '/' ? '' : rawPathname
        }${searchSuffix}`;
        res.writeHead(302, { Location: redirectTo });
        res.end();
        return;
      }

      // Keep the shared-state cookie in lockstep with the URL. The URL is
      // the primary source of truth; if a user pastes `/en/...` while the
      // cookie still says zh-cn, we overwrite the cookie so SSR renders
      // the right language and CSR hooks observe the same value.
      if (urlLocale && !isAssetPath) {
        const existing = parseCookieHeader(req.headers.cookie || '')['miro_locale'];
        if (existing !== urlLocale) {
          const expires = new Date(Date.now() + 365 * 864e5).toUTCString();
          res.setHeader(
            'Set-Cookie',
            `miro_locale=${encodeURIComponent(urlLocale)}; Path=/; Expires=${expires}; SameSite=Lax`
          );
        }
      }

      const routingPath = urlLocale ? localeStrippedPath : rawPathname;

      // Main's Next handler gets the URL AS-IS (locale prefix included) so
      // next.config's rewrite `/:locale/:path*` → `/:path*` can do its job
      // while keeping asPath in the address bar.
      //
      // Sub-app Next handlers CANNOT see the locale prefix (Next 14
      // refuses to rewrite outside basePath without an external URL), so
      // we rewrite `req.url` to the stripped path right before handing
      // off to the HTTP proxy. The browser URL in the address bar is
      // unaffected; only the path the proxy forwards downstream is.
      req.url = normalizedUrl;
      applyRequestContext(req, res, requestContext);

      if (isProxyableRequest(routingPath)) {
        const targetApp = matchApp(routingPath);

        if (!targetApp || !targetApp.target) {
          renderProxyError(
            res,
            requestContext.traceId,
            targetApp ? targetApp.name : 'micro-app',
            'Missing target URL.'
          );
          return;
        }

        if (urlLocale) {
          req.url = `${localeStrippedPath}${searchSuffix}`;
        }
        proxyRequest(req, res, targetApp, requestContext);
        return;
      }

      handle(req, res);
    });

    if (enableWsProxy) {
      server.on('upgrade', (req, socket, head) => {
        const pathname = extractPathname(normalizeLegacyUrl(req.url || '/'));
        const targetApp = matchApp(pathname);

        if (!targetApp || targetApp.isMainApp || !targetApp.target) {
          // Let Next's own HMR socket handle its own upgrades on main origin.
          return;
        }

        logger.info('Proxying WS upgrade', {
          targetApp: targetApp.name,
          url: req.url,
          target: targetApp.target,
        });

        proxy.ws(req, socket, head, { target: targetApp.target }, (err) => {
          logger.error('WS upgrade failed', {
            targetApp: targetApp.name,
            url: req.url,
            message: err && err.message ? err.message : 'ws upgrade failed',
          });
          try {
            socket.destroy();
          } catch {
            // ignore
          }
        });
      });
    }

    server.listen(port, () => {
      logger.info(`Main app running at http://localhost:${port}`);
      logger.info(`Mode: ${dev ? 'development' : 'production'}`);
      logger.info(
        `WS/HMR proxy: ${enableWsProxy ? 'enabled' : 'disabled'} (PROXY_WS_PROXY=${wsProxyMode})`
      );
      registry.forEach((appEntry) => {
        logger.info('Registered app', {
          name: appEntry.name,
          basePath: appEntry.basePath,
          target: appEntry.target,
        });
      });
    });
  })
  .catch((error) => {
    console.error('[ProxyServer] Failed to start:', error);
    process.exit(1);
  });
