import React, { useEffect } from 'react';
import { useTheme } from '@miro/shared-state';
import { getThemeTokens, type ThemeName } from './theme-tokens';

/**
 * Global theme runtime:
 *   1. Writes `<html data-theme="...">` so app-level attribute selectors can
 *      target light/dark variants.
 *   2. Injects a tiny global stylesheet that colours the page background,
 *      default text, scrollbar, and common containers that are not under our
 *      own inline-style control (e.g. <body>).
 *
 * Mount once per app (in `_app.tsx`). Inline-styled components (Header,
 * Button, cards) still read tokens via `useTheme()` directly — the global
 * stylesheet is only responsible for things we can't style inline.
 */
export function ThemeRuntime() {
  const [theme] = useTheme();
  const effective: ThemeName = theme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = effective;
    document.documentElement.style.colorScheme = effective;
  }, [effective]);

  const tokens = getThemeTokens(effective);
  const css = `
    html, body {
      background: ${tokens.pageBg};
      color: ${tokens.pageFg};
      transition: background-color 0.15s ease, color 0.15s ease;
    }
    body { margin: 0; }
    a { color: inherit; }
    code, pre {
      background: ${tokens.codeBg};
      color: ${tokens.codeFg};
    }
  `.trim();

  return <style data-miro-theme={effective} dangerouslySetInnerHTML={{ __html: css }} />;
}
