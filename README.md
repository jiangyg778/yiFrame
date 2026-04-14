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

[apps.config.json](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/micro-core/src/apps.config.json)

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

- [app-registry.ts](/Users/xiaofei/Downloads/work/Study/yiFrame/packages/micro-core/src/app-registry.ts)
- [validate.ts](/Users/xiaofei/Downloads/work/Study/yiFrame/scripts/registry/validate.ts)
- [report.ts](/Users/xiaofei/Downloads/work/Study/yiFrame/scripts/registry/report.ts)

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

## 当前仍保留的限制

1. `create:app` 目前是最小脚手架，不会顺手生成完整业务页、测试和部署配置。
2. registry 的自动导出目前以 runtime 函数和命令行报告为主，还没有额外落盘成静态制品。
3. 开发态跨应用导航兜底依赖 `MAIN_APP_ORIGIN`，如果本地没配，子应用直连时仍会回到当前 origin。
