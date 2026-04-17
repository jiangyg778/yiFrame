import React from 'react';
import { MicroLink, createClientRegistry, getNavigationItems } from '@miro/micro-core';
import { useTheme } from '@miro/shared-state';
import { AuthMenu } from './AuthMenu';
import { LocaleSwitcher } from './LocaleSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { getThemeTokens, type ThemeName } from './theme-tokens';

export interface HeaderProps {
  currentApp?: string;
}

const navigationItems = getNavigationItems(createClientRegistry());

export function Header({ currentApp }: HeaderProps) {
  const [theme] = useTheme();
  const effective: ThemeName = theme === 'dark' ? 'dark' : 'light';
  const tokens = getThemeTokens(effective);

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '56px',
        borderBottom: `1px solid ${tokens.headerBorder}`,
        backgroundColor: tokens.headerBg,
        color: tokens.headerFg,
        transition: 'background-color 0.15s, color 0.15s, border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <MicroLink
          href="/"
          style={{
            fontWeight: 700,
            fontSize: '18px',
            color: tokens.headerFg,
            textDecoration: 'none',
          }}
        >
          Miro Platform
        </MicroLink>
        <nav style={{ display: 'flex', gap: '16px' }}>
          {navigationItems.map((item) => (
            <MicroLink
              key={item.name}
              href={item.href}
              style={{
                color:
                  currentApp === item.name ? tokens.headerActive : tokens.headerMuted,
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: currentApp === item.name ? 600 : 400,
              }}
            >
              {item.displayName}
            </MicroLink>
          ))}
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '13px', color: tokens.headerMuted }}>
          {currentApp ? `Current: ${currentApp}` : 'Main'}
        </span>
        <LocaleSwitcher theme={effective} />
        <ThemeSwitcher theme={effective} />
        <AuthMenu />
      </div>
    </header>
  );
}
