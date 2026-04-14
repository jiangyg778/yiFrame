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

const logger = createLogger(enableLogging);
const registry = createRuntimeRegistry(process.env);
const { matchApp, isProxyableRequest } = createAppResolver(registry);
const { proxyRequest } = createProxyLayer({
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

    server.listen(port, () => {
      logger.info(`Main app running at http://localhost:${port}`);
      logger.info(`Mode: ${dev ? 'development' : 'production'}`);
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
