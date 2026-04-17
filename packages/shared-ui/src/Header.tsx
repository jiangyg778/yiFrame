import React from 'react';
import { MicroLink, createClientRegistry, getNavigationItems } from '@miro/micro-core';
import { AuthMenu } from './AuthMenu';

export interface HeaderProps {
  currentApp?: string;
}

const navigationItems = getNavigationItems(createClientRegistry());

export function Header({ currentApp }: HeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '56px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <MicroLink
          href="/"
          style={{
            fontWeight: 700,
            fontSize: '18px',
            color: '#1e293b',
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
                color: currentApp === item.name ? '#2563eb' : '#64748b',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>
          {currentApp ? `Current: ${currentApp}` : 'Main'}
        </span>
        <AuthMenu />
      </div>
    </header>
  );
}
