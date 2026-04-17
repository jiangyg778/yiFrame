import React, { useEffect, useState } from 'react';
import { EventBus } from '@miro/micro-core';
import { EVENT_AUTH_UNAUTHORIZED } from '@miro/request-core';
import {
  EVENT_AUTH_LOGIN,
  EVENT_AUTH_LOGOUT,
  fetchMe,
  login,
  logout,
  register,
  type PublicUser,
} from './auth-client';
import { useAuthSnapshot } from './auth-snapshot';

type PanelMode = 'idle' | 'login' | 'register';

const btn: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 13,
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  background: '#fff',
  cursor: 'pointer',
  color: '#1e293b',
};

const primaryBtn: React.CSSProperties = {
  ...btn,
  background: '#2563eb',
  borderColor: '#2563eb',
  color: '#fff',
};

const input: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '6px 8px',
  marginBottom: 8,
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  fontSize: 13,
  boxSizing: 'border-box',
};

export function AuthMenu() {
  // Seed state from the SSR-injected snapshot so the very first render is
  // already in the correct logged-in/out shape. The useEffect below still
  // runs `fetchMe()` to correct any stale snapshot (e.g. session expired in
  // another tab, or a page that didn't opt into SSR injection).
  const snapshot = useAuthSnapshot();
  const [user, setUser] = useState<PublicUser | null>(snapshot);
  const [panel, setPanel] = useState<PanelMode>('idle');
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('123456');
  const [name, setName] = useState('Demo User');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchMe()
      .then((u) => {
        if (alive) setUser(u);
      })
      .catch(() => {
        /* ignore */
      });

    const offLogin = EventBus.on(EVENT_AUTH_LOGIN, (payload) => {
      const next = (payload as { user?: PublicUser })?.user;
      if (next) setUser(next);
    });
    const offLogout = EventBus.on(EVENT_AUTH_LOGOUT, () => setUser(null));
    // Any non-silent 401/403 from request-core means the server no longer
    // recognizes this session (e.g. demo in-memory store wiped on restart,
    // session expired in another tab). Clear the Header immediately so it
    // stops being a stale "logged-in" residue.
    const offUnauthorized = EventBus.on(EVENT_AUTH_UNAUTHORIZED, () => {
      setUser(null);
    });

    return () => {
      alive = false;
      offLogin();
      offLogout();
      offUnauthorized();
    };
  }, []);

  async function submit(action: 'login' | 'register') {
    setError(null);
    setLoading(true);
    try {
      const next =
        action === 'login'
          ? await login(email, password)
          : await register(email, password, name);
      setUser(next);
      setPanel('idle');
    } catch (err) {
      setError((err as Error)?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function doLogout() {
    try {
      await logout();
    } finally {
      setUser(null);
    }
  }

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, color: '#334155' }}>
          👤 <strong>{user.name}</strong>
          <span style={{ color: '#94a3b8', marginLeft: 6 }}>({user.email})</span>
        </span>
        <button type="button" onClick={doLogout} style={btn}>
          退出
        </button>
      </div>
    );
  }

  if (panel === 'idle') {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => setPanel('login')} style={btn}>
          登录
        </button>
        <button type="button" onClick={() => setPanel('register')} style={primaryBtn}>
          注册
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 0,
          padding: 16,
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          minWidth: 260,
          boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
          zIndex: 50,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>
          {panel === 'login' ? '登录' : '注册（demo 会自动登录）'}
        </div>

        {panel === 'register' && (
          <input
            placeholder="姓名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={input}
          />
        )}
        <input
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={input}
        />
        <input
          placeholder="密码"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
        />

        {error ? (
          <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{error}</div>
        ) : null}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => submit(panel)}
            disabled={loading}
            style={primaryBtn}
          >
            {loading ? '...' : '确认'}
          </button>
          <button type="button" onClick={() => setPanel('idle')} style={btn}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
