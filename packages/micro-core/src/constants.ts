/** Cookie 中存储语言偏好的 key */
export const COOKIE_LOCALE = 'miro_locale';

/** Cookie 中存储主题偏好的 key */
export const COOKIE_THEME = 'miro_theme';

/** localStorage 中存储汇率数据的 key */
export const LS_CURRENCY_RATES = 'miro_currency_rates';

/** localStorage 中存储资产显隐偏好的 key */
export const LS_ASSET_VISIBILITY = 'miro_asset_visibility';

/** BroadcastChannel 的频道名 */
export const BROADCAST_CHANNEL_NAME = 'miro_shared_state';

/** 持久化共享状态在 storage event fallback 中使用的 key */
export const SHARED_STATE_SYNC_STORAGE_KEY = 'miro_shared_state_sync';

/** 运行时事件总线的频道名 */
export const EVENT_BUS_CHANNEL_NAME = 'miro_event_bus';

/** 运行时事件总线在 storage event fallback 中使用的 key */
export const EVENT_BUS_SYNC_STORAGE_KEY = 'miro_event_bus_sync';

/** 代理请求头中携带的 traceId header 名 */
export const HEADER_TRACE_ID = 'x-miro-trace-id';

/** 代理请求头中携带的来源应用 header 名 */
export const HEADER_SOURCE_APP = 'x-miro-source-app';

/** 默认代理超时时间 (ms) */
export const DEFAULT_PROXY_TIMEOUT = 10_000;
