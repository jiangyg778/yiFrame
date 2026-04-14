import {
  EVENT_BUS_CHANNEL_NAME,
  EVENT_BUS_SYNC_STORAGE_KEY,
} from './constants';

export type EventPayload = Record<string, unknown>;
export type EventHandler<T extends EventPayload = EventPayload> = (payload: T) => void;

interface EventEnvelope {
  type: 'EVENT_BUS_SYNC';
  eventName: string;
  payload: EventPayload;
  sourceId: string;
  messageId: string;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

const listeners = new Map<string, Set<EventHandler>>();
const sourceId = `event-bus-${Math.random().toString(36).slice(2, 10)}`;

let eventChannel: BroadcastChannel | null = null;
let bridgeMode: 'broadcast' | 'storage' | 'none' | null = null;
let storageListener: ((event: StorageEvent) => void) | null = null;

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function notifyLocalListeners<T extends EventPayload = EventPayload>(
  eventName: string,
  payload: T
): void {
  const handlers = listeners.get(eventName);
  if (!handlers) return;

  handlers.forEach((handler) => {
    try {
      handler(payload);
    } catch (error) {
      console.error(`[EventBus] Error in handler for "${eventName}":`, error);
    }
  });
}

function handleEnvelope(envelope: EventEnvelope): void {
  if (envelope.sourceId === sourceId) return;
  notifyLocalListeners(envelope.eventName, envelope.payload);
}

function ensureBridge(): void {
  if (!isBrowser() || bridgeMode) return;

  try {
    eventChannel = new BroadcastChannel(EVENT_BUS_CHANNEL_NAME);
    eventChannel.addEventListener('message', (event: MessageEvent<EventEnvelope>) => {
      if (event.data?.type === 'EVENT_BUS_SYNC') {
        handleEnvelope(event.data);
      }
    });
    bridgeMode = 'broadcast';
    return;
  } catch {
    eventChannel = null;
  }

  if (typeof window.addEventListener === 'function') {
    storageListener = (event: StorageEvent) => {
      if (event.key !== EVENT_BUS_SYNC_STORAGE_KEY || !event.newValue) return;
      const envelope = safeJsonParse<EventEnvelope | null>(event.newValue, null);
      if (envelope?.type === 'EVENT_BUS_SYNC') {
        handleEnvelope(envelope);
      }
    };
    window.addEventListener('storage', storageListener);
    bridgeMode = 'storage';
    return;
  }

  bridgeMode = 'none';
}

function publishCrossTab<T extends EventPayload = EventPayload>(
  eventName: string,
  payload: T
): void {
  if (!isBrowser()) return;
  ensureBridge();

  const envelope: EventEnvelope = {
    type: 'EVENT_BUS_SYNC',
    eventName,
    payload,
    sourceId,
    messageId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };

  if (bridgeMode === 'broadcast') {
    eventChannel?.postMessage(envelope);
    return;
  }

  if (bridgeMode === 'storage') {
    window.localStorage.removeItem(EVENT_BUS_SYNC_STORAGE_KEY);
    window.localStorage.setItem(EVENT_BUS_SYNC_STORAGE_KEY, JSON.stringify(envelope));
  }
}

export function emit<T extends EventPayload = EventPayload>(
  eventName: string,
  payload: T
): void {
  notifyLocalListeners(eventName, payload);
  publishCrossTab(eventName, payload);
}

export function on<T extends EventPayload = EventPayload>(
  eventName: string,
  handler: EventHandler<T>
): () => void {
  ensureBridge();

  if (!listeners.has(eventName)) {
    listeners.set(eventName, new Set());
  }

  const handlerSet = listeners.get(eventName)!;
  handlerSet.add(handler as EventHandler);

  return () => {
    handlerSet.delete(handler as EventHandler);
    if (handlerSet.size === 0) {
      listeners.delete(eventName);
    }
  };
}

export function off(eventName: string, handler?: EventHandler): void {
  const handlerSet = listeners.get(eventName);
  if (!handlerSet) return;

  if (!handler) {
    listeners.delete(eventName);
    return;
  }

  handlerSet.delete(handler);
  if (handlerSet.size === 0) {
    listeners.delete(eventName);
  }
}

export function destroy(): void {
  listeners.clear();

  if (storageListener && isBrowser()) {
    window.removeEventListener('storage', storageListener);
  }

  storageListener = null;
  eventChannel?.close();
  eventChannel = null;
  bridgeMode = null;
}
