'use strict';

/**
 * Registry runtime — single source of truth for app metadata resolution.
 *
 * This module is written in plain CommonJS so that:
 *   - the Node runtime (apps/main/server.js) can `require` it directly
 *   - the TypeScript layer (app-registry.ts) can re-export it with typings
 *   - tooling scripts (scripts/smoke-check.mjs, scripts/registry/*) can import it
 *
 * DO NOT duplicate this logic elsewhere. If you find yourself re-implementing
 * validateAppConfigEntries / createAppRegistry / matchAppByPath in another file,
 * import from here instead.
 */

const appConfig = require('./apps.config.json');

function normalizeBasePath(basePath) {
  if (!basePath || basePath === '/') return '/';
  const normalized = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function isConflictingPrefix(left, right) {
  if (left === '/' || right === '/') return false;
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidBoolean(value) {
  return typeof value === 'boolean';
}

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function createRouteContract(basePath) {
  return {
    routePrefix: basePath,
    staticAssetPrefix: `${basePath === '/' ? '' : basePath}/_next/static`,
    dataPrefix: `${basePath === '/' ? '' : basePath}/_next/data`,
  };
}

function getRuntimeEnv() {
  if (typeof process !== 'undefined' && process && process.env) {
    return process.env;
  }
  return {};
}

function validateAppConfigEntries(entries) {
  const nameSet = new Set();
  const pathSet = new Set();

  for (const entry of entries) {
    const normalizedBasePath = normalizeBasePath(entry.basePath);

    if (!isNonEmptyString(entry.name)) {
      throw new Error('[Miro] App name is required.');
    }
    if (!isNonEmptyString(entry.displayName)) {
      throw new Error(`[Miro] displayName is required for app "${entry.name}".`);
    }
    if (!normalizedBasePath.startsWith('/')) {
      throw new Error(`[Miro] basePath must start with "/": ${entry.basePath}`);
    }
    if (!isValidBoolean(entry.enabled)) {
      throw new Error(`[Miro] enabled must be boolean for app "${entry.name}".`);
    }
    if (!isValidBoolean(entry.navigation)) {
      throw new Error(`[Miro] navigation must be boolean for app "${entry.name}".`);
    }
    if (entry.standaloneAccessible !== undefined && !isValidBoolean(entry.standaloneAccessible)) {
      throw new Error(`[Miro] standaloneAccessible must be boolean for app "${entry.name}".`);
    }
    if (entry.devFallbackToMainOrigin !== undefined && !isValidBoolean(entry.devFallbackToMainOrigin)) {
      throw new Error(`[Miro] devFallbackToMainOrigin must be boolean for app "${entry.name}".`);
    }
    if (entry.smokeEnabled !== undefined && !isValidBoolean(entry.smokeEnabled)) {
      throw new Error(`[Miro] smokeEnabled must be boolean for app "${entry.name}".`);
    }
    if (entry.description !== undefined && !isNonEmptyString(entry.description)) {
      throw new Error(`[Miro] description must be non-empty for app "${entry.name}".`);
    }

    if (entry.name === 'main') {
      if (entry.targetEnvVar || entry.defaultTarget) {
        throw new Error('[Miro] Main app cannot define targetEnvVar/defaultTarget.');
      }
    } else if (entry.enabled) {
      if (!isNonEmptyString(entry.targetEnvVar)) {
        throw new Error(`[Miro] targetEnvVar is required for app "${entry.name}".`);
      }
      if (!/^[A-Z][A-Z0-9_]*$/.test(entry.targetEnvVar)) {
        throw new Error(`[Miro] targetEnvVar must be uppercase snake case for app "${entry.name}".`);
      }
      if (entry.defaultTarget && !isValidUrl(entry.defaultTarget)) {
        throw new Error(`[Miro] defaultTarget must be a valid URL for app "${entry.name}".`);
      }
    }

    if (nameSet.has(entry.name)) {
      throw new Error(`[Miro] Duplicate app name detected: ${entry.name}`);
    }
    if (pathSet.has(normalizedBasePath)) {
      throw new Error(`[Miro] Duplicate app basePath detected: ${normalizedBasePath}`);
    }

    nameSet.add(entry.name);
    pathSet.add(normalizedBasePath);
  }

  for (let index = 0; index < entries.length; index += 1) {
    for (let cursor = index + 1; cursor < entries.length; cursor += 1) {
      const left = normalizeBasePath(entries[index].basePath);
      const right = normalizeBasePath(entries[cursor].basePath);
      if (isConflictingPrefix(left, right)) {
        throw new Error(
          `[Miro] Conflicting app basePath detected: "${left}" vs "${right}". ` +
            'Nested prefixes are not supported in this registry.'
        );
      }
    }
  }
}

function resolveTarget(entry, env) {
  if (entry.name === 'main') return null;
  if (!entry.targetEnvVar) {
    throw new Error(`[Miro] Missing targetEnvVar for app "${entry.name}"`);
  }
  return env[entry.targetEnvVar] || entry.defaultTarget || null;
}

function normalizeEntry(entry) {
  return {
    ...entry,
    displayName: typeof entry.displayName === 'string' ? entry.displayName.trim() : entry.displayName,
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
  };
}

function getAppConfigEntries() {
  const entries = appConfig.map(normalizeEntry);
  validateAppConfigEntries(entries);
  return entries;
}

function createAppRegistry(env) {
  const effectiveEnv = env || getRuntimeEnv();
  const apps = getAppConfigEntries()
    .filter((entry) => entry.enabled)
    .map((entry) => ({
      ...entry,
      target: resolveTarget(entry, effectiveEnv),
      isMainApp: entry.name === 'main',
      contract: createRouteContract(entry.basePath),
    }));

  return { apps };
}

function createClientRegistry() {
  return {
    apps: createAppRegistry({}).apps.map((app) => ({
      ...app,
      target: null,
    })),
  };
}

function getNavigationItems(registry) {
  return registry.apps
    .filter((app) => app.navigation && !app.isMainApp)
    .map((app) => ({
      name: app.name,
      displayName: app.displayName,
      href: app.basePath,
    }));
}

function getClientMatcherEntries(registry) {
  const effectiveRegistry = registry || createClientRegistry();
  return effectiveRegistry.apps.map((app) => ({
    name: app.name,
    basePath: app.basePath,
    isMainApp: app.isMainApp,
    devFallbackToMainOrigin:
      typeof app.devFallbackToMainOrigin === 'boolean' ? app.devFallbackToMainOrigin : false,
  }));
}

function getRegistryEnvTemplate(entries) {
  const effectiveEntries = entries || getAppConfigEntries();
  const lines = ['MAIN_APP_ORIGIN=http://localhost:3000'];
  for (const entry of effectiveEntries) {
    if (entry.name === 'main' || !entry.targetEnvVar) continue;
    lines.push(`${entry.targetEnvVar}=${entry.defaultTarget || ''}`);
  }
  return lines.join('\n');
}

function getAppOnboardingEntries(entries) {
  const effectiveEntries = entries || getAppConfigEntries();
  return effectiveEntries
    .filter((entry) => entry.name !== 'main')
    .map((entry) => ({
      name: entry.name,
      displayName: entry.displayName,
      basePath: entry.basePath,
      envVar: entry.targetEnvVar || null,
      defaultTarget: entry.defaultTarget || null,
      standaloneAccessible: entry.standaloneAccessible !== false,
      description: entry.description || '',
    }));
}

function getSmokeTargetEntries(entries) {
  const effectiveEntries = entries || getAppConfigEntries();
  return effectiveEntries
    .filter((entry) => entry.enabled && entry.smokeEnabled && entry.name !== 'main')
    .map((entry) => ({
      name: entry.name,
      displayName: entry.displayName,
      basePath: entry.basePath,
    }));
}

function getAppByName(registry, appName) {
  return registry.apps.find((app) => app.name === appName);
}

function matchAppByPath(registry, pathname) {
  const normalizedPath = normalizeBasePath(pathname === '' || !pathname ? '/' : pathname);
  let matched = registry.apps.find((app) => app.isMainApp);
  let maxLen = matched ? matched.basePath.length : 0;

  for (const app of registry.apps) {
    if (app.isMainApp) continue;
    if (normalizedPath === app.basePath || normalizedPath.startsWith(`${app.basePath}/`)) {
      if (app.basePath.length > maxLen) {
        matched = app;
        maxLen = app.basePath.length;
      }
    }
  }

  return matched;
}

function toInternalAppPath(app, publicPathname) {
  const normalizedPath = normalizeBasePath(publicPathname === '' || !publicPathname ? '/' : publicPathname);
  if (app.isMainApp) return normalizedPath;
  if (normalizedPath === app.basePath) return '/';
  if (normalizedPath.startsWith(`${app.basePath}/`)) {
    return normalizedPath.slice(app.basePath.length) || '/';
  }
  return normalizedPath;
}

function toPublicAppPath(app, internalPathname) {
  const normalizedPath = normalizeBasePath(internalPathname === '' || !internalPathname ? '/' : internalPathname);
  if (app.isMainApp) return normalizedPath;
  if (normalizedPath === '/') return app.basePath;
  if (normalizedPath.startsWith(app.basePath)) return normalizedPath;
  return `${app.basePath}${normalizedPath === '/' ? '' : normalizedPath}`;
}

function createMainRewrites() {
  return [];
}

module.exports = {
  normalizeBasePath,
  isConflictingPrefix,
  createRouteContract,
  validateAppConfigEntries,
  getAppConfigEntries,
  createAppRegistry,
  createClientRegistry,
  getNavigationItems,
  getClientMatcherEntries,
  getRegistryEnvTemplate,
  getAppOnboardingEntries,
  getSmokeTargetEntries,
  getAppByName,
  matchAppByPath,
  toInternalAppPath,
  toPublicAppPath,
  createMainRewrites,
};
