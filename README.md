# yiFrame

基于 Next.js Pages Router 的路由聚合型微前端示例。

这套实现保留了：

- 主应用统一入口
- 子应用独立 Next.js app
- SSR 支持
- 跨应用共享基础能力

这套实现不做：

- iframe
- qiankun / wujie / single-spa
- 运行时 JS 沙箱
- Module Federation 主导的页面拼装

---

## 当前状态

第三轮收口后，框架的关键特征是：

1. app 注册只有一份源数据：`packages/micro-core/src/apps.config.json`
2. 主应用代理只有一个入口：`apps/main/server.js`
3. 页面、`_next/static`、`_next/data`、`public` 资源都遵守同一条路径契约
4. `MicroLink` / `useMicroRouter` 支持 `mode: 'auto' | 'spa' | 'reload'`
5. 共享状态改为配置表驱动，并补了配置校验
6. event-bus 去掉 DOM `CustomEvent`，补了最小自动化测试
7. smoke-check 现在覆盖 HTML、chunk、data、public、fallback

---

## 路径契约

对外统一暴露路径：

- main 页面：`/`
- activity 页面：`/activity/**`
- account 页面：`/account/**`

统一代理路径：

- 页面 HTML：`/{basePath}/...`
- chunk：`/{basePath}/_next/static/...`
- data：`/{basePath}/_next/data/{buildId}/...`
- public：`/{basePath}/...`

兼容旧路径：

- `/_apps/{app}/...`
- `/_next/data/{buildId}/{app}/...`

这两类旧路径会在主应用代理层先被规范化，再进入统一分发逻辑。

---

## 目录

```text
apps/
  main/
    server.js
    server/
      app-resolution.js
      fallback-response.js
      logging.js
      path-normalization.js
      proxy-request.js
      request-context.js
    public/
      platform-owner.txt
    src/pages/
      _app.tsx
      _document.tsx
      404.tsx
      index.tsx
  activity/
    public/
      platform-owner.txt
    src/pages/
      _app.tsx
      _document.tsx
      index.tsx
      list.tsx
  account/
    src/pages/
      _app.tsx
      _document.tsx
      index.tsx
      profile.tsx
      settings.tsx

packages/
  micro-core/src/
    apps.config.json
    app-registry.ts
    navigation.ts
    link.tsx
    router.ts
    shared-state.ts
    event-bus.ts
    constants.ts
  shared-state/src/
    provider.tsx
    hooks.ts
    ssr.ts
  shared-ui/src/
    Header.tsx
    Footer.tsx
    Button.tsx

scripts/
  smoke-check.mjs
  tests/
    event-bus.test.ts
    shared-state.test.ts
```

---

## 本地启动

安装依赖：

```bash
npm install
```

启动全部服务：

```bash
npm run dev:activity
npm run dev:account
npm run dev:main
```

或并行启动：

```bash
npm run dev:all
```

默认端口：

- main: `3000`
- activity: `3001`
- account: `3002`

---

## 本地验证

### 1. 基础冒烟

```bash
npm run smoke:local
```

当前默认会验证：

- main HTML
- main public 资源
- activity HTML
- activity chunk
- activity data
- activity public 资源（经主应用）
- account HTML
- account chunk
- account data
- activity public 资源（子应用直连）

### 2. fallback

先停掉 `account`，再执行：

```bash
SKIP_ACCOUNT_CHECKS=true CHECK_FALLBACK_PATH=/account/profile npm run smoke:local
```

预期：

- `/account/profile` 返回 `502`
- 页面包含 `Micro App Unavailable`

### 3. 核心自动化测试

```bash
npm run test:event-bus
npm run test:shared-state
```

或一起执行：

```bash
npm run test:core
```

---

## 单点注册

唯一 registry：

[packages/micro-core/src/apps.config.json](/Users/xiaofei/Downloads/work/Study/Miro/packages/micro-core/src/apps.config.json)

当前字段：

- `name`
- `displayName`
- `basePath`
- `enabled`
- `navigation`
- `targetEnvVar`
- `defaultTarget`

由这份配置自动生成：

- 主应用 runtime app map
- client-side matcher
- Header 导航项
- 路由归属与路径契约

---

## 代理结构

主入口：

[apps/main/server.js](/Users/xiaofei/Downloads/work/Study/Miro/apps/main/server.js)

模块拆分：

- [request-context.js](/Users/xiaofei/Downloads/work/Study/Miro/apps/main/server/request-context.js)
  - 生成 `traceId`
  - 注入请求上下文
- [app-resolution.js](/Users/xiaofei/Downloads/work/Study/Miro/apps/main/server/app-resolution.js)
  - 构建 runtime registry
  - 根据路径识别目标 app
- [path-normalization.js](/Users/xiaofei/Downloads/work/Study/Miro/apps/main/server/path-normalization.js)
  - 规范化旧路径
  - 提取 pathname
- [proxy-request.js](/Users/xiaofei/Downloads/work/Study/Miro/apps/main/server/proxy-request.js)
  - 执行代理
  - 注入 `x-miro-trace-id`
  - 注入 `x-miro-source-app: main`
- [fallback-response.js](/Users/xiaofei/Downloads/work/Study/Miro/apps/main/server/fallback-response.js)
  - 统一 502 输出
