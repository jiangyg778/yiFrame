import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appName = process.argv[2];
const appsDir = join(projectRoot, 'apps');
const registryPath = join(projectRoot, 'packages', 'micro-core', 'src', 'apps.config.json');
const rootPackageJsonPath = join(projectRoot, 'package.json');

function fail(message) {
  console.error(`[create-app] ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function validateAppName(value) {
  if (!value) {
    fail('请提供 app 名称，例如: npm run create:app trade');
  }

  if (!/^[a-z][a-z0-9-]*$/.test(value)) {
    fail('app 名称必须是小写 kebab-case，例如 trade 或 trade-center');
  }

  if (value === 'main') {
    fail('main 是保留名称，不能作为新的子应用。');
  }
}

function toDisplayName(value) {
  return value
    .split('-')
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(' ');
}

function toEnvVar(value) {
  return `MICRO_APP_${value.replace(/-/g, '_').toUpperCase()}_URL`;
}

function getNextPort(entries) {
  const usedPorts = entries
    .map((entry) => entry.defaultTarget)
    .filter(Boolean)
    .map((target) => {
      try {
        return Number(new URL(target).port || 80);
      } catch {
        return null;
      }
    })
    .filter((port) => Number.isInteger(port));

  return Math.max(3000, ...usedPorts) + 1;
}

function ensureParentDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function writeFile(filePath, content) {
  ensureParentDir(filePath);
  writeFileSync(filePath, content, 'utf8');
}

function createPackageJson(value, port) {
  return {
    name: `@miro/${value}`,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: `next dev -p ${port}`,
      build: 'next build',
      start: `next start -p ${port}`,
      lint: 'next lint',
    },
    dependencies: {
      '@miro/micro-core': '*',
      '@miro/shared-state': '*',
      '@miro/shared-ui': '*',
      '@miro/shared-utils': '*',
      next: '^14.2.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    },
    devDependencies: {
      '@types/node': '^20.0.0',
      '@types/react': '^18.2.0',
      '@types/react-dom': '^18.2.0',
      typescript: '^5.7.0',
    },
  };
}

function createNextConfig(basePath) {
  return `/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  basePath: '${basePath}',
  env: {
    MAIN_APP_ORIGIN: process.env.MAIN_APP_ORIGIN || 'http://localhost:3000',
  },
  transpilePackages: [
    '@miro/micro-core',
    '@miro/shared-ui',
    '@miro/shared-state',
    '@miro/shared-utils',
  ],
};

export default nextConfig;
`;
}

function createAppTsx(value) {
  return `import type { AppProps } from 'next/app';
import { MicroLinkProvider, createClientRegistry, type SharedStateSnapshot } from '@miro/micro-core';
import { SharedStateProvider } from '@miro/shared-state';

const clientRegistry = createClientRegistry();
const currentApp = '${value}';

type SharedAppProps = AppProps<{
  __sharedStateSnapshot?: Partial<SharedStateSnapshot>;
}>;

export default function App({ Component, pageProps }: SharedAppProps) {
  return (
    <SharedStateProvider initialSnapshot={pageProps.__sharedStateSnapshot}>
      <MicroLinkProvider registry={clientRegistry} currentApp={currentApp}>
        <Component {...pageProps} />
      </MicroLinkProvider>
    </SharedStateProvider>
  );
}
`;
}

function createIndexPage(value, displayName, basePath, envVar) {
  return `import { Header, Footer } from '@miro/shared-ui';
import { MicroLink } from '@miro/micro-core';

export default function ${displayName.replace(/\s+/g, '')}Home() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header currentApp="${value}" />

      <main style={{ flex: 1, padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
          ${displayName} 子应用
        </h1>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          这是通过 create:app 生成的最小骨架，已经接入统一导航与共享能力。
        </p>

        <section style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            basePath: <code>${basePath}</code>
          </p>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
            目标环境变量: <code>${envVar}</code>
          </p>
        </section>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <MicroLink href="/">回到主页</MicroLink>
          <MicroLink href="${basePath}" mode="spa">当前应用首页</MicroLink>
        </div>
      </main>

      <Footer />
    </div>
  );
}
`;
}

function createTsConfig() {
  return `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": [
        "./src/*"
      ]
    },
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "noEmit": true,
    "allowJs": true
  },
  "include": [
    "next-env.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx"
  ],
  "exclude": [
    "node_modules"
  ]
}
`;
}

function createNextEnv() {
  return `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// This file is auto-generated by Next.js.
`;
}

validateAppName(appName);

const registry = readJson(registryPath);
const rootPackageJson = readJson(rootPackageJsonPath);
const appDir = join(appsDir, appName);

if (!Array.isArray(registry)) {
  fail('registry 不是合法数组，无法继续生成。');
}

if (registry.some((entry) => entry.name === appName)) {
  fail(`registry 中已经存在 app "${appName}"。`);
}

if (existsSync(appDir)) {
  fail(`目录已存在: ${appDir}`);
}

const displayName = toDisplayName(appName);
const basePath = `/${appName}`;
const envVar = toEnvVar(appName);
const port = getNextPort(registry);
const defaultTarget = `http://localhost:${port}`;

registry.push({
  name: appName,
  displayName,
  basePath,
  enabled: true,
  navigation: true,
  standaloneAccessible: true,
  devFallbackToMainOrigin: true,
  smokeEnabled: true,
  description: `${displayName} 子应用（由 create:app 生成）。`,
  targetEnvVar: envVar,
  defaultTarget,
});

rootPackageJson.scripts = rootPackageJson.scripts || {};
if (rootPackageJson.scripts[`dev:${appName}`]) {
  fail(`根 package.json 已经存在脚本 dev:${appName}`);
}
rootPackageJson.scripts[`dev:${appName}`] = `npm run dev --workspace=apps/${appName}`;

mkdirSync(appDir, { recursive: true });
writeJson(join(appDir, 'package.json'), createPackageJson(appName, port));
writeFile(join(appDir, 'next.config.mjs'), createNextConfig(basePath));
writeFile(join(appDir, 'tsconfig.json'), createTsConfig());
writeFile(join(appDir, 'next-env.d.ts'), createNextEnv());
writeFile(join(appDir, 'src', 'pages', '_app.tsx'), createAppTsx(appName));
writeFile(
  join(appDir, 'src', 'pages', 'index.tsx'),
  createIndexPage(appName, displayName, basePath, envVar)
);
writeFile(join(appDir, 'public', 'platform-owner.txt'), `${appName}-app-public\n`);

writeJson(registryPath, registry);
writeJson(rootPackageJsonPath, rootPackageJson);

console.log(`[create-app] 已创建 apps/${appName}`);
console.log(`[create-app] 已写入 registry: ${basePath}`);
console.log(`[create-app] 已新增脚本: npm run dev:${appName}`);
console.log('');
console.log('下一步:');
console.log(`1. export ${envVar}=${defaultTarget}`);
console.log('2. export MAIN_APP_ORIGIN=http://localhost:3000');
console.log(`3. npm run dev:${appName}`);
console.log('4. npm run dev:main');
console.log('5. npm run registry:validate');
