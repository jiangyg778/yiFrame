import {
  BROADCAST_CHANNEL_NAME,
  COOKIE_LOCALE,
  COOKIE_THEME,
  LS_ASSET_VISIBILITY,
  LS_CURRENCY_RATES,
  SHARED_STATE_SYNC_STORAGE_KEY,
} from './constants';

export type SharedStorageType = 'cookie' | 'localStorage' | 'memory';

export interface SharedStateShape {
  locale: string;
  theme: 'light' | 'dark';
  currencyRates: Record<string, number>;
  assetVisibility: boolean;
}

export type SharedStateKey = keyof SharedStateShape;
export type SharedStateSnapshot = SharedStateShape;

export interface SharedStateDefinition<K extends SharedStateKey = SharedStateKey> {
  key: K;
  storageType: SharedStorageType;
  sourceOfTruth: SharedStorageType;
  ssrReadable: boolean;
  crossTabSync: boolean;
  defaultValue: SharedStateShape[K];
  cookieName?: string;
  storageKey?: string;
  serialize: (value: SharedStateShape[K]) => string;
  deserialize: (raw: string) => SharedStateShape[K];
}

const VALID_STORAGE_TYPES: SharedStorageType[] = ['cookie', 'localStorage', 'memory'];

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const sharedStateDefinitions: {
  [K in SharedStateKey]: SharedStateDefinition<K>;
} = {
  locale: {
    key: 'locale',
    storageType: 'cookie',
    sourceOfTruth: 'cookie',
    ssrReadable: true,
    crossTabSync: true,
    defaultValue: 'zh-CN',
    cookieName: COOKIE_LOCALE,
    serialize: (value) => value,
    deserialize: (raw) => raw || 'zh-CN',
  },
  theme: {
    key: 'theme',
    storageType: 'cookie',
    sourceOfTruth: 'cookie',
    ssrReadable: true,
    crossTabSync: true,
    defaultValue: 'light',
    cookieName: COOKIE_THEME,
    serialize: (value) => value,
    deserialize: (raw) => (raw === 'dark' ? 'dark' : 'light'),
  },
  currencyRates: {
    key: 'currencyRates',
    storageType: 'localStorage',
    sourceOfTruth: 'localStorage',
    ssrReadable: false,
    crossTabSync: true,
    defaultValue: {},
    storageKey: LS_CURRENCY_RATES,
    serialize: (value) => JSON.stringify(value),
    deserialize: (raw) => safeJsonParse<Record<string, number>>(raw, {}),
  },
  assetVisibility: {
    key: 'assetVisibility',
    storageType: 'localStorage',
    sourceOfTruth: 'localStorage',
    ssrReadable: false,
    crossTabSync: true,
    defaultValue: true,
    storageKey: LS_ASSET_VISIBILITY,
    serialize: (value) => JSON.stringify(value),
    deserialize: (raw) => safeJsonParse<boolean>(raw, true),
  },
};

export function validateSharedStateDefinitions(
  definitions: typeof sharedStateDefinitions = sharedStateDefinitions
): void {
  const seenKeys = new Set<string>();

  (Object.entries(definitions) as Array<[SharedStateKey, SharedStateDefinition]>).forEach(
    ([definitionKey, definition]) => {
      if (seenKeys.has(definition.key)) {
        throw new Error(`[SharedState] Duplicate key detected: ${definition.key}`);
      }

      if (definition.key !== definitionKey) {
        throw new Error(
          `[SharedState] Definition key mismatch: expected "${definitionKey}", got "${definition.key}".`
        );
      }

      if (!VALID_STORAGE_TYPES.includes(definition.storageType)) {
        throw new Error(
          `[SharedState] Invalid storageType "${definition.storageType}" for "${definition.key}".`
        );
      }

      if (!VALID_STORAGE_TYPES.includes(definition.sourceOfTruth)) {
        throw new Error(
          `[SharedState] Invalid sourceOfTruth "${definition.sourceOfTruth}" for "${definition.key}".`
        );
      }

      if (definition.defaultValue === undefined) {
        throw new Error(`[SharedState] Missing defaultValue for "${definition.key}".`);
      }

      if (typeof definition.serialize !== 'function' || typeof definition.deserialize !== 'function') {
        throw new Error(`[SharedState] Missing serializer pair for "${definition.key}".`);
      }

      if (definition.ssrReadable && definition.sourceOfTruth !== 'cookie') {
        throw new Error(
          `[SharedState] "${definition.key}" is marked ssrReadable but sourceOfTruth is not cookie.`
        );
      }

      if (definition.ssrReadable && definition.storageType !== 'cookie') {
        throw new Error(
          `[SharedState] "${definition.key}" is marked ssrReadable but storageType is not cookie.`
        );
      }

      seenKeys.add(definition.key);
    }
  );
}

