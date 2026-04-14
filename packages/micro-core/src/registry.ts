import type { MicroRegistry } from './app-registry';
import { matchAppByPath } from './app-registry';

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
} from './app-registry';

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
  matchAppByPath as matchApp,
  toInternalAppPath,
  toPublicAppPath,
  validateAppConfigEntries,
} from './app-registry';

export function isPathOwnedBy(
  registry: MicroRegistry,
  pathname: string,
  appName: string
): boolean {
  const app = matchAppByPath(registry, pathname);
  return app?.name === appName;
}

export function generateRewrites(): Array<{ source: string; destination: string }> {
  return [];
}

export function generateIndexRewrite(): Array<{ source: string; destination: string }> {
  return [];
}
