import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import * as EventBus from '../../packages/micro-core/src/event-bus';
import { EVENT_BUS_CHANNEL_NAME, EVENT_BUS_SYNC_STORAGE_KEY } from '../../packages/micro-core/src/constants';
import { FakeBroadcastChannel, installDomEnvironment } from './helpers/browser-env';

let cleanupDom: (() => void) | undefined;

beforeEach(() => {
  cleanupDom = installDomEnvironment();
});

afterEach(() => {
  EventBus.destroy();
  cleanupDom?.();
  cleanupDom = undefined;
});

test('same-tab emit only triggers listeners once', () => {
  let count = 0;
  EventBus.on('demo:event', () => {
    count += 1;
  });

  EventBus.emit('demo:event', { ok: true });

  assert.equal(count, 1);
});

test('cross-tab broadcast only triggers listeners once', () => {
  let count = 0;
  EventBus.on('demo:event', () => {
    count += 1;
  });

  FakeBroadcastChannel.dispatch(EVENT_BUS_CHANNEL_NAME, {
    type: 'EVENT_BUS_SYNC',
    eventName: 'demo:event',
    payload: { ok: true },
    sourceId: 'other-tab',
    messageId: '1',
  });

  assert.equal(count, 1);
});

test('unsubscribe stops future events', () => {
  let count = 0;
  const unsubscribe = EventBus.on('demo:event', () => {
    count += 1;
  });

  unsubscribe();
  EventBus.emit('demo:event', { ok: true });

  assert.equal(count, 0);
});

test('destroy clears listeners and closes bridge resources', () => {
  let count = 0;
  EventBus.on('demo:event', () => {
    count += 1;
  });

  EventBus.destroy();

  FakeBroadcastChannel.dispatch(EVENT_BUS_CHANNEL_NAME, {
    type: 'EVENT_BUS_SYNC',
    eventName: 'demo:event',
    payload: { ok: true },
    sourceId: 'other-tab',
    messageId: '2',
  });

  assert.equal(count, 0);
  assert.equal(FakeBroadcastChannel.lastInstance?.closed, true);
});

test('storage-event fallback works when BroadcastChannel is unavailable', () => {
  delete (globalThis as Record<string, unknown>).BroadcastChannel;
  EventBus.destroy();

  let count = 0;
  EventBus.on('demo:event', () => {
    count += 1;
  });

  window.dispatchEvent(
    new StorageEvent('storage', {
      key: EVENT_BUS_SYNC_STORAGE_KEY,
      newValue: JSON.stringify({
        type: 'EVENT_BUS_SYNC',
        eventName: 'demo:event',
        payload: { ok: true },
        sourceId: 'other-tab',
        messageId: '3',
      }),
    })
  );

  assert.equal(count, 1);
});
