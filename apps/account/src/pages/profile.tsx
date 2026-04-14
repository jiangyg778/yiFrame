import type { GetServerSideProps } from 'next';
import { Header, Footer, Button } from '@miro/shared-ui';
import { MicroLink } from '@miro/micro-core';
import { useTheme, useLocale, withSharedStateServerSideProps } from '@miro/shared-state';

interface ProfileProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export const getServerSideProps: GetServerSideProps<ProfileProps> = withSharedStateServerSideProps(
  async (ctx) => {
    const user = {
      name: 'Demo User',
      email: 'demo@miro.example',
      role: 'Admin',
    };

    return {
      props: {
        user,
      },
    };
  }
);

export default function ProfilePage({ user }: ProfileProps) {
  const [theme, setTheme] = useTheme();
  const [locale, setLocale] = useLocale();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header currentApp="account" />

      <main style={{ flex: 1, padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>个人资料</h1>
          <MicroLink href="/account">
            <Button variant="ghost" size="sm">返回</Button>
          </MicroLink>
        </div>

        <div style={{
          padding: '24px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                姓名
              </label>
              <div style={{ fontSize: '15px', fontWeight: 500 }}>{user.name}</div>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                邮箱
              </label>
              <div style={{ fontSize: '15px', fontWeight: 500 }}>{user.email}</div>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                角色
              </label>
              <div style={{ fontSize: '15px', fontWeight: 500 }}>{user.role}</div>
            </div>
          </div>
        </div>

        <section style={{
          padding: '24px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            共享状态操作
          </h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
            在此修改主题或语言，跳转到其他子应用后也能生效
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '14px', marginRight: '8px' }}>
                主题: <strong>{theme}</strong>
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              >
                切换
              </Button>
            </div>
            <div>
              <span style={{ fontSize: '14px', marginRight: '8px' }}>
                语言: <strong>{locale}</strong>
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')}
              >
                切换
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
