import React from 'react';

export function Footer() {
  return (
    <footer
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 24px',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        color: '#94a3b8',
        fontSize: '13px',
        marginTop: 'auto',
      }}
    >
      Miro Micro-Frontend Platform &copy; {new Date().getFullYear()}
    </footer>
  );
}
