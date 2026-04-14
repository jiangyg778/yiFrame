const HEADER_TRACE_ID = 'x-miro-trace-id';
const HEADER_SOURCE_APP = 'x-miro-source-app';

function generateTraceId() {
  return `miro-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createRequestContext(req) {
  return {
    traceId: generateTraceId(),
    sourceApp: req.headers[HEADER_SOURCE_APP] || 'main',
    requestUrl: req.url || '/',
  };
}

function applyRequestContext(req, res, context) {
  req.__traceId = context.traceId;
  req.headers[HEADER_TRACE_ID] = context.traceId;
  req.headers[HEADER_SOURCE_APP] = context.sourceApp;
  res.setHeader(HEADER_TRACE_ID, context.traceId);
}

module.exports = {
  HEADER_TRACE_ID,
  HEADER_SOURCE_APP,
  createRequestContext,
  applyRequestContext,
  generateTraceId,
};
