import appConfig from './apps.config.json';

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

export type AppName = string;

export interface AppConfigEntry {
  name: AppName;
  displayName: string;
  basePath: string;
  enabled: boolean;
  navigation: boolean;
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

function getRuntimeEnv(): Record<string, string | undefined> {
  if (typeof process !== 'undefined' && process?.env) {
    return process.env;
  }

  return {};
}

function normalizeBasePath(basePath: string): string {
  if (!basePath || basePath === '/') return '/';
  const normalized = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function isConflictingPrefix(left: string, right: string): boolean {
  if (left === '/' || right === '/') return false;
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function createRouteContract(basePath: string): MicroAppRouteContract {
  return {
    routePrefix: basePath,
    staticAssetPrefix: `${basePath === '/' ? '' : basePath}/_next/static`,
    dataPrefix: `${basePath === '/' ? '' : basePath}/_next/data`,
  };
}

function validateConfig(entries: AppConfigEntry[]): void {
  const nameSet = new Set<string>();
  const pathSet = new Set<string>();

  for (const entry of entries) {
    const normalizedBasePath = normalizeBasePath(entry.basePath);

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

function resolveTarget(entry: AppConfigEntry, env: Record<string, string | undefined>): string | null {
  if (entry.name === 'main') return null;
  if (!entry.targetEnvVar) {
    throw new Error(`[Miro] Missing targetEnvVar for app "${entry.name}"`);
  }
  return env[entry.targetEnvVar] ?? entry.defaultTarget ?? null;
}

export function getAppConfigEntries(): AppConfigEntry[] {
  const entries = (appConfig as AppConfigEntry[]).map((entry) => ({
    ...entry,
    basePath: normalizeBasePath(entry.basePath),
  }));

  validateConfig(entries);
  return entries;
}

export function createAppRegistry(
  env: Record<string, string | undefined> = getRuntimeEnv()
): MicroRegistry {
  const apps = getAppConfigEntries()
    .filter((entry) => entry.enabled)
    .map<MicroAppEntry>((entry) => ({
      ...entry,
      target: resolveTarget(entry, env),
      isMainApp: entry.name === 'main',
      contract: createRouteContract(entry.basePath),
    }));

  return { apps };
}

export function createClientRegistry(): MicroRegistry {
  return {
    apps: createAppRegistry({}).apps.map((app) => ({
      ...app,
      target: null,
    })),
  };
}

export function getNavigationItems(registry: MicroRegistry): NavigationItem[] {
  return registry.apps
    .filter((app) => app.navigation && !app.isMainApp)
    .map((app) => ({
      name: app.name,
      displayName: app.displayName,
      href: app.basePath,
    }));
}

export function getAppByName(
  registry: MicroRegistry,
  appName: string
): MicroAppEntry | undefined {
  return registry.apps.find((app) => app.name === appName);
}

export function matchAppByPath(
  registry: MicroRegistry,
  pathname: string
): MicroAppEntry | undefined {
  const normalizedPath = normalizeBasePath(pathname === '' ? '/' : pathname);
  let matched = registry.apps.find((app) => app.isMainApp);
  let maxLen = matched?.basePath.length ?? 0;

  for (const app of registry.apps) {
    if (app.isMainApp) continue;
    if (
      normalizedPath === app.basePath ||
      normalizedPath.startsWith(`${app.basePath}/`)
    ) {
      if (app.basePath.length > maxLen) {
        matched = app;
        maxLen = app.basePath.length;
      }
    }
  }

  return matched;
}

export function toInternalAppPath(app: MicroAppEntry, publicPathname: string): string {
  const normalizedPath = normalizeBasePath(publicPathname === '' ? '/' : publicPathname);
  if (app.isMainApp) return normalizedPath;
  if (normalizedPath === app.basePath) return '/';
  if (normalizedPath.startsWith(`${app.basePath}/`)) {
    return normalizedPath.slice(app.basePath.length) || '/';
  }
  return normalizedPath;
}

export function toPublicAppPath(app: MicroAppEntry, internalPathname: string): string {
  const normalizedPath = normalizeBasePath(internalPathname === '' ? '/' : internalPathname);
  if (app.isMainApp) return normalizedPath;
  if (normalizedPath === '/') return app.basePath;
  if (normalizedPath.startsWith(app.basePath)) return normalizedPath;
  return `${app.basePath}${normalizedPath === '/' ? '' : normalizedPath}`;
}

export function createMainRewrites(): Array<{ source: string; destination: string }> {
  return [];
}
