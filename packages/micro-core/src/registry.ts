import type { MicroRegistry } from './app-registry';
import { matchAppByPath } from './app-registry';

export type {
  AppConfigEntry,
  AppName,
  MicroAppEntry,
  MicroRegistry,
  MicroAppRouteContract,
  NavigationItem,
} from './app-registry';

export {
  createAppRegistry,
  createClientRegistry,
  createMainRewrites,
  getAppByName,
  getAppConfigEntries,
  getNavigationItems,
  matchAppByPath as matchApp,
  toInternalAppPath,
  toPublicAppPath,
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
