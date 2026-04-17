# yiFrame

一个基于 Next.js Pages Router 的路由聚合型微前端基础框架。

当前版本的重点不是继续推翻架构，而是把主链路闭环之后的工程化能力补齐：

- 单点 registry 继续收敛为元数据中心
- 支持最小可用的子应用脚手架命令
- 开发环境下补上跨应用导航兜底

## 当前定位

这套框架保留了这些前提：

- 主应用统一入口
- 子应用独立 Next.js app
- Pages Router + SSR
- 共享状态、共享 UI、事件总线以包的形式复用

这套框架不做：

- iframe
- qiankun / wujie / single-spa
- 运行时沙箱容器
- Module Federation 主导的页面拼装

## 已完成的主链路

当前已经闭环并可验证的能力：

1. 主应用统一代理页面 HTML、`_next/static`、`_next/data`、`public`
2. app 注册集中在一份源数据里
3. `MicroLink` / `useMicroRouter` 支持 `mode: 'auto' | 'spa' | 'reload'`
4. shared-state 配置表驱动，event-bus 有最小测试保护
5. smoke-check 覆盖 HTML、chunk、data、public、fallback

## 目录

```text
apps/
  main/
  activity/
  account/

packages/
  micro-core/
  shared-state/
  shared-ui/
  shared-utils/

scripts/
  create-app.mjs
  smoke-check.mjs
  registry/
    validate.ts
    report.ts
  tests/
```

## 单点 registry

唯一 app 源数据：

[apps.config.json]

当前每个 app 至少包含这些字段：

- `name`
- `displayName`
- `basePath`
- `enabled`
- `navigation`
- `targetEnvVar`
- `defaultTarget`

轻量能力声明：

- `standaloneAccessible`
- `devFallbackToMainOrigin`
- `smokeEnabled`
- `description`

### registry 现在自动提供什么

以下衍生信息不再手工维护，而是直接从 registry 计算：

- Header 导航数据
- client-side matcher 数据
- 环境变量模板
- 新 app 接入说明片段
- smoke app 列表

相关实现：

- [app-registry.ts]
- [validate.ts]
- [report.ts]

运行校验：

```bash
npm run registry:validate
```

查看导出结果：

```bash
npm run registry:report
```

## 路径契约

对外统一使用：

- main: `/`
- activity: `/activity/**`
- account: `/account/**`

代理层统一处理：

- 页面 HTML：`/{basePath}/...`
- chunk：`/{basePath}/_next/static/...`
- data：`/{basePath}/_next/data/{buildId}/...`
- public：`/{basePath}/...`

## 本地启动

安装依赖：

```bash
npm install
```

分别启动：

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

## 新增 app 脚手架

创建新子应用：

```bash
npm run create:app trade
```

这个命令会自动完成：

1. 生成 `apps/trade/`
2. 写入 `package.json`
3. 写入 `next.config.mjs`
4. 写入 `tsconfig.json` 与 `next-env.d.ts`
5. 写入 `src/pages/_app.tsx`
6. 写入 `src/pages/index.tsx`
7. 写入 `public/platform-owner.txt`
8. 追加 registry 条目
9. 追加根脚本 `dev:trade`

生成后的默认约定：

- `basePath`: `/trade`
- env: `MICRO_APP_TRADE_URL`
- 默认目标地址：脚本会按当前 registry 端口继续递增

创建完成后还需要做的事：

```bash
export MICRO_APP_TRADE_URL=http://localhost:3003
export MAIN_APP_ORIGIN=http://localhost:3000
npm run dev:trade
npm run dev:main
```

脚手架脚本：

[create-app.mjs](/Users/xiaofei/Downloads/work/Study/yiFrame/scripts/create-app.mjs)

## 开发态跨应用导航兜底

背景：当你直连子应用，比如 `http://localhost:3001/activity`，再点击平台级导航里的主页或其他应用，如果仍然沿用当前 origin，就会跳到 `http://localhost:3001/` 这类错误地址。

现在的处理方式：

- 仅在开发环境生效
- 仅在跨应用导航时生效
- 同应用内部导航仍然走原来的逻辑
- 生产环境语义保持不变

