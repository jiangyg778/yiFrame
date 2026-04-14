import { Header, Footer, Button } from '@miro/shared-ui';
import { MicroLink } from '@miro/micro-core';

export default function Custom404() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <h1 style={{ fontSize: '64px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>
          404
        </h1>
        <p style={{ fontSize: '18px', color: '#64748b', marginBottom: '24px' }}>
          页面未找到
        </p>
        <MicroLink href="/">
          <Button variant="primary">返回首页</Button>
        </MicroLink>
      </main>
      <Footer />
    </div>
  );
}
