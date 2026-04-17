import React from 'react';
import { useTheme } from '@miro/shared-state';
import { getThemeTokens, type ThemeName } from './theme-tokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: '13px' },
  md: { padding: '8px 16px', fontSize: '14px' },
  lg: { padding: '12px 24px', fontSize: '16px' },
};

function variantStyles(
  variant: NonNullable<ButtonProps['variant']>,
  theme: ThemeName
): React.CSSProperties {
  const tokens = getThemeTokens(theme);
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: tokens.buttonPrimaryBg,
        color: tokens.buttonPrimaryFg,
        border: 'none',
      };
    case 'secondary':
      return {
        backgroundColor: tokens.buttonSecondaryBg,
        color: tokens.buttonSecondaryFg,
        border: `1px solid ${tokens.buttonSecondaryBorder}`,
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        color: tokens.buttonGhostFg,
        border: 'none',
      };
  }
}

export function Button({
  variant = 'primary',
  size = 'md',
  style,
  children,
  ...props
}: ButtonProps) {
  const [theme] = useTheme();
  const effective: ThemeName = theme === 'dark' ? 'dark' : 'light';
  return (
    <button
      style={{
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 500,
        transition: 'opacity 0.15s, background-color 0.15s, color 0.15s',
        ...variantStyles(variant, effective),
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