配置方式：

```bash
export MAIN_APP_ORIGIN=http://localhost:3000
```

这个变量会注入到各个 Next app 的客户端环境中，供导航层读取。

相关实现：

- [navigation.ts](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/micro-core/src/navigation.ts)
- [link.tsx](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/micro-core/src/link.tsx)
- [router.ts](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/micro-core/src/router.ts)

### 如何验证

1. 启动 `main` 与 `activity`
2. 直连打开 `http://localhost:3001/activity`
3. 点击 Header 中的“主页”或“Account”
4. 预期跳到 `http://localhost:3000/` 或 `http://localhost:3000/account/...`

这个兜底同时覆盖：

- `MicroLink`
- `useMicroRouter.push`
- `useMicroRouter.replace`

## 本地验证

### registry

```bash
npm run registry:validate
npm run registry:report
```

### shared-state / event-bus

```bash
npm run test:core
```

### 主链路 smoke-check

```bash
npm run smoke:local
```

默认覆盖：

- main HTML
- main public
- activity HTML
- activity chunk
- activity data
- activity public（经 main）
- account HTML
- account chunk
- account data
- activity public（子应用直连）

### fallback

先停掉 `account`，再执行：

```bash
SKIP_ACCOUNT_CHECKS=true CHECK_FALLBACK_PATH=/account/profile npm run smoke:local
```

预期：

- 返回 `502`
- 页面包含 `Micro App Unavailable`

## 新增一个 app 现在还需要手工做什么

已经自动化的部分：

- app 目录骨架
- registry 注册
- 默认端口与 env var 命名
- 根脚本 `dev:<app>`

仍然需要手工补的部分：

- 业务页面与接口
- 子应用自己的 SSR 页面
- 是否加入更细粒度 smoke 场景
- 部署环境里的真实目标地址

## 第五轮工程化加固（本轮完成）

这一轮只做「最值钱的 4 件事」，不再扩张架构：

1. **消灭 registry 双实现**：纯逻辑收敛到 [app-registry.runtime.js]，TS/JS/脚本全部复用同一份。
2. **主应用代理支持 WebSocket / HMR**：开发态子应用走主应用 origin 时 Next HMR 不再失效。
3. **smoke-check 完全 registry 驱动**：app 列表自动派生，buildId 从页面 `__NEXT_DATA__` 动态解析，不再写死 `development`。
4. **多 origin 下 shared-state 边界**：新增 `warnIfSharedStateBoundaryViolated()` + `getSharedStateOriginBoundary()`，dev 直连子应用端口时主动 `console.warn`。

### Registry 单一事实源

- 纯运行时逻辑：[app-registry.runtime.js](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/micro-core/src/app-registry.runtime.js)
- 类型声明：[app-registry.runtime.d.ts](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/micro-core/src/app-registry.runtime.d.ts)
- TS 门面（零实现）：[app-registry.ts](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/micro-core/src/app-registry.ts)

调用链现在是单向的：

```text
apps.config.json
        │
        ▼
app-registry.runtime.js ──┬─► apps/main/server.js      (require, Node)
                          ├─► apps/main/server/*.js    (require, Node)
                          ├─► scripts/smoke-check.mjs  (createRequire, ESM)
                          └─► packages/micro-core/src/app-registry.ts
                                     │
                                     ▼
                               navigation / link / router / registry
```

删除的重复逻辑：

- `apps/main/server/app-resolution.js` 里的 `validateRegistry` / `matchApp` / 默认值填充
- `apps/main/server/path-normalization.js` 里的 `normalizeBasePath` / `isConflictingPrefix`
- `packages/micro-core/src/app-registry.ts` 里的 200+ 行 TS 实现（现在只剩 re-export）

### WebSocket / HMR 代理

- `apps/main/server.js` 注册了 `server.on('upgrade', ...)`
- 使用已有 `http-proxy` 的 `proxy.ws(req, socket, head, { target })`
- 归属识别：和 HTTP 一样按 `pathname` 走 `matchApp`，命中子应用时转发，否则 fallthrough 给 Next 自身
- 仅开发态启用（`NODE_ENV !== 'production'`），可用 `PROXY_DISABLE_WS=true` 关闭
- `proxy.on('error', ...)` 对 WS 情况做了 `writeHead` 守卫，不会对 raw socket 调 HTTP 响应 API

