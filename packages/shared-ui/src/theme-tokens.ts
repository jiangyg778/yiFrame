/**
 * Minimal theme token table. Keep this small — we only need what the demo
 * actually renders (page bg, text, Header, Button variants, card/demo boxes).
 */

export type ThemeName = 'light' | 'dark';

export interface ThemeTokens {
  pageBg: string;
  pageFg: string;
  headerBg: string;
  headerBorder: string;
  headerFg: string;
  headerMuted: string;
  headerActive: string;
  cardBg: string;
  cardBorder: string;
  cardMutedBg: string;
  codeBg: string;
  codeFg: string;
  buttonPrimaryBg: string;
  buttonPrimaryFg: string;
  buttonSecondaryBg: string;
  buttonSecondaryFg: string;
  buttonSecondaryBorder: string;
  buttonGhostFg: string;
  inputBg: string;
  inputBorder: string;
  inputFg: string;
}

const light: ThemeTokens = {
  pageBg: '#ffffff',
  pageFg: '#0f172a',
  headerBg: '#ffffff',
  headerBorder: '#e2e8f0',
  headerFg: '#1e293b',
  headerMuted: '#64748b',
  headerActive: '#2563eb',
  cardBg: '#ffffff',
  cardBorder: '#e2e8f0',
  cardMutedBg: '#f8fafc',
  codeBg: '#f1f5f9',
  codeFg: '#0f172a',
  buttonPrimaryBg: '#2563eb',
  buttonPrimaryFg: '#ffffff',
  buttonSecondaryBg: '#f1f5f9',
  buttonSecondaryFg: '#1e293b',
  buttonSecondaryBorder: '#cbd5e1',
  buttonGhostFg: '#2563eb',
  inputBg: '#ffffff',
  inputBorder: '#cbd5e1',
  inputFg: '#0f172a',
};

const dark: ThemeTokens = {
  pageBg: '#0b1220',
  pageFg: '#e2e8f0',
  headerBg: '#0f172a',
  headerBorder: '#1e293b',
  headerFg: '#f1f5f9',
  headerMuted: '#94a3b8',
  headerActive: '#60a5fa',
  cardBg: '#111a2e',
  cardBorder: '#1e293b',
  cardMutedBg: '#0f172a',
  codeBg: '#0f172a',
  codeFg: '#e2e8f0',
  buttonPrimaryBg: '#3b82f6',
  buttonPrimaryFg: '#ffffff',
  buttonSecondaryBg: '#1e293b',
  buttonSecondaryFg: '#e2e8f0',
  buttonSecondaryBorder: '#334155',
  buttonGhostFg: '#60a5fa',
  inputBg: '#0f172a',
  inputBorder: '#334155',
  inputFg: '#e2e8f0',
};

export const themeTokens: Record<ThemeName, ThemeTokens> = { light, dark };

export function getThemeTokens(theme: ThemeName | string | undefined): ThemeTokens {
  return theme === 'dark' ? themeTokens.dark : themeTokens.light;
}
