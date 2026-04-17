export type AppName = string;

export interface AppConfigEntry {
  name: AppName;
  displayName: string;
  basePath: string;
  enabled: boolean;
  navigation: boolean;
  standaloneAccessible?: boolean;
  devFallbackToMainOrigin?: boolean;
  smokeEnabled?: boolean;
  description?: string;
  targetEnvVar?: string;
  defaultTarget?: string;
}

export interface MicroAppRouteContract {
  routePrefix: string;
  staticAssetPrefix: string;
  dataPrefix: string;
}

export interface MicroAppEntry extends AppConfigEntry {
  target: string | null;
  isMainApp: boolean;
  contract: MicroAppRouteContract;
}

export interface MicroRegistry {
  apps: MicroAppEntry[];
}

export interface NavigationItem {
  name: string;
  displayName: string;
  href: string;
}

export interface ClientMatcherEntry {
  name: string;
  basePath: string;
  isMainApp: boolean;
  devFallbackToMainOrigin: boolean;
}

export interface AppOnboardingEntry {
  name: string;
  displayName: string;
  basePath: string;
  envVar: string | null;
  defaultTarget: string | null;
  standaloneAccessible: boolean;
  description: string;
}

export interface SmokeTargetEntry {
  name: string;
  displayName: string;
  basePath: string;
}

export function normalizeBasePath(basePath: string): string;
export function isConflictingPrefix(left: string, right: string): boolean;
export function createRouteContract(basePath: string): MicroAppRouteContract;
export function validateAppConfigEntries(entries: AppConfigEntry[]): void;
export function getAppConfigEntries(): AppConfigEntry[];
export function createAppRegistry(env?: Record<string, string | undefined>): MicroRegistry;
export function createClientRegistry(): MicroRegistry;
export function getNavigationItems(registry: MicroRegistry): NavigationItem[];
export function getClientMatcherEntries(registry?: MicroRegistry): ClientMatcherEntry[];
export function getRegistryEnvTemplate(entries?: AppConfigEntry[]): string;
export function getAppOnboardingEntries(entries?: AppConfigEntry[]): AppOnboardingEntry[];
export function getSmokeTargetEntries(entries?: AppConfigEntry[]): SmokeTargetEntry[];
export function getAppByName(registry: MicroRegistry, appName: string): MicroAppEntry | undefined;
export function matchAppByPath(
  registry: MicroRegistry,
  pathname: string
): MicroAppEntry | undefined;
export function toInternalAppPath(app: MicroAppEntry, publicPathname: string): string;
export function toPublicAppPath(app: MicroAppEntry, internalPathname: string): string;
export function createMainRewrites(): Array<{ source: string; destination: string }>;
