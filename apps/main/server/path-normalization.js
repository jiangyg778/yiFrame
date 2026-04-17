// path-normalization helpers that are unique to the proxy layer.
// The shared helpers (normalizeBasePath / isConflictingPrefix) are re-exported
// from the registry runtime to avoid drift — do not re-implement them here.

const {
  normalizeBasePath,
  isConflictingPrefix,
} = require('../../../packages/micro-core/src/app-registry.runtime');

function extractPathname(url) {
  try {
    return new URL(url || '/', 'http://localhost').pathname;
  } catch {
    const raw = url || '/';
    const qIndex = raw.indexOf('?');
    return qIndex === -1 ? raw : raw.slice(0, qIndex);
  }
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
