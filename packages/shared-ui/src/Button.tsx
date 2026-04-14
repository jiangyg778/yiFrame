import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
  },
  secondary: {
    backgroundColor: '#f1f5f9',
    color: '#1e293b',
    border: '1px solid #cbd5e1',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: '#2563eb',
    border: 'none',
  },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: '13px' },
  md: { padding: '8px 16px', fontSize: '14px' },
  lg: { padding: '12px 24px', fontSize: '16px' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  style,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      style={{
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 500,
        transition: 'opacity 0.15s',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
