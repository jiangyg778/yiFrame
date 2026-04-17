const { createServer } = require('http');
const next = require('next');
const { createAppResolver, createRuntimeRegistry } = require('./server/app-resolution');
const { renderProxyError } = require('./server/fallback-response');
const { createLogger } = require('./server/logging');
const { extractPathname, normalizeLegacyUrl } = require('./server/path-normalization');
const { createProxyLayer } = require('./server/proxy-request');
const { applyRequestContext, createRequestContext } = require('./server/request-context');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const proxyTimeout = parseInt(process.env.PROXY_TIMEOUT || '10000', 10);
const enableLogging = process.env.PROXY_ENABLE_LOGGING !== 'false';
// WS upgrade proxy is only needed for Next dev HMR. In production builds there
// are no _next/webpack-hmr / __nextjs_original-stack sockets from sub apps.
const enableWsProxy = dev && process.env.PROXY_DISABLE_WS !== 'true';

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
      const pathname = extractPathname(normalizedUrl);

      req.url = normalizedUrl;
      applyRequestContext(req, res, requestContext);

      if (isProxyableRequest(pathname)) {
        const targetApp = matchApp(pathname);

        if (!targetApp || !targetApp.target) {
          renderProxyError(
            res,
            requestContext.traceId,
            targetApp ? targetApp.name : 'micro-app',
            'Missing target URL.'
          );
          return;
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
      logger.info(`WS/HMR proxy: ${enableWsProxy ? 'enabled' : 'disabled'}`);
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
