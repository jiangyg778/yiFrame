import type { GetServerSideProps } from 'next';
import { Header, Footer, AuthDemo, withAuthSnapshotServerSideProps } from '@miro/shared-ui';
import { MicroLink } from '@miro/micro-core';
import { withSharedStateServerSideProps } from '@miro/shared-state';

// Convert futures home to SSR to eliminate the AuthMenu flash after
// cross-app full reloads. Inner static pages stay as-is.
export const getServerSideProps: GetServerSideProps = withSharedStateServerSideProps(
  withAuthSnapshotServerSideProps('futures')
);

export default function FuturesHome() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header currentApp="futures" />

      <main style={{ flex: 1, padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
          Futures 子应用
        </h1>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          这是通过 create:app 生成的最小骨架，已经接入统一导航与共享能力。
        </p>

        <AuthDemo appName="futures" />

        <section style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            basePath: <code>/futures</code>
          </p>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
            目标环境变量: <code>MICRO_APP_FUTURES_URL</code>
          </p>
        </section>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <MicroLink href="/">回到主页</MicroLink>
          <MicroLink href="/futures" mode="spa">当前应用首页</MicroLink>
        </div>
      </main>

      <Footer />
    </div>
  );
}
