import { JSDOM } from 'jsdom';

type Listener = (event: MessageEvent) => void;

export class FakeBroadcastChannel {
  static channels = new Map<string, Set<FakeBroadcastChannel>>();
  static lastInstance: FakeBroadcastChannel | null = null;

  readonly name: string;
  closed = false;
  private listeners = new Set<Listener>();

  constructor(name: string) {
    this.name = name;
    FakeBroadcastChannel.lastInstance = this;

    if (!FakeBroadcastChannel.channels.has(name)) {
      FakeBroadcastChannel.channels.set(name, new Set());
    }

    FakeBroadcastChannel.channels.get(name)!.add(this);
  }

  addEventListener(type: string, listener: Listener) {
    if (type === 'message') {
      this.listeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: Listener) {
    if (type === 'message') {
      this.listeners.delete(listener);
    }
  }

  postMessage(_message: unknown) {}

  close() {
    this.closed = true;
    FakeBroadcastChannel.channels.get(this.name)?.delete(this);
    this.listeners.clear();
  }

  static dispatch(name: string, message: unknown) {
    const event = { data: message } as MessageEvent;
    FakeBroadcastChannel.channels.get(name)?.forEach((channel) => {
      channel.listeners.forEach((listener) => listener(event));
    });
  }

  static reset() {
    FakeBroadcastChannel.channels.clear();
    FakeBroadcastChannel.lastInstance = null;
  }
}

export function installDomEnvironment(url = 'http://localhost:3000/') {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url,
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: dom.window,
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    writable: true,
    value: dom.window.document,
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: dom.window.navigator,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: dom.window.localStorage,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    writable: true,
    value: dom.window.sessionStorage,
  });
  Object.defineProperty(globalThis, 'StorageEvent', {
    configurable: true,
    writable: true,
    value: dom.window.StorageEvent,
  });
  Object.defineProperty(globalThis, 'BroadcastChannel', {
    configurable: true,
    writable: true,
    value: FakeBroadcastChannel,
  });

  return () => {
    dom.window.close();
    FakeBroadcastChannel.reset();

    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).document;
    delete (globalThis as Record<string, unknown>).navigator;
    delete (globalThis as Record<string, unknown>).localStorage;
    delete (globalThis as Record<string, unknown>).sessionStorage;
    delete (globalThis as Record<string, unknown>).StorageEvent;
    delete (globalThis as Record<string, unknown>).BroadcastChannel;
  };
}
