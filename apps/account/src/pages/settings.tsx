import { Header, Footer, Button } from '@miro/shared-ui';
import { MicroLink } from '@miro/micro-core';
import { useSharedState } from '@miro/shared-state';

export default function SettingsPage() {
  const { state } = useSharedState();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header currentApp="account" />

      <main style={{ flex: 1, padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>设置</h1>
          <MicroLink href="/account">
            <Button variant="ghost" size="sm">返回</Button>
          </MicroLink>
        </div>

        <div style={{
          padding: '24px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            当前共享状态快照
          </h3>
          <pre style={{
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderRadius: '4px',
            fontSize: '13px',
            lineHeight: '1.6',
            overflow: 'auto',
          }}>
            {JSON.stringify(state, null, 2)}
          </pre>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '12px' }}>
            此页面展示所有共享状态的当前值。从其他应用修改后刷新或跳转即可看到变化。
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
