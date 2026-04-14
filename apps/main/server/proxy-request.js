const httpProxy = require('http-proxy');
const { HEADER_SOURCE_APP, HEADER_TRACE_ID, generateTraceId } = require('./request-context');

function createProxyLayer({
  proxyTimeout,
  logger,
  matchApp,
  extractPathname,
  renderProxyError,
}) {
  const proxy = httpProxy.createProxyServer({
    changeOrigin: true,
    proxyTimeout,
    timeout: proxyTimeout,
  });

  proxy.on('proxyReq', (proxyReq, req) => {
    proxyReq.setHeader(HEADER_TRACE_ID, req.__traceId);
    proxyReq.setHeader(HEADER_SOURCE_APP, 'main');
  });

  proxy.on('error', (error, req, res) => {
    const pathname = extractPathname(req.url || '/');
    const targetApp = matchApp(pathname);

    logger.error('Proxy request failed', {
      traceId: req.__traceId,
      url: req.url,
      targetApp: targetApp ? targetApp.name : 'unknown',
      message: error.message || 'Proxy request failed.',
    });

    renderProxyError(
      res,
      req.__traceId || generateTraceId(),
      targetApp ? targetApp.name : 'micro-app',
      error.message || 'Proxy request failed.'
    );
  });

  function proxyRequest(req, res, targetApp, context) {
    req.__traceId = context.traceId;
    req.headers[HEADER_TRACE_ID] = context.traceId;
    req.headers[HEADER_SOURCE_APP] = 'main';

    logger.info('Proxying request', {
      traceId: context.traceId,
      targetApp: targetApp.name,
      url: req.url,
      target: targetApp.target,
    });

    proxy.web(req, res, { target: targetApp.target });
  }

  return {
    proxy,
    proxyRequest,
  };
}

module.exports = {
  createProxyLayer,
};
