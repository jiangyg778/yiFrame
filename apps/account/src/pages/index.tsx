import { Header, Footer, Button } from '@miro/shared-ui';
import { MicroLink } from '@miro/micro-core';

export default function AccountHome() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header currentApp="account" />

      <main style={{ flex: 1, padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
          Account 子应用
        </h1>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          账户模块首页。这是另一个独立的 Next.js 子应用。
        </p>

        <section style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <MicroLink href="/account/profile">
              <Button variant="primary" size="sm">个人资料（SPA 跳转）</Button>
            </MicroLink>
            <MicroLink href="/account/settings">
              <Button variant="secondary" size="sm">设置（SPA 跳转）</Button>
            </MicroLink>
            <MicroLink href="/activity" mode="reload">
              <Button variant="ghost" size="sm">去 Activity（跨应用跳转）</Button>
            </MicroLink>
            <MicroLink href="/" mode="reload">
              <Button variant="ghost" size="sm">返回主页（跨应用跳转）</Button>
            </MicroLink>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