验证方式：

```bash
npm run dev:activity
npm run dev:main
# 打开 http://localhost:3000/activity
# 修改 apps/activity/src/pages/index.tsx
# 终端会看到 [ProxyServer] Proxying WS upgrade ... activity
# 浏览器无需硬刷新即可看到改动
```

### 真·registry 驱动的 smoke-check

- app 列表直接来自 `getSmokeTargetEntries()`，新增 app 只要 `enabled: true && smokeEnabled: true`，smoke 就会自动覆盖
- `/_next/data/<buildId>/<page>.json` 的 `<buildId>` 与 `<page>` 都从页面 HTML 里的 `__NEXT_DATA__` 解析
- 只有页面声明了 `getStaticProps` / `getServerSideProps`（`gsp` 或 `gssp` 为真）才会检查 data 线路，否则显式 `skip`
- chunk 线路先试 `chunks/main.js`，prod 下 hash 化时回退到 `_buildManifest.js`
- 失败输出统一格式：`app=... lane=... url=... message=...`

相关实现：

- [smoke-check.mjs](/Users/xiaofei/Downloads/work/Study/yiFrame/scripts/smoke-check.mjs)

### 多 origin 下 shared-state 的边界

**结论**：

| 访问方式 | 示例 URL | shared-state 是否完整生效 |
| --- | --- | --- |
| 经主应用代理（推荐） | `http://localhost:3000/activity` | ✅ 完全生效 |
| 直连子应用端口（开发便利） | `http://localhost:3001/activity` | ❌ 不与主应用同步 |

原因：`document.cookie` / `localStorage` / `BroadcastChannel` 在浏览器侧按 **origin** 隔离，不同端口即不同 origin。`devFallbackToMainOrigin` 只修跨应用导航的 URL，**不会**修状态同步。

受影响的 key：

- `locale`（cookie）
- `theme`（cookie）
- `currencyRates`（localStorage）
- `assetVisibility`（localStorage）

本轮的收口方式（不引入 postMessage/iframe 桥，保持最小）：

- 新增 `warnIfSharedStateBoundaryViolated()`：dev 且 `MAIN_APP_ORIGIN` 已配置、且当前 origin 与之不匹配时，浏览器 console 打印一条 `[SharedState]` 警告
- 新增 `getSharedStateOriginBoundary()`：返回结构化报告，供业务代码做自定义处理
- 各子应用 `_app.tsx` 在客户端启动时调用一次 `warnIfSharedStateBoundaryViolated()`
- 生产环境与未配置 `MAIN_APP_ORIGIN` 时自动 no-op，避免误报

验证方式：

```bash
export MAIN_APP_ORIGIN=http://localhost:3000
npm run dev:activity   # 监听 3001
# 直连打开 http://localhost:3001/activity
# 浏览器 console 看到：
# [SharedState] You are on http://localhost:3001 but MAIN_APP_ORIGIN is http://localhost:3000 ...
```

## 当前仍保留的限制

1. `create:app` 目前是最小脚手架，不会顺手生成完整业务页、测试和部署配置。
2. registry 的自动导出目前以 runtime 函数和命令行报告为主，还没有额外落盘成静态制品。
3. 开发态跨应用导航兜底依赖 `MAIN_APP_ORIGIN`，如果本地没配，子应用直连时仍会回到当前 origin。
4. 多 origin 下的 shared-state 仍然是「边界明确 + 警告」而不是「跨 origin 同步」。如果业务要求必须在直连子应用时同步状态，需要独立一轮引入 postMessage / iframe 桥方案。
5. 生产代理层未加 `X-Forwarded-*` 头注入、重试、断路、WS 以外的可观测性指标，这些都不在本轮范围。
6. App Router 兼容仍未做，`MicroLink` / `useMicroRouter` 仍绑定 Pages Router。
