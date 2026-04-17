# yiFrame

基于 **Next.js Pages Router + SSR** 的路由聚合型微前端基础框架。主应用做统一入口和代理，子应用是各自独立部署的 Next.js app，共享能力以 npm package 的形式复用，不引入 iframe、qiankun、Module Federation 或运行时沙箱。

---

## 目录

- [架构与定位](#架构与定位)
- [快速开始](#快速开始)
- [目录结构](#目录结构)
- [单点 registry](#单点-registry)
- [主应用代理](#主应用代理)
- [开发态跨应用导航兜底](#开发态跨应用导航兜底)
- [状态共享（shared-state）](#状态共享shared-state)
- [统一请求基座（request-core）](#统一请求基座request-core)
- [最小登录闭环 demo](#最小登录闭环-demo)
- [新增子应用](#新增子应用)
- [合约子应用](#合约子应用)
- [本地验证](#本地验证)
- [当前限制](#当前限制)

---

## 架构与定位

**做**：

- 主应用统一入口，代理聚合子应用的 HTML / chunk / data / public / HMR
- 基于 `apps.config.json` 的单点 registry，驱动路由、导航、smoke、脚手架
- 一套 `MicroLink` / `useMicroRouter` / `shared-state` / `event-bus` 的小型共享运行时

**不做**：

- iframe / qiankun / wujie / single-spa
- 运行时沙箱容器
- Module Federation 主导的页面拼装

---

## 快速开始

```bash
npm install
npm run dev:all              # 全部并行启动
# 或按需：
npm run dev:main             # 3000
npm run dev:activity         # 3001
npm run dev:account          # 3002
npm run dev:futures          # 3003
```

访问入口：`http://localhost:3000`

可选环境变量：

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `MAIN_APP_ORIGIN` | 无 | 开发态跨应用导航 + shared-state 边界检测需要 |
| `MICRO_APP_<NAME>_URL` | `http://localhost:<port>` | 子应用代理目标地址 |
| `PROXY_WS_PROXY` | `auto` | 主应用 WS/HMR 代理开关（`auto` / `on` / `off`）|
| `PROXY_TIMEOUT` | `10000` | 代理超时 ms |
| `PROXY_ENABLE_LOGGING` | `true` | 代理日志开关 |

---

## 目录结构

```text
apps/
  main/        # 主应用（统一入口 + 代理层）
  activity/    # 子应用示例
  account/     # 子应用示例
  futures/     # 合约子应用

packages/
  micro-core/      # registry / MicroLink / useMicroRouter / shared-state / event-bus
  shared-state/
  shared-ui/       # Header / Footer 等跨应用 UI
  shared-utils/

scripts/
  create-app.mjs       # 新增子应用脚手架
  smoke-check.mjs      # 主链路 smoke
  registry/validate.ts
  registry/report.ts
  tests/
```

---

## 单点 registry

所有子应用元数据集中在 [`apps.config.json`](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/micro-core/src/apps.config.json)，纯运行时逻辑在 [`app-registry.runtime.js`](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/micro-core/src/app-registry.runtime.js) 里被 TS、Node 服务端、ESM 脚本共同复用。

```text
apps.config.json
        │
        ▼
app-registry.runtime.js ──┬─► apps/main/server.js      (Node require)
                          ├─► apps/main/server/*.js    (Node require)
                          ├─► scripts/smoke-check.mjs  (createRequire)
                          └─► packages/micro-core/...  (TS re-export)
```

### 每个 app 的字段

必填：`name` / `displayName` / `basePath` / `enabled` / `navigation` / `targetEnvVar` / `defaultTarget`
可选：`standaloneAccessible` / `devFallbackToMainOrigin` / `smokeEnabled` / `description`

### registry 自动派生

以下都不再手工维护，直接从 registry 计算：

- Header 导航
- 客户端 matcher
- 环境变量模板
- 新 app 接入说明片段
- smoke 目标列表

### 路径契约

- 页面 HTML：`/{basePath}/...`
- chunk：`/{basePath}/_next/static/...`
- data：`/{basePath}/_next/data/{buildId}/...`
- public：`/{basePath}/...`

---

## 主应用代理

实现：[`apps/main/server.js`](/Users/xiaofei/Downloads/work/Study/yiFrame/apps/main/server.js) + [`apps/main/server/*`](/Users/xiaofei/Downloads/work/Study/yiFrame/apps/main/server)

- HTTP 请求按 `pathname` 走 `matchApp`，命中子应用时用 `http-proxy` 转发到 `defaultTarget` 或环境变量指定的目标
- 未命中时 fallthrough 给主应用自身的 Next handler
- 失败统一渲染 502 fallback HTML（含 trace-id）

### WebSocket / HMR

Next.js dev server 的 HMR 走 `ws://` 连接。如果你通过**主应用 origin** 访问子应用页面（`http://localhost:3000/activity`），主应用需要把 `upgrade` 事件也代理到对应子应用端口，否则改代码不会自动刷新。

开关：`PROXY_WS_PROXY`

| 值 | 行为 |
| --- | --- |
| `auto`（默认）| dev 开，prod 关 |
| `on` | 强制开 |
| `off` | 强制关 |

对 WS 场景，`proxy.on('error', ...)` 已做 `writeHead` 守卫，不会对 raw socket 调 HTTP 响应 API。

---

## 开发态跨应用导航兜底

**问题**：直连 `http://localhost:3001/activity`，点 Header 上的"主页"按当前 origin 就会跳到 `http://localhost:3001/`，是个死页。

**处理**：

- 仅 dev 生效，仅跨应用导航生效，同应用内部不动
- 需要配置 `MAIN_APP_ORIGIN`
- 覆盖 `MicroLink` / `useMicroRouter.push` / `useMicroRouter.replace`

```bash
export MAIN_APP_ORIGIN=http://localhost:3000
```

验证：直连 `:3001/activity`，点"主页"，应跳到 `http://localhost:3000/`。

实现：[`navigation.ts`](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/micro-core/src/navigation.ts) / [`link.tsx`](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/micro-core/src/link.tsx) / [`router.ts`](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/micro-core/src/router.ts)

---

## 状态共享（shared-state）

定义与实现：[`shared-state.ts`](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/micro-core/src/shared-state.ts)

### 设计

没有中心化 Store——每个子应用是独立 Next 进程，连 React runtime 都是各自一份。所谓"共享"是**共享一份持久化的值**，靠三件事：

1. **浏览器存储**作为 source of truth（cookie / localStorage）
2. **`BroadcastChannel`**（回退 `storage` 事件）做跨 tab 与跨 app 实时同步
3. 配置表 [`sharedStateDefinitions`](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/micro-core/src/shared-state.ts) 强约束每个 key 的存储选择与 SSR 语义

内置的共享 key：

| key | 存储 | SSR 可读 | 默认 |
| --- | --- | --- | --- |
| `locale` | cookie | ✅ | `'zh-CN'` |
| `theme` | cookie | ✅ | `'light'` |
| `currencyRates` | localStorage | ❌ | `{}` |
| `assetVisibility` | localStorage | ❌ | `true` |

**规则**：SSR 要读到的 key 必须用 cookie（SSR 只看得到请求头），纯客户端偏好走 localStorage 省 cookie 体积。

### 客户端读写

```tsx
import {
  getSharedState,
  setSharedState,
  onSharedStateChange,
} from '@miro/micro-core';

// 读
const theme = getSharedState('theme');           // 'light' | 'dark' | undefined

// 写（自动广播到其他 tab / app）
setSharedState('theme', 'dark');

// 订阅
const unsubscribe = onSharedStateChange((key, value) => {
  if (key === 'theme') applyTheme(value);
});
```

### SSR 从 cookie 恢复

```tsx
import { getSharedStateSnapshotFromCookieHeader } from '@miro/micro-core';

export const getServerSideProps = (ctx) => ({
  props: {
    sharedStateSnapshot: getSharedStateSnapshotFromCookieHeader(
      ctx.req.headers.cookie || ''
    ),
  },
});
```

在 `_app.tsx` 里把 snapshot 传给 `SharedStateProvider`（各子应用模板已生成）。

### 新增一个共享 key

改 [`shared-state.ts`](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/micro-core/src/shared-state.ts) 的 `SharedStateShape` 与 `sharedStateDefinitions`，然后：

```bash
npm run test:core   # validateSharedStateDefinitions 会在启动时校验
```

### 多 origin 边界 ⚠️

cookie / localStorage / BroadcastChannel 在浏览器侧按 **origin** 隔离，不同端口 = 不同 origin。

| 访问方式 | shared-state 是否完整生效 |
| --- | --- |
| 经主应用代理 `http://localhost:3000/activity` | ✅ |
| 直连子应用 `http://localhost:3001/activity` | ❌ 不与主应用同步 |

收口方式（不引入 iframe 桥，保持最小）：

- 各子应用 `_app.tsx` 启动时调 `warnIfSharedStateBoundaryViolated()`
- dev + `MAIN_APP_ORIGIN` 配置时，若当前 origin 不匹配，浏览器 console 给出 `[SharedState]` 警告
- 业务需要自定义处理时调 `getSharedStateOriginBoundary()` 拿结构化报告
- 生产态与未配置 `MAIN_APP_ORIGIN` 自动 no-op

### 建议与边界

- **只放"平台级偏好"**（语言、主题、可见性开关）。业务状态（余额、订单）走 `event-bus` 或各子应用自己的 Zustand / React Query
- cookie 总和控制在 4KB 以下，避免 SSR payload 膨胀
- 真要跨 origin 同步状态（例如 3001 与 3000 并存的开发模式），本框架不提供，可选方案：postMessage + 主 origin iframe 桥、后端 KV + SSE/WS 推送

---

## 统一请求基座（request-core）

包：[`@miro/request-core`](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/request-core)

### 做什么

一层极小的 HTTP 客户端工厂，跨 SSR / CSR 统一：

- auth token 解析（cookie `miro_auth_token` 为 source of truth）
- 公共 headers 注入（`Authorization` / `x-miro-trace-id` / `x-miro-source-app` / `x-request-locale` / `x-theme`）
- 超时（AbortController + `AbortSignal.timeout`）
- 错误归一为 `AppRequestError`（`network` / `timeout` / `abort` / `http` / `biz` / `unauthorized` / `forbidden`）
- 401/403 广播 `auth:unauthorized` 事件 + 触发注册的 handler

### 不做什么

- React Query / SWR、缓存、mock、toast、复杂重试矩阵
- 业务 API（仍由各子应用自己封装）
- 登录流程本身（只管登录后的请求 + 登录失效后的归一）

### 分层

| 层 | 谁写 | 例子 |
| --- | --- | --- |
| Layer A 框架 | `@miro/request-core` | `createServerRequestClient` / `getBrowserRequestClient` |
| Layer B 业务 | 各子应用 `src/services/*` | `listActivities()` / `getPositions()` |

### 浏览器端用法

```ts
import { getBrowserRequestClient } from '@miro/request-core';

const client = getBrowserRequestClient({
  appName: 'activity',
  baseUrl: '/activity/api',
});

const list = await client.get<ActivityItem[]>('/list');
```

同一个 `appName` 会复用同一个 client 实例。

### SSR 用法

```ts
import { createServerRequestClient } from '@miro/request-core';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const client = createServerRequestClient({
    appName: 'activity',
    baseUrl: process.env.ACTIVITY_API_BASE_URL,
    req: ctx.req,
  });
  const data = await client.get('/list');
  return { props: { data } };
};
```

SSR client **不要跨请求复用**，每个请求新建一个实例，因为它绑定了 `req` 里的 cookie 与 trace-id。

### auth token 解析优先级

| 环境 | 优先级 |
| --- | --- |
| CSR | `setAuthTokenOverride()` 内存值 → `document.cookie` 的 `miro_auth_token` |
| SSR | `req.headers.cookie` 的 `miro_auth_token` → `req.headers.authorization` 透传 |

**不从 localStorage 取 token**（XSS 防线）。shared-state 不放 token。

### 401 / 403 处理

默认行为：

1. 抛 `AppRequestError({ type: 'unauthorized' | 'forbidden' })`
2. event-bus 广播 `auth:unauthorized`，payload `{ appName, traceId, status, runtime }`
3. 调用所有通过 `onUnauthorized()` 注册的 handler

**主应用在 `_app.tsx` 绑定一次即可**，子应用不用各自写：

```ts
import { onUnauthorized } from '@miro/request-core';

onUnauthorized(({ status }) => {
  if (typeof window === 'undefined') return;
  window.location.href = `/login?reason=${status}`;
});
```

调用方如果只想做一次试探（允许 401 静默），传 `silent401: true`。

### 多 origin 开发模式

若当前 origin 与 `MAIN_APP_ORIGIN` 不一致（直连子应用端口），CSR 下 cookie 不共享 → token 读不到。`request-core` 此时：

- dev 环境在浏览器 console 打印一次 `[request-core] app "<name>" is running on ... while MAIN_APP_ORIGIN is ...` 警告
- 不硬 fail，公开接口仍可请求
- 生产态与未配置 `MAIN_APP_ORIGIN` 自动 no-op

### 与现有模块的衔接

| 现有模块 | 衔接方式 |
| --- | --- |
| `shared-state` | 构造 headers 时读 `locale` / `theme`；**不读写 auth** |
| `event-bus` | 401/403 时 `emit('auth:unauthorized', ...)` |
| `registry` | 仅通过 `appName` 参数关联，用于 header `x-miro-source-app` 与日志；不从 registry 派生 baseUrl |

### 接入 checklist

新子应用要用 `request-core`：

1. `package.json` 加 `"@miro/request-core": "*"`
2. `next.config.mjs` 的 `transpilePackages` 加 `'@miro/request-core'`
3. 新建 `src/services/<app>-api.ts`，调 `getBrowserRequestClient` / `createServerRequestClient`

参考示例：[`apps/activity/src/services/activity-api.ts`](/Users/xiaofei/Downloads/work/Study/yiFrame/apps/activity/src/services/activity-api.ts)

---

## 最小登录闭环 demo

一个**真实可运行**的最小登录示例，用来验证 `request-core` + shared Header + 主/子应用闭环成立。**不是完整的 auth 平台**：用户数据是内存存储，重启就丢，没有 refresh token / 权限 / 验证码 / 邮箱校验。

### 闭环链路

```text
用户注册 / 登录（shared Header 右上角）
  → 后端 (apps/main/src/pages/api/auth/*) 下发 httpOnly session cookie
  → Header 监听 event-bus 同步已登录状态
  → 子应用 AuthDemo 调用 /api/auth/me 同源命中
  → request-core 自动带上 session cookie → 200
  → 点击退出 → 清 cookie + 广播 auth:logout
  → 子应用再次调用 → 401 归一
```

### 当前 auth 模型

| 项 | 值 |
| --- | --- |
| 后端 | `apps/main/src/pages/api/auth/*` + `/api/demo/protected`（Next API routes） |
| 鉴权载体 | `miro_session` httpOnly cookie（不是 `miro_auth_token`） |
| 密码存储 | `sha256`，demo only，生产必须换 bcrypt/argon2 |
| 用户表 | 内存 `Map<email, user>` |
| 会话表 | 内存 `Map<sessionId, session>`，7 天过期 |
| request-core CSR | 默认 `credentials: 'include'`，浏览器自动带 cookie |
| 登录态 UI 同步 | Header 订阅 `auth:login` / `auth:logout`，登录后立即更新，刷新时 `/api/auth/me` 恢复 |

### API 速查

| Method | Path | Body | 成功 | 失败 |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | `{ email, password, name }` | 201 + 自动登录 Set-Cookie | 400 / 409 |
| POST | `/api/auth/login` | `{ email, password }` | 200 + Set-Cookie | 401 |
| GET | `/api/auth/me` | — | 200 `{ user }` | 401 |
| POST | `/api/auth/logout` | — | 200 + 清 cookie | — |
| GET | `/api/demo/protected` | — | 200 受保护内容 | 401 |

### 怎么跑

```bash
npm install
npm run dev:main       # 起主应用（含 auth API）
npm run dev:activity   # 起 activity 子应用
npm run dev:futures    # 起 futures 子应用
```

验证步骤：

1. 打开 `http://localhost:3000`
2. 右上角点 **注册** → 填写表单（默认已填 `demo@example.com / 123456 / Demo User`）→ 确认
3. Header 立刻显示 `👤 Demo User (demo@example.com)` 和 **退出** 按钮
4. 点 Header 里的 **Activity** → 同 origin 进子应用 → 页面有 **Auth Demo** 区块 → 点 `GET /api/demo/protected` → 拿到 `"Hello Demo User, ..."`
5. 回主页，点 **退出**
6. 再进 Activity → 点 `GET /api/demo/protected` → ❌ `unauthorized (401)`

### 命令行闭环验证

```bash
# 启动 main 后：
curl -s -c /tmp/c.jar -X POST http://localhost:3000/api/auth/register \
  -H "content-type: application/json" \
  -d '{"email":"alice@example.com","password":"secret","name":"Alice"}'

curl -s -b /tmp/c.jar http://localhost:3000/api/auth/me
curl -s -b /tmp/c.jar http://localhost:3000/api/demo/protected

curl -s -X POST -b /tmp/c.jar -c /tmp/c.jar http://localhost:3000/api/auth/logout

curl -s -b /tmp/c.jar http://localhost:3000/api/auth/me   # => 401
```

### 文件入口

- 后端：[`apps/main/src/lib/auth-store.ts`](/Users/xiaofei/Downloads/work/Study/yiFrame/apps/main/src/lib/auth-store.ts) / [`apps/main/src/pages/api/auth/`](/Users/xiaofei/Downloads/work/Study/yiFrame/apps/main/src/pages/api/auth)
- Header 登录 UI：[`packages/shared-ui/src/AuthMenu.tsx`](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/shared-ui/src/AuthMenu.tsx)
- auth 客户端封装：[`packages/shared-ui/src/auth-client.ts`](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/shared-ui/src/auth-client.ts)
- 子应用验证区块：[`packages/shared-ui/src/AuthDemo.tsx`](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/shared-ui/src/AuthDemo.tsx)

### Header 首屏登录态（auth snapshot SSR 注入）

**解决什么问题**：AuthMenu 初始 state 默认是 `null`，CSR 挂载后才调 `/api/auth/me` 纠正。主应用 ↔ 子应用通过 `MicroLink mode="reload"` 跳转或刷新页面时，首帧一定先闪一下"登录/注册"，再切成已登录。

**怎么做的**：

1. `packages/shared-ui/src/auth-ssr.ts` 提供 `withAuthSnapshotServerSideProps(appName, handler?)`，在 `getServerSideProps` 期间通过 `createServerRequestClient` 带上请求原始 `Cookie` 去调 **主应用** `/api/auth/me`，拿到最小 user snapshot
2. snapshot 塞进 `pageProps.__authSnapshot`
3. 每个 app 的 `_app.tsx` 用 `AuthSnapshotProvider initialUser={pageProps.__authSnapshot ?? null}` 喂给 React Context
4. `AuthMenu` 的 `useState` 初始值 = `useAuthSnapshot()` → **SSR 首帧就是终态**，hydration 无 mismatch
5. `useEffect` 里仍跑 `fetchMe()` 做 CSR 校正，session 过期 / 跨 tab 登出时能翻过来

**哪些页面接入了**：

| 页面 | 之前 | 现在 |
| --- | --- | --- |
| `apps/main/src/pages/index.tsx` | ASO（静态） | SSR（新增 gSSP） |
| `apps/futures/src/pages/index.tsx` | ASO（静态） | SSR（新增 gSSP） |
| `apps/activity/src/pages/index.tsx` | 已 SSR | 已 SSR，链式注入 |
| `apps/activity/src/pages/list.tsx` | 已 SSR | 已 SSR，链式注入 |
| `apps/account/src/pages/profile.tsx` | 已 SSR | 已 SSR，链式注入 |

**ASO 影响**：

- 只有上面 5 个页面进入 SSR，其余页面保留原渲染模式，**没有**重新引入 `App.getInitialProps`
- `apps/main/src/pages/404.tsx`、`apps/account/src/pages/index.tsx`、`apps/account/src/pages/settings.tsx`、`apps/futures` 内部静态页等依然是 ASO；它们的 AuthMenu 首帧仍走 "null → effect fetch" 老路径
- 这是刻意的取舍：只为"跨应用 reload 着陆页"付出 SSR 成本（一次 `/api/auth/me` 约 2-5ms），其他页面不动

**401 自动同步 Header**：

任何页面对受保护接口发起的请求（AuthDemo 的按钮、业务接口等）只要拿到 **401/403** 且未显式传 `silent401`，request-core 就会广播 `EVENT_AUTH_UNAUTHORIZED`。`AuthMenu` 订阅了这个事件，会立刻把 Header 切回"登录/注册"。

这一条主要是修正 demo 场景下的一个典型残影：主应用进程重启 → 内存 session 丢 → 浏览器仍有旧 cookie → Header 因为 SSR snapshot 还残留「已登录」。只要用户后续点任何受保护按钮，UI 就会自动校正。不需要整页刷新。

**不会成立的情况**：

- MAIN_APP_ORIGIN 未配置、或主应用不可达 → `resolveAuthSnapshot` 超时（2s）返回 `null`，不影响 SSR 成功；首屏回退 CSR 策略
- 子应用直连访问（`:3001`、`:3003`）时 SSR 能跑，但 `MAIN_APP_ORIGIN` 指向主应用——只要主应用活着就能拿到 snapshot；如果主应用也挂了，fallback null

### 子应用直连访问的限制

如果你绕过主应用直接访问 `http://localhost:3001/activity`，Auth Demo 按钮会打到 `:3001/api/auth/me`（不存在）→ 404。这是跨 origin cookie 天然不共享的后果，request-core 的多 origin 警告已在 console 提示。**demo 的预期访问路径是主应用 origin `:3000`**。

### 当前限制

- 内存存储，进程重启用户和 session 全丢
- 没有 refresh token、CSRF、限流
- 没有权限 / RBAC
- Header 的 AuthMenu 是最小内联表单，无校验反馈
- 密码是 `sha256`，仅 demo；生产用 `bcrypt` / `argon2`
- auth snapshot SSR 注入只覆盖 5 个关键页面；其余 ASO 页面的 Header 首屏仍会短暂闪烁

---

## 新增子应用

```bash
npm run create:app trade
```

自动完成：`apps/trade/` 目录骨架、`package.json`、`next.config.mjs`、`tsconfig.json`、`_app.tsx`、`index.tsx`、`public/platform-owner.txt`、registry 条目、根脚本 `dev:trade`。

生成后的默认约定：

- `basePath`: `/trade`
- env: `MICRO_APP_TRADE_URL`
- 端口按 registry 现有端口递增

仍需手工补的：业务页面、真实部署目标地址、更细 smoke 场景。

脚手架脚本：[`create-app.mjs`](/Users/xiaofei/Downloads/work/Study/yiFrame/scripts/create-app.mjs)

---

## 合约子应用

路径 `/futures`，workspace [`apps/futures`](/Users/xiaofei/Downloads/work/Study/yiFrame/apps/futures)。这版不是把老的 `ssr-future-web` 整包搬进来，而是先迁可独立运行的核心能力：

- 行情概览、订单簿、下单面板、持仓表
- 浮动盈亏 / 强平价 / 盈亏平衡价 / 保证金比例计算（纯 TS）

数据模式默认 mock，接真实后端：

```bash
export NEXT_PUBLIC_FUTURES_DATA_MODE=remote
export NEXT_PUBLIC_FUTURES_API_BASE=http://your-api-host
# 约定聚合接口：GET {API_BASE}/dashboard?symbol=BTCUSDT
```

---

## 本地验证

### registry

```bash
npm run registry:validate    # 校验 apps.config.json
npm run registry:report      # 打印派生数据
```

### shared-state / event-bus

```bash
npm run test:core
```

### 主链路 smoke

```bash
npm run smoke:local
```

覆盖 HTML / chunk / data / public / 子应用直连，且按 registry 自动派生 app 列表；`buildId` 从页面 `__NEXT_DATA__` 动态解析。

### fallback（502 兜底）

先停掉某个子应用，再跑：

```bash
SKIP_ACCOUNT_CHECKS=true CHECK_FALLBACK_PATH=/account/profile npm run smoke:local
# 预期：502 + 页面含 "Micro App Unavailable"
```

### HMR 代理

```bash
npm run dev:activity && npm run dev:main
# 打开 http://localhost:3000/activity
# 改 apps/activity/src/pages/index.tsx
# 终端：[ProxyServer] Proxying WS upgrade ... activity
# 浏览器无需硬刷新
```

### shared-state 多 origin 警告

```bash
export MAIN_APP_ORIGIN=http://localhost:3000
npm run dev:activity
# 直连 http://localhost:3001/activity
# console：[SharedState] You are on http://localhost:3001 but MAIN_APP_ORIGIN is ...
```

---

## 当前限制

1. `create:app` 只生成最小脚手架，不含完整业务页、测试、部署配置
2. registry 衍生数据目前只以 runtime 函数 / 命令行报告形式暴露，未落盘静态制品
3. 跨应用导航兜底依赖 `MAIN_APP_ORIGIN`，未配置时子应用直连仍回到当前 origin
4. 多 origin 下 shared-state 是「边界警告」而非「跨 origin 同步」；若业务要求直连也同步，需独立一轮 postMessage / iframe 桥方案
5. 生产代理层未加 `X-Forwarded-*` 头注入、重试、断路、WS 外的可观测性指标
6. 未做 App Router 兼容，`MicroLink` / `useMicroRouter` 绑定 Pages Router
7. `request-core` 仅提供工厂能力，未内置业务码白名单、幂等重试、文件上传进度、取消语义之外的 hooks 封装
8. auth demo 是内存版闭环，不是完整用户系统：无持久化、无 refresh token、无权限、无 CSRF、密码仅 sha256
