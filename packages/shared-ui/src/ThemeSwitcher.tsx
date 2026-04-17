import React from 'react';
import { useTheme } from '@miro/shared-state';
import { getThemeTokens, type ThemeName } from './theme-tokens';

export interface ThemeSwitcherProps {
  theme?: ThemeName;
}

/**
 * Header theme toggle. Single button — clicks flip between `light` and
 * `dark`. Writes the shared-state cookie so the choice survives reloads.
 */
export function ThemeSwitcher({ theme: uiTheme }: ThemeSwitcherProps) {
  const [theme, setTheme] = useTheme();
  const current: ThemeName = theme === 'dark' ? 'dark' : 'light';
  const tokens = getThemeTokens(uiTheme ?? current);

  function toggle() {
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  const isDark = current === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      style={{
        padding: '4px 10px',
        fontSize: 12,
        lineHeight: 1.4,
        border: `1px solid ${tokens.buttonSecondaryBorder}`,
        borderRadius: 6,
        background: tokens.buttonSecondaryBg,
        color: tokens.buttonSecondaryFg,
        cursor: 'pointer',
        transition: 'background-color 0.15s',
      }}
    >
      {isDark ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
}
