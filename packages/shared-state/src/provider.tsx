'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import {
  getDefaultSharedStateSnapshot,
  getSharedState,
  hydrateSharedStateSnapshot,
  onSharedStateChange,
  setSharedState,
  type SharedStateKey,
  type SharedStateShape,
  type SharedStateSnapshot,
} from '@miro/micro-core';

interface SharedStateContextValue {
  state: SharedStateSnapshot;
  setState: <K extends SharedStateKey>(key: K, value: SharedStateShape[K]) => void;
}

const defaultSnapshot = getDefaultSharedStateSnapshot();

const SharedStateContext = createContext<SharedStateContextValue>({
  state: defaultSnapshot,
  setState: () => {},
});

type Action =
  | { type: 'MERGE'; snapshot: Partial<SharedStateSnapshot> }
  | { type: 'SET'; key: SharedStateKey; value: SharedStateShape[SharedStateKey] };

function reducer(state: SharedStateSnapshot, action: Action): SharedStateSnapshot {
  if (action.type === 'MERGE') {
    return { ...state, ...action.snapshot };
  }

  if (action.type === 'SET') {
    return { ...state, [action.key]: action.value };
  }

  return state;
}

export interface SharedStateProviderProps {
  initialSnapshot?: Partial<SharedStateSnapshot>;
  children: React.ReactNode;
}

export function SharedStateProvider({
  initialSnapshot,
  children,
}: SharedStateProviderProps) {
  const [state, dispatch] = useReducer(reducer, {
    ...defaultSnapshot,
    ...initialSnapshot,
  });

  useEffect(() => {
    dispatch({ type: 'MERGE', snapshot: hydrateSharedStateSnapshot() });
  }, []);

  useEffect(() => {
    const unsubscribe = onSharedStateChange((key, value) => {
      dispatch({ type: 'SET', key, value });
    });
    return unsubscribe;
  }, []);

  const setStateValue = useCallback(
    <K extends SharedStateKey>(key: K, value: SharedStateShape[K]) => {
      setSharedState(key, value);
    },
    []
  );

  const contextValue = useMemo(
    () => ({
      state,
      setState: setStateValue,
    }),
    [state, setStateValue]
  );

  return <SharedStateContext.Provider value={contextValue}>{children}</SharedStateContext.Provider>;
}

export function useSharedState(): SharedStateContextValue {
  return useContext(SharedStateContext);
}

export function useSharedValue<K extends SharedStateKey>(
  key: K
): [SharedStateShape[K], (value: SharedStateShape[K]) => void] {
  const { state, setState } = useSharedState();
  return [state[key], (value: SharedStateShape[K]) => setState(key, value)];
}

export function useLocale(): [string, (value: string) => void] {
  return useSharedValue('locale');
}

export function useTheme(): [SharedStateShape['theme'], (value: SharedStateShape['theme']) => void] {
  return useSharedValue('theme');
}

export function useCurrencyRates(): [
  SharedStateShape['currencyRates'],
  (value: SharedStateShape['currencyRates']) => void
] {
  return useSharedValue('currencyRates');
}

export function useAssetVisibility(): [
  SharedStateShape['assetVisibility'],
  (value: SharedStateShape['assetVisibility']) => void
] {
  return useSharedValue('assetVisibility');
}

export function useReadSharedValue<K extends SharedStateKey>(key: K): SharedStateShape[K] | undefined {
  return getSharedState(key);
}
