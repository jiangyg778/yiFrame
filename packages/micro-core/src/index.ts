export type {
  AppConfigEntry,
  AppName,
  MicroAppEntry,
  MicroRegistry,
  MicroAppRouteContract,
  NavigationItem,
} from './registry';

export {
  createAppRegistry,
  createClientRegistry,
  createMainRewrites,
  getAppByName,
  getAppConfigEntries,
  getNavigationItems,
  matchApp,
  isPathOwnedBy,
  toInternalAppPath,
  toPublicAppPath,
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
