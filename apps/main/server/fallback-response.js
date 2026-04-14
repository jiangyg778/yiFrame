function renderProxyError(res, traceId, appName, errorMessage) {
  if (res.headersSent) {
    res.end();
    return;
  }

  res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <html>
      <body style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h1>502 - Micro App Unavailable</h1>
        <p>${appName} is temporarily unreachable.</p>
        <p style="color: #666;">Please retry in a moment or return to the main app.</p>
        <p style="color: #999; font-size: 13px;">traceId: ${traceId}</p>
        <p style="color: #999; font-size: 13px;">${errorMessage || 'Proxy request failed.'}</p>
        <a href="/" style="color: #2563eb;">Back to Home</a>
      </body>
    </html>
  `);
}

module.exports = {
  renderProxyError,
};
