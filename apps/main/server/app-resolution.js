const appConfig = require('../../../packages/micro-core/src/apps.config.json');
const { isConflictingPrefix, normalizeBasePath } = require('./path-normalization');

function validateRegistry(entries) {
  const nameSet = new Set();
  const pathSet = new Set();

  entries.forEach((entry) => {
    if (!entry.name || typeof entry.name !== 'string') {
      throw new Error('[Miro] App name is required.');
    }
    if (!entry.displayName || typeof entry.displayName !== 'string') {
      throw new Error(`[Miro] displayName is required for app "${entry.name}".`);
    }
    if (!entry.basePath || !entry.basePath.startsWith('/')) {
      throw new Error(`[Miro] basePath must start with "/": ${entry.basePath}`);
    }
    if (typeof entry.enabled !== 'boolean') {
      throw new Error(`[Miro] enabled must be boolean for app "${entry.name}".`);
    }
    if (typeof entry.navigation !== 'boolean') {
      throw new Error(`[Miro] navigation must be boolean for app "${entry.name}".`);
    }
    if (
      entry.standaloneAccessible !== undefined &&
      typeof entry.standaloneAccessible !== 'boolean'
    ) {
      throw new Error(
        `[Miro] standaloneAccessible must be boolean for app "${entry.name}".`
      );
    }
    if (
      entry.devFallbackToMainOrigin !== undefined &&
      typeof entry.devFallbackToMainOrigin !== 'boolean'
    ) {
      throw new Error(
        `[Miro] devFallbackToMainOrigin must be boolean for app "${entry.name}".`
      );
    }
    if (entry.smokeEnabled !== undefined && typeof entry.smokeEnabled !== 'boolean') {
      throw new Error(`[Miro] smokeEnabled must be boolean for app "${entry.name}".`);
    }
    if (entry.name === 'main' && (entry.targetEnvVar || entry.defaultTarget)) {
      throw new Error('[Miro] Main app cannot define targetEnvVar/defaultTarget.');
    }
    if (entry.name !== 'main' && !entry.targetEnvVar) {
      throw new Error(`[Miro] targetEnvVar is required for app "${entry.name}".`);
    }
    if (
      entry.targetEnvVar &&
      !/^[A-Z][A-Z0-9_]*$/.test(entry.targetEnvVar)
    ) {
      throw new Error(
        `[Miro] targetEnvVar must be uppercase snake case for app "${entry.name}".`
      );
    }
    if (entry.defaultTarget) {
      try {
        const parsed = new URL(entry.defaultTarget);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('invalid protocol');
        }
      } catch {
        throw new Error(`[Miro] defaultTarget must be a valid URL for app "${entry.name}".`);
      }
    }

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
      description:
        typeof entry.description === 'string' && entry.description.trim()
          ? entry.description.trim()
          : undefined,
      standaloneAccessible:
        typeof entry.standaloneAccessible === 'boolean' ? entry.standaloneAccessible : true,
      devFallbackToMainOrigin:
        typeof entry.devFallbackToMainOrigin === 'boolean'
          ? entry.devFallbackToMainOrigin
          : entry.name !== 'main',
      smokeEnabled:
        typeof entry.smokeEnabled === 'boolean' ? entry.smokeEnabled : entry.enabled,
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
