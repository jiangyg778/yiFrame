// Thin TypeScript facade over the shared runtime implementation.
// All registry logic lives in ./app-registry.runtime.js — keep it that way.
// This file exists only to re-export typed bindings for TS consumers
// (navigation.ts, link.tsx, router.ts, registry.ts, etc.).

export type {
  AppName,
  AppConfigEntry,
  MicroAppRouteContract,
  MicroAppEntry,
  MicroRegistry,
  NavigationItem,
  ClientMatcherEntry,
  AppOnboardingEntry,
  SmokeTargetEntry,
} from './app-registry.runtime';

export {
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
} from './app-registry.runtime';
