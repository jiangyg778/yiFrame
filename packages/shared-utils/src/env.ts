/**
 * 环境变量工具。
 *
 * 统一环境变量的读取方式，支持必选/可选/带默认值三种模式。
 */

export function getEnv(key: string): string | undefined {
  return process.env[key];
}

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[Miro] Missing required environment variable: ${key}. ` +
      `Please check your .env.local file.`
    );
  }
  return value;
}

export function getEnvWithDefault(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export type Environment = 'development' | 'staging' | 'production';

export function getCurrentEnv(): Environment {
  const env = process.env.NODE_ENV;
  if (env === 'production') return 'production';
  if (env === 'test') return 'staging';
  return 'development';
}
