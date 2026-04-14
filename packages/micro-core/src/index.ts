export type {
  AppConfigEntry,
  AppOnboardingEntry,
  AppName,
  ClientMatcherEntry,
  MicroAppEntry,
  MicroRegistry,
  MicroAppRouteContract,
  NavigationItem,
  SmokeTargetEntry,
} from './registry';

export {
  createAppRegistry,
  createClientRegistry,
  createMainRewrites,
  getAppOnboardingEntries,
  getAppByName,
  getAppConfigEntries,
  getClientMatcherEntries,
  getRegistryEnvTemplate,
  getNavigationItems,
  getSmokeTargetEntries,
  matchApp,
  isPathOwnedBy,
  toInternalAppPath,
  toPublicAppPath,
  validateAppConfigEntries,
} from './registry';

export { MicroLink, MicroLinkProvider, MicroLinkContext } from './link';
export type { MicroLinkProps } from './link';

export { useMicroRouter } from './router';
export type { MicroRouter, NavigateOptions } from './router';

export { resolveNavigationTarget, shouldHandleAsNativeNavigation } from './navigation';
export type { NavigationMode, NavigationContext, ResolvedNavigationTarget } from './navigation';

export {
  destroySharedStateRuntime,
  getDefaultSharedStateSnapshot,
  getSharedState,
  getSharedStateDefinition,
  getSharedStateSnapshotFromCookieHeader,
  hydrateSharedStateSnapshot,
  listSharedStateDefinitions,
  parseCookieFromHeader,
  setSharedState,
  onSharedStateChange,
  validateSharedStateDefinitions,
} from './shared-state';
export type {
  SharedStorageType,
  SharedStateDefinition,
  SharedStateKey,
  SharedStateChangeHandler,
  SharedStateShape,
  SharedStateSnapshot,
} from './shared-state';

export * as EventBus from './event-bus';
export type { EventPayload, EventHandler } from './event-bus';

export * from './constants';
