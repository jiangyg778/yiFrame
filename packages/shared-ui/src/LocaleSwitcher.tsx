import React from 'react';
import { useLocale } from '@miro/shared-state';
import {
  SUPPORTED_LOCALES,
  normalizeLocale,
  replaceLocaleInPath,
  type SupportedLocale,
} from '@miro/micro-core';
import { getThemeTokens, type ThemeName } from './theme-tokens';

export interface LocaleSwitcherProps {
  theme?: ThemeName;
}

const LABELS: Record<SupportedLocale, string> = {
  'zh-cn': '中文',
  en: 'EN',
};

/**
 * Header locale switcher.
 *
 * Click → writes the shared-state cookie AND navigates (full reload) to
 * the same path under the new locale segment. The cookie and the URL
 * prefix are kept in lockstep: SSR reads the cookie via
 * `withSharedStateServerSideProps`, and the URL is the shareable surface.
 * Full navigation (rather than `router.push`) is intentional — it forces
 * a fresh SSR pass so every page, including sub-apps we don't control,
 * picks up the new locale consistently.
 */
export function LocaleSwitcher({ theme = 'light' }: LocaleSwitcherProps) {
  const [rawLocale, setLocale] = useLocale();
  const current = normalizeLocale(rawLocale);
  const tokens = getThemeTokens(theme);

  function switchTo(next: SupportedLocale) {
    if (next === current) return;
    setLocale(next);
    if (typeof window !== 'undefined') {
      const path = window.location.pathname || '/';
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      const target = `${replaceLocaleInPath(path, next)}${search}${hash}`;
      window.location.assign(target);
    }
  }

  return (
    <div
      role="group"
      aria-label="Language"
      style={{
        display: 'inline-flex',
        border: `1px solid ${tokens.buttonSecondaryBorder}`,
        borderRadius: 6,
        overflow: 'hidden',
        fontSize: 12,
      }}
    >
      {SUPPORTED_LOCALES.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => switchTo(locale)}
            aria-pressed={active}
            style={{
              padding: '4px 10px',
              border: 'none',
              cursor: active ? 'default' : 'pointer',
              background: active ? tokens.headerActive : tokens.buttonSecondaryBg,
              color: active ? '#fff' : tokens.buttonSecondaryFg,
              fontWeight: active ? 600 : 400,
              transition: 'background-color 0.15s',
            }}
          >
            {LABELS[locale]}
          </button>
        );
      })}
    </div>
  );
}