- [logging.js](/Users/xiaofei/Downloads/work/Study/Miro/apps/main/server/logging.js)
  - 统一日志开关

### 请求头

所有代理到子应用的请求都会注入：

- `x-miro-trace-id`
- `x-miro-source-app: main`

日志开关：

- `PROXY_ENABLE_LOGGING=true|false`

超时：

- `PROXY_TIMEOUT`

---

## 导航

核心文件：

- [navigation.ts](/Users/xiaofei/Downloads/work/Study/Miro/packages/micro-core/src/navigation.ts)
- [link.tsx](/Users/xiaofei/Downloads/work/Study/Miro/packages/micro-core/src/link.tsx)
- [router.ts](/Users/xiaofei/Downloads/work/Study/Miro/packages/micro-core/src/router.ts)

支持：

- `mode="auto" | "spa" | "reload"`
- query / hash / locale 解析
- `_blank`
- meta / ctrl / shift / 中键点击
- main app `/` 归属识别

默认策略：

- 同 app：SPA
- 跨 app：full reload

---

## 共享状态

核心文件：

- [packages/micro-core/src/shared-state.ts](/Users/xiaofei/Downloads/work/Study/Miro/packages/micro-core/src/shared-state.ts)
- [packages/shared-state/src/provider.tsx](/Users/xiaofei/Downloads/work/Study/Miro/packages/shared-state/src/provider.tsx)
- [packages/shared-state/src/ssr.ts](/Users/xiaofei/Downloads/work/Study/Miro/packages/shared-state/src/ssr.ts)

当前示例 key：

- `locale`
- `theme`
- `currencyRates`
- `assetVisibility`

每个 key 都声明：

- `storageType`
- `sourceOfTruth`
- `ssrReadable`
- `crossTabSync`
- `defaultValue`
- `serialize`
- `deserialize`

### SSR 注入策略

这轮已经移除 `_app.tsx` 里的 `App.getInitialProps`。

原因：

- 会让 Pages Router 退出 Automatic Static Optimization
- 静态页会被强制变成按请求渲染

现在的做法：

- 纯静态页：不做统一 SSR 注入，服务端输出默认值，客户端再从 cookie / localStorage hydrate
- 需要 SSR 快照的页面：通过 `withSharedStateServerSideProps(...)` 显式接入

示例：

```ts
import type { GetServerSideProps } from 'next';
import { withSharedStateServerSideProps } from '@miro/shared-state';

export const getServerSideProps: GetServerSideProps = withSharedStateServerSideProps(
  async () => {
    return {
      props: {
        serverTime: new Date().toISOString(),
      },
    };
  }
);
```

这个方案的含义是：

- 保住静态页的 ASO
- 已经 SSR 的页面继续拿到共享状态快照
- 代价是：静态页如果展示了共享状态值，首屏会先看到默认值，再在 hydration 后更新

---

## 事件总线

核心文件：

- [packages/micro-core/src/event-bus.ts](/Users/xiaofei/Downloads/work/Study/Miro/packages/micro-core/src/event-bus.ts)
- [packages/shared-state/src/hooks.ts](/Users/xiaofei/Downloads/work/Study/Miro/packages/shared-state/src/hooks.ts)

策略：

- same-tab：内存 listener
- cross-tab：`BroadcastChannel`
- fallback：`storage` event

当前测试已覆盖：

- same-tab 只触发一次
- cross-tab 只触发一次
- unsubscribe 后不再触发
- destroy 后清 listener 和 bridge
- 无 `BroadcastChannel` 时 fallback 生效

---

## public 资源

当前样例：

- main: [apps/main/public/platform-owner.txt](/Users/xiaofei/Downloads/work/Study/Miro/apps/main/public/platform-owner.txt)
- activity: [apps/activity/public/platform-owner.txt](/Users/xiaofei/Downloads/work/Study/Miro/apps/activity/public/platform-owner.txt)

访问路径：

- main 资源：`http://localhost:3000/platform-owner.txt`
- activity 经主应用：`http://localhost:3000/activity/platform-owner.txt`
- activity 直连：`http://localhost:3001/activity/platform-owner.txt`

这也说明了当前契约下不会和 main 的同名 public 资源冲突：

- main 资源在根路径
- 子应用资源在各自 `basePath` 下

---

## 新增一个 app

以 `trade` 为例：

1. 在 `apps.config.json` 增加 `trade`
2. 新建 `apps/trade`
3. 设置 `basePath: '/trade'`
4. 在主应用环境变量里配置 `MICRO_APP_TRADE_URL`

如果某个 `trade` 页面需要 SSR 共享状态快照，再按需使用：

```ts
withSharedStateServerSideProps(...)
```

不需要改：

- server 路由表
- Header 导航
- client matcher
- rewrites

---

## 环境变量

常用变量：

- `PORT`
- `MICRO_APP_ACTIVITY_URL`
- `MICRO_APP_ACCOUNT_URL`
- `PROXY_TIMEOUT`
- `PROXY_ENABLE_LOGGING`
- `NEXT_PUBLIC_APP_NAME`

---

## 已验证链路

这份 README 只记录已经跑过的内容：

- HTML 代理
- chunk 代理
- data 代理
- public 资源代理
- fallback 502
- event-bus 自动化测试
- shared-state 自动化测试
- `App.getInitialProps` 移除后的 ASO 恢复