validateSharedStateDefinitions();

type SharedStateEnvelope = {
  type: 'SHARED_STATE_SYNC';
  key: SharedStateKey;
  value: string;
  sourceId: string;
  messageId: string;
};

const memoryState = new Map<SharedStateKey, SharedStateShape[SharedStateKey]>();
const sharedStateListeners = new Set<
  <K extends SharedStateKey>(key: K, value: SharedStateShape[K]) => void
>();
const syncSourceId = `shared-state-${Math.random().toString(36).slice(2, 10)}`;

let syncChannel: BroadcastChannel | null = null;
let syncMode: 'broadcast' | 'storage' | 'none' | null = null;
let storageEventListener: ((event: StorageEvent) => void) | null = null;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function setCookie(name: string, value: string, days = 365): void {
  if (!isBrowser()) return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | undefined {
  if (!isBrowser()) return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function parseCookieValue(cookieHeader: string, cookieName: string): string | undefined {
  const match = cookieHeader.match(new RegExp(`(?:^|; )${cookieName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function notifySharedStateListeners<K extends SharedStateKey>(
  key: K,
  value: SharedStateShape[K]
): void {
  sharedStateListeners.forEach((listener) => {
    listener(key, value);
  });
}

function handleSyncEnvelope(envelope: SharedStateEnvelope): void {
  if (envelope.sourceId === syncSourceId) return;
  const key = envelope.key;
  const definition = sharedStateDefinitions[key];
  const nextValue = definition.deserialize(envelope.value) as SharedStateShape[typeof key];
  writeRawValue(definition as SharedStateDefinition<typeof key>, nextValue);
  notifySharedStateListeners(key, nextValue);
}

function ensureSyncBridge(): void {
  if (!isBrowser() || syncMode) return;

  try {
    syncChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    syncChannel.addEventListener('message', (event: MessageEvent<SharedStateEnvelope>) => {
      if (event.data?.type === 'SHARED_STATE_SYNC') {
        handleSyncEnvelope(event.data);
      }
    });
    syncMode = 'broadcast';
    return;
  } catch {
    syncChannel = null;
  }

  if (typeof window.addEventListener === 'function') {
    storageEventListener = (event: StorageEvent) => {
      if (event.key !== SHARED_STATE_SYNC_STORAGE_KEY || !event.newValue) return;
      const envelope = safeJsonParse<SharedStateEnvelope | null>(event.newValue, null);
      if (envelope?.type === 'SHARED_STATE_SYNC') {
        handleSyncEnvelope(envelope);
      }
    };
    window.addEventListener('storage', storageEventListener);
    syncMode = 'storage';
    return;
  }

  syncMode = 'none';
}

function publishSync<K extends SharedStateKey>(
  key: K,
  value: SharedStateShape[K]
): void {
  const definition = sharedStateDefinitions[key];
  if (!definition.crossTabSync || !isBrowser()) return;

  ensureSyncBridge();

  const envelope: SharedStateEnvelope = {
    type: 'SHARED_STATE_SYNC',
    key,
    value: definition.serialize(value),
    sourceId: syncSourceId,
    messageId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };

  if (syncMode === 'broadcast') {
    syncChannel?.postMessage(envelope);
    return;
  }

  if (syncMode === 'storage') {
    window.localStorage.removeItem(SHARED_STATE_SYNC_STORAGE_KEY);
    window.localStorage.setItem(SHARED_STATE_SYNC_STORAGE_KEY, JSON.stringify(envelope));
  }
}

function readRawValue<K extends SharedStateKey>(definition: SharedStateDefinition<K>): string | undefined {
  if (definition.storageType === 'cookie' && definition.cookieName) {
    return getCookie(definition.cookieName);
  }

  if (definition.storageType === 'localStorage' && definition.storageKey && isBrowser()) {
    return window.localStorage.getItem(definition.storageKey) ?? undefined;
  }

  if (definition.storageType === 'memory') {
    const memoryValue = memoryState.get(definition.key);
    return memoryValue === undefined ? undefined : definition.serialize(memoryValue as SharedStateShape[K]);
  }

  return undefined;
}

function writeRawValue<K extends SharedStateKey>(
  definition: SharedStateDefinition<K>,
  value: SharedStateShape[K]
): void {
  const serialized = definition.serialize(value);

  if (definition.storageType === 'cookie' && definition.cookieName) {
    setCookie(definition.cookieName, serialized);
    return;
  }

  if (definition.storageType === 'localStorage' && definition.storageKey && isBrowser()) {
    window.localStorage.setItem(definition.storageKey, serialized);
    return;
  }

  memoryState.set(definition.key, value);
}

export function getSharedStateDefinition<K extends SharedStateKey>(
  key: K
): SharedStateDefinition<K> {
  return sharedStateDefinitions[key];
}

export function listSharedStateDefinitions(): SharedStateDefinition[] {
  return Object.values(sharedStateDefinitions) as SharedStateDefinition[];
}

export function getDefaultSharedStateSnapshot(): SharedStateSnapshot {
  return {
    locale: sharedStateDefinitions.locale.defaultValue,
    theme: sharedStateDefinitions.theme.defaultValue,
    currencyRates: sharedStateDefinitions.currencyRates.defaultValue,
    assetVisibility: sharedStateDefinitions.assetVisibility.defaultValue,
  };
}

export function getSharedState<K extends SharedStateKey>(
  key: K
): SharedStateShape[K] | undefined {
  const definition = sharedStateDefinitions[key];
  const rawValue = readRawValue(definition);
  return rawValue === undefined ? undefined : definition.deserialize(rawValue);
}

export function setSharedState<K extends SharedStateKey>(
  key: K,
  value: SharedStateShape[K]
): void {
  const definition = sharedStateDefinitions[key];
  writeRawValue(definition, value);
  notifySharedStateListeners(key, value);
  publishSync(key, value);
}

export function getSharedStateSnapshotFromCookieHeader(
  cookieHeader: string
): Partial<SharedStateSnapshot> {
  const snapshot: Partial<SharedStateSnapshot> = {};

  (Object.keys(sharedStateDefinitions) as SharedStateKey[]).forEach((key) => {
    const definition = sharedStateDefinitions[key];
    if (!definition.ssrReadable || definition.storageType !== 'cookie' || !definition.cookieName) {
      return;
    }

    const rawValue = parseCookieValue(cookieHeader, definition.cookieName);
    if (rawValue !== undefined) {
      (snapshot as Record<string, unknown>)[key] = definition.deserialize(rawValue);
    }
  });

  return snapshot;
}

export function parseCookieFromHeader<K extends SharedStateKey>(
  cookieHeader: string,
  key: K
): SharedStateShape[K] | undefined {
  return getSharedStateSnapshotFromCookieHeader(cookieHeader)[key];
}

export type SharedStateChangeHandler = <K extends SharedStateKey>(
  key: K,
  value: SharedStateShape[K]
) => void;

export function onSharedStateChange(handler: SharedStateChangeHandler): () => void {
  ensureSyncBridge();
  sharedStateListeners.add(handler);
  return () => {
    sharedStateListeners.delete(handler);
  };
}

export function destroySharedStateRuntime(): void {
  sharedStateListeners.clear();
  memoryState.clear();

  if (storageEventListener && isBrowser()) {
    window.removeEventListener('storage', storageEventListener);
  }

  storageEventListener = null;
  syncChannel?.close();
  syncChannel = null;
  syncMode = null;
}

export function hydrateSharedStateSnapshot(): Partial<SharedStateSnapshot> {
  const snapshot: Partial<SharedStateSnapshot> = {};

  (Object.keys(sharedStateDefinitions) as SharedStateKey[]).forEach((key) => {
    const currentValue = getSharedState(key);
    if (currentValue !== undefined) {
      (snapshot as Record<string, unknown>)[key] = currentValue;
    }
  });

  return snapshot;
}
