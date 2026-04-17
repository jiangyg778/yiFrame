'use strict';

// Thin adapter over the shared registry runtime.
// All validation / default-filling / matching logic is owned by
// packages/micro-core/src/app-registry.runtime.js — DO NOT re-implement it here.

const {
  createAppRegistry,
  matchAppByPath,
} = require('../../../packages/micro-core/src/app-registry.runtime');

function createRuntimeRegistry(env) {
  return createAppRegistry(env).apps;
}

function createAppResolver(registryApps) {
  const registry = { apps: registryApps };
  const mainApp = registryApps.find((app) => app.isMainApp);

  function matchApp(pathname) {
    return matchAppByPath(registry, pathname || '/');
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
