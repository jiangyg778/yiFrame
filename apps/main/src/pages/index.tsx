import { Header, Footer, Button } from '@miro/shared-ui';
import { MicroLink } from '@miro/micro-core';
import { useTheme, useLocale } from '@miro/shared-state';

export default function HomePage() {
  const [theme, setTheme] = useTheme();
  const [locale, setLocale] = useLocale();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main style={{ flex: 1, padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
          Miro Micro-Frontend Platform
        </h1>
        <p style={{ color: '#64748b', marginBottom: '32px' }}>
          路由聚合型微前端基础框架 — 主应用首页
        </p>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
            跨应用跳转示例
          </h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <MicroLink href="/activity">
              <Button variant="primary">进入 Activity 子应用</Button>
            </MicroLink>
            <MicroLink href="/account/profile" mode="reload">
              <Button variant="secondary">进入 Account 子应用</Button>
            </MicroLink>
          </div>
          <p style={{ marginTop: '8px', fontSize: '13px', color: '#94a3b8' }}>
            点击上方按钮将触发整页跳转（full reload），因为目标路径属于不同子应用
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
            共享状态示例
          </h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '14px', color: '#64748b' }}>当前主题: </span>
              <strong>{theme}</strong>
              <Button
                variant="ghost"
                size="sm"
                style={{ marginLeft: '8px' }}
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              >
                切换主题
              </Button>
            </div>
            <div>
              <span style={{ fontSize: '14px', color: '#64748b' }}>当前语言: </span>
              <strong>{locale}</strong>
              <Button
                variant="ghost"
                size="sm"
                style={{ marginLeft: '8px' }}
                onClick={() => setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')}
              >
                切换语言
              </Button>
            </div>
          </div>
          <p style={{ marginTop: '8px', fontSize: '13px', color: '#94a3b8' }}>
            修改后跳转到子应用，子应用也能读取到最新的主题和语言设置
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
            架构说明
          </h2>
          <ul style={{ lineHeight: '2', color: '#475569', fontSize: '14px' }}>
            <li>主应用（当前页面）运行在端口 3000</li>
            <li>Activity 子应用独立运行在端口 3001</li>
            <li>Account 子应用独立运行在端口 3002</li>
            <li>主应用通过统一 Node 代理转发页面、chunk、data 请求</li>
            <li>每个子应用都是完整的 Next.js 应用，可独立开发运行</li>
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
}
