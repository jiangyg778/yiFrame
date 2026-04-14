function normalizeBasePath(basePath) {
  if (!basePath || basePath === '/') return '/';
  const normalized = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function isConflictingPrefix(left, right) {
  if (left === '/' || right === '/') return false;
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function extractPathname(url) {
  return new URL(url || '/', 'http://localhost').pathname;
}

function normalizeLegacyUrl(url) {
  const staticMatch = url.match(/^\/_apps\/([^/]+)(\/.*)$/);
  if (staticMatch) {
    return `/${staticMatch[1]}${staticMatch[2]}`;
  }

  const legacyDataMatch = url.match(/^\/_next\/data\/([^/]+)\/([^/]+)(?:\/(.*))?\.json(\?.*)?$/);
  if (legacyDataMatch) {
    const [, buildId, appName, pagePath = 'index', search = ''] = legacyDataMatch;
    return `/${appName}/_next/data/${buildId}/${pagePath}.json${search || ''}`;
  }

  return url;
}

module.exports = {
  normalizeBasePath,
  isConflictingPrefix,
  extractPathname,
  normalizeLegacyUrl,
};
