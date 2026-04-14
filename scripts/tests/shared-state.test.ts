import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  COOKIE_LOCALE,
  COOKIE_THEME,
  LS_ASSET_VISIBILITY,
  LS_CURRENCY_RATES,
  SHARED_STATE_SYNC_STORAGE_KEY,
  destroySharedStateRuntime,
  getDefaultSharedStateSnapshot,
  hydrateSharedStateSnapshot,
  validateSharedStateDefinitions,
} from '../../packages/micro-core/src';
import { SharedStateProvider, useSharedState } from '../../packages/shared-state/src/provider';
import {
  getSharedStateServerSnapshot,
  withSharedStateServerSideProps,
} from '../../packages/shared-state/src/ssr';
import { installDomEnvironment } from './helpers/browser-env';

let cleanupDom: (() => void) | undefined;
let container: HTMLDivElement | undefined;
let root: Root | undefined;

beforeEach(() => {
  cleanupDom = installDomEnvironment();
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  destroySharedStateRuntime();

  if (root) {
    await act(async () => {
      root?.unmount();
    });
  }

  container?.remove();
  root = undefined;
  container = undefined;
  cleanupDom?.();
  cleanupDom = undefined;
  delete (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT;
});

function SharedStateProbe({ onSnapshot }: { onSnapshot: (snapshot: Record<string, unknown>) => void }) {
  const { state } = useSharedState();
  onSnapshot(state);
  return null;
}

function getLatestSnapshot(snapshots: Record<string, unknown>[]) {
  return snapshots[snapshots.length - 1];
}

async function renderProvider(onSnapshot: (snapshot: Record<string, unknown>) => void) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      React.createElement(
        SharedStateProvider,
        null,
        React.createElement(SharedStateProbe, { onSnapshot })
      )
    );
  });

  await act(async () => {
    await Promise.resolve();
  });
}

test('shared-state definitions pass validation', () => {
  assert.doesNotThrow(() => {
    validateSharedStateDefinitions();
  });
});

test('locale and theme SSR snapshot are collected from cookie header', async () => {
  const cookieHeader = `${COOKIE_LOCALE}=en-US; ${COOKIE_THEME}=dark`;
  const wrapped = withSharedStateServerSideProps(async () => ({
    props: {
      page: 'ok',
    },
  }));

  const result = await wrapped({
    req: {
      headers: {
        cookie: cookieHeader,
      },
    },
  } as never);

  assert.deepEqual(getSharedStateServerSnapshot({
    req: {
      headers: {
        cookie: cookieHeader,
      },
    },
  } as never), {
    __sharedStateSnapshot: {
      locale: 'en-US',
      theme: 'dark',
    },
  });

  assert.deepEqual('props' in result ? result.props.__sharedStateSnapshot : undefined, {
    locale: 'en-US',
    theme: 'dark',
  });
});

test('currencyRates and assetVisibility hydrate from client storage', async () => {
  window.localStorage.setItem(LS_CURRENCY_RATES, JSON.stringify({ USD: 7.2 }));
  window.localStorage.setItem(LS_ASSET_VISIBILITY, JSON.stringify(false));

  const snapshots: Record<string, unknown>[] = [];
  await renderProvider((snapshot) => {
    snapshots.push(snapshot);
  });

  const latestSnapshot = getLatestSnapshot(snapshots);
  assert.deepEqual(latestSnapshot?.currencyRates, { USD: 7.2 });
  assert.equal(latestSnapshot?.assetVisibility, false);
});

test('provider falls back to defaults when no SSR or client storage exists', async () => {
  const snapshots: Record<string, unknown>[] = [];
  await renderProvider((snapshot) => {
    snapshots.push(snapshot);
  });

  assert.deepEqual(getLatestSnapshot(snapshots), getDefaultSharedStateSnapshot());
  assert.deepEqual(hydrateSharedStateSnapshot(), {});
});

test('cross-tab storage sync updates provider state', async () => {
  delete (globalThis as Record<string, unknown>).BroadcastChannel;
  destroySharedStateRuntime();

  const snapshots: Record<string, unknown>[] = [];
  await renderProvider((snapshot) => {
    snapshots.push(snapshot);
  });

  await act(async () => {
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: SHARED_STATE_SYNC_STORAGE_KEY,
        newValue: JSON.stringify({
          type: 'SHARED_STATE_SYNC',
          key: 'theme',
          value: 'dark',
          sourceId: 'other-tab',
          messageId: 'shared-1',
        }),
      })
    );
  });

  assert.equal(getLatestSnapshot(snapshots)?.theme, 'dark');
});
