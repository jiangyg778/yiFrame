import React, { useState } from 'react';
import {
  AppRequestError,
  getBrowserRequestClient,
  isAppRequestError,
} from '@miro/request-core';

export interface AuthDemoProps {
  appName: string;
}

const btn: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 13,
  border: '1px solid #0369a1',
  borderRadius: 4,
  background: '#fff',
  color: '#0369a1',
  cursor: 'pointer',
};

/**
 * Minimal reusable block that proves request-core carries the session
 * cookie cross-app. Drop into any sub-app's index page.
 */
export function AuthDemo({ appName }: AuthDemoProps) {
  const [result, setResult] = useState<string>(
    'Click a button. Requests go through the main origin → session cookie is attached automatically.'
  );

  async function call(path: string) {
    setResult('loading...');
    const client = getBrowserRequestClient({ appName, baseUrl: '' });
    try {
      const data = await client.get<unknown>(path, { silent401: true });
      setResult(`✅ ${path}\n\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      if (isAppRequestError(error)) {
        const { type, status, message } = error as AppRequestError;
        setResult(`❌ ${path}\n\ntype=${type} status=${status ?? '-'}\nmessage=${message}`);
      } else {
        setResult(`❌ ${path}\n\n${String(error)}`);
      }
    }
  }

  return (
    <section
      style={{
        marginBottom: 24,
        padding: 16,
        background: '#f0f9ff',
        borderRadius: 8,
        border: '1px dashed #38bdf8',
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#0369a1' }}>
        Auth Demo ({appName})
      </h3>
      <p style={{ fontSize: 12, color: '#0c4a6e', marginBottom: 10 }}>
        通过 request-core 调用主应用的受保护 API，验证子应用能拿到主应用的登录态。
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button type="button" onClick={() => call('/api/auth/me')} style={btn}>
          GET /api/auth/me
        </button>
        <button type="button" onClick={() => call('/api/demo/protected')} style={btn}>
          GET /api/demo/protected
        </button>
      </div>
      <pre
        style={{
          fontSize: 12,
          background: '#fff',
          padding: 8,
          borderRadius: 4,
          margin: 0,
          whiteSpace: 'pre-wrap',
          color: '#0f172a',
          maxHeight: 200,
          overflow: 'auto',
        }}
      >
        {result}
      </pre>
    </section>
  );
}
