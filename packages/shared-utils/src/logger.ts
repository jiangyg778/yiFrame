/**
 * 简易日志工具。
 *
 * 生产环境只输出 warn 和 error。
 * 预留后续接入 Sentry / DataDog 等外部日志服务的扩展点。
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): number {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    return LOG_LEVELS.warn;
  }
  return LOG_LEVELS.debug;
}

function formatPrefix(level: LogLevel, module?: string): string {
  const time = new Date().toISOString();
  const mod = module ? ` [${module}]` : '';
  return `[${time}] [${level.toUpperCase()}]${mod}`;
}

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

/**
 * 创建一个带模块名的 logger。
 *
 * ```ts
 * const log = createLogger('ProxyServer');
 * log.info('Request forwarded', { url, target });
 * ```
 */
export function createLogger(module?: string): Logger {
  const minLevel = getMinLevel();

  function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= minLevel;
  }

  return {
    debug(message: string, ...args: unknown[]) {
      if (shouldLog('debug')) {
        console.debug(formatPrefix('debug', module), message, ...args);
      }
    },
    info(message: string, ...args: unknown[]) {
      if (shouldLog('info')) {
        console.info(formatPrefix('info', module), message, ...args);
      }
    },
    warn(message: string, ...args: unknown[]) {
      if (shouldLog('warn')) {
        console.warn(formatPrefix('warn', module), message, ...args);
      }
    },
    error(message: string, ...args: unknown[]) {
      if (shouldLog('error')) {
        console.error(formatPrefix('error', module), message, ...args);
      }
    },
  };
}
