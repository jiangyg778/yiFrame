'use client';

import { useEffect, useRef, useCallback } from 'react';
import { EventBus, type EventPayload, type EventHandler } from '@miro/micro-core';

/**
 * 订阅运行时事件的 React hook。
 * 自动在组件卸载时取消订阅。
 */
export function useEventBus<T extends EventPayload = EventPayload>(
  eventName: string,
  handler: EventHandler<T>
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsubscribe = EventBus.on<T>(eventName, (payload) => {
      handlerRef.current(payload);
    });
    return unsubscribe;
  }, [eventName]);
}

/**
 * 返回一个发射事件的函数。
 */
export function useEmitEvent() {
  return useCallback(
    <T extends EventPayload = EventPayload>(eventName: string, payload: T) => {
      EventBus.emit(eventName, payload);
    },
    []
  );
}
