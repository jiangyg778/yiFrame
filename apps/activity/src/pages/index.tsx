import type { GetServerSideProps } from 'next';
import { Header, Footer, Button } from '@miro/shared-ui';
import { MicroLink } from '@miro/micro-core';
import { useTheme, useLocale, withSharedStateServerSideProps } from '@miro/shared-state';

interface ActivityHomeProps {
  serverTime: string;
}

export const getServerSideProps: GetServerSideProps<ActivityHomeProps> = withSharedStateServerSideProps(
  async (ctx) => {
    return {
      props: {
        serverTime: new Date().toISOString(),
      },
    };
  }
);

export default function ActivityHome({ serverTime }: ActivityHomeProps) {
  const [theme] = useTheme();
  const [locale] = useLocale();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header currentApp="activity" />

      <main style={{ flex: 1, padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
          Activity 子应用
        </h1>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          这是一个独立的 Next.js 子应用，通过路由聚合接入主应用。
        </p>

        <section style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
            SSR 验证
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            服务端渲染时间: <code style={{ color: '#2563eb' }}>{serverTime}</code>
          </p>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            此数据在服务端生成，证明 SSR 工作正常
          </p>
        </section>

        <section style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
            共享状态读取
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            主题: <strong>{theme}</strong> | 语言: <strong>{locale}</strong>
          </p>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            这些值来自统一共享状态配置表；locale/theme 以 Cookie 为准，其他值按各自存储策略初始化
          </p>
        </section>

        <section style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '12px' }}>
            导航示例
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <MicroLink href="/activity/list">
              <Button variant="primary" size="sm">活动列表（SPA 跳转）</Button>
            </MicroLink>
            <MicroLink href="/account/profile" mode="reload">
              <Button variant="secondary" size="sm">账户资料（跨应用跳转）</Button>
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
