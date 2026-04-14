const appConfig = require('../../../packages/micro-core/src/apps.config.json');
const { isConflictingPrefix, normalizeBasePath } = require('./path-normalization');

function validateRegistry(entries) {
  const nameSet = new Set();
  const pathSet = new Set();

  entries.forEach((entry) => {
    if (nameSet.has(entry.name)) {
      throw new Error(`[Miro] Duplicate app name detected: ${entry.name}`);
    }

    if (pathSet.has(entry.basePath)) {
      throw new Error(`[Miro] Duplicate app basePath detected: ${entry.basePath}`);
    }

    nameSet.add(entry.name);
    pathSet.add(entry.basePath);
  });

  for (let index = 0; index < entries.length; index += 1) {
    for (let cursor = index + 1; cursor < entries.length; cursor += 1) {
      if (isConflictingPrefix(entries[index].basePath, entries[cursor].basePath)) {
        throw new Error(
          `[Miro] Conflicting app basePath detected: "${entries[index].basePath}" vs "${entries[cursor].basePath}".`
        );
      }
    }
  }
}

function createRuntimeRegistry(env) {
  const entries = appConfig
    .map((entry) => ({
      ...entry,
      basePath: normalizeBasePath(entry.basePath),
    }))
    .filter((entry) => entry.enabled)
    .map((entry) => ({
      ...entry,
      isMainApp: entry.name === 'main',
      target:
        entry.name === 'main'
          ? null
          : env[entry.targetEnvVar] || entry.defaultTarget || null,
      contract: {
        routePrefix: entry.basePath,
        staticAssetPrefix: `${entry.basePath === '/' ? '' : entry.basePath}/_next/static`,
        dataPrefix: `${entry.basePath === '/' ? '' : entry.basePath}/_next/data`,
      },
    }));

  validateRegistry(entries);
  return entries;
}

function createAppResolver(registry) {
  const mainApp = registry.find((app) => app.isMainApp);

  function matchApp(pathname) {
    const normalizedPath = normalizeBasePath(pathname || '/');
    let matched = mainApp;
    let maxLen = matched ? matched.basePath.length : 0;

    registry.forEach((app) => {
      if (app.isMainApp) return;
      if (normalizedPath === app.basePath || normalizedPath.startsWith(`${app.basePath}/`)) {
        if (app.basePath.length > maxLen) {
          matched = app;
          maxLen = app.basePath.length;
        }
      }
    });

    return matched;
  }

  function isProxyableRequest(pathname) {
    const app = matchApp(pathname);
    return Boolean(app && !app.isMainApp);
  }

  return {
    mainApp,
    matchApp,
    isProxyableRequest,
  };
}

module.exports = {
  createRuntimeRegistry,
  createAppResolver,
};
