# 【历史归档】桌面端方案对比：三条"本地包"路线

> **已被方案 C 替代；历史讨论不代表当前实现。** A、B 未采纳，路线比较仅保留为决策记录。
> 当前入口：[方案 C 实现说明](../../desktop-plan-c-product-app.md) · [方案 C 当前图解](../../show-me-desktop-plan-c-final.html)。

> 状态：历史归档（起草于 2026-10-23，归档于 2026-10-24）。起草时尚未实施；文中的设计与代码片段仅记录当时提案。
> 用途：阅读对比后做决策。每条路线都有自己的详细计划，本文只负责并排比较。
> 配套图示：[desktop-architecture-options.html](./desktop-architecture-options.html)
> **决策（2026-10-24）：选定方案 C。** 当前实现说明见 [desktop-plan-c-product-app.md](../../desktop-plan-c-product-app.md)，确认稿图示见 [show-me-desktop-plan-c-final.html](../../show-me-desktop-plan-c-final.html)。A、B 的计划保留作记录。

## 0. 共同前提

三条路线都满足下面四条，差别只在"产品区代码住在哪、怎么到达桌面包"。

- 桌面窗口加载本地包 `views://mainview/index.html`，不加载远程网址。
- 登录注册留在 web。桌面端的登录与会话交接推迟，另行计划；三条路线都先用"登录稍后接入"占位。
- 产品区（现在只有 dashboard，以后 `/app` 下的页面）两端共用。
- Electrobun 2.x，主进程 `bun`；视图一律 Vite 构建后 `copy` 进包。Electrobun 自带的打包器跑不了 Tailwind v4、Paraglide 这些 Vite 插件。

## 1. 三条路线一览

| 路线                 | 产品区代码住在哪            | 桌面包里是什么                             | 复用方式                       | 详细计划                                                                                                                    |
| -------------------- | --------------------------- | ------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **A · web 双构建**   | `apps/web`（`/app` 路由段） | 整个 web 的静态产物（Start SPA 模式）      | 产物复用                       | [desktop-plan-a-web-dual-build.md](./desktop-plan-a-web-dual-build.md)                                                      |
| **B · 共享包**       | `packages/app`              | `apps/desktop` 自己的 Vite SPA，引用共享包 | 代码复用（包）                 | [desktop-architecture-plan.md](./desktop-architecture-plan.md) · [运行时详解](./desktop-architecture-plan-walkthrough.html) |
| **C · 独立产品应用** | `apps/app`（纯 Vite SPA）   | `apps/app` 的桌面产物                      | 产物复用（同一应用、两种宿主） | [desktop-plan-c-product-app.md](../../desktop-plan-c-product-app.md)                                                        |

B 的文档有两份：`desktop-architecture-plan.md` 是改动清单与配置草图，`desktop-architecture-plan-walkthrough.html` 解释运行时路径并附一处调整建议（desktop 拆两个 tsconfig）。两者是同一条路线。

## 2. 目录骨架

### A · web 双构建

```text
apps/web/
├── vite.config.ts                  # 按 mode 分支：desktop → base "/"、Start SPA 模式、关闭预渲染列表
├── src/start.ts                    # desktop 模式不注册 clerkMiddleware()
├── src/routes/{-$locale}/app/      # 新增：产品区，客户端守卫
├── dist/                           # web 自己的 SSR 产物
└── dist-desktop/client/            # 桌面用静态产物
apps/desktop/
├── electrobun.config.ts            # copy ../web/dist-desktop/client → views/mainview
└── src/bun/index.ts                # 主进程；preload 把首屏路径改回 /app
```

### B · 共享包

```text
packages/app/                       # 页面主体 + 查询；不依赖 Start、Clerk
├── src/api/client.ts               # configureAppApi / getAppOrpc
├── src/api/queries/*
└── src/ui/dashboard/*
apps/web/src/pages/dashboard/       # 薄包装：Container + 共享页面
apps/desktop/
├── src/bun/index.ts                # 主进程
└── src/view/                       # Vite SPA，hash 路由，引用共享包
```

### C · 独立产品应用

```text
apps/app/                           # 纯 Vite + TanStack Router SPA；没有 Start
├── vite.config.ts                  # mode web：base /web/app/ + browser history；mode desktop：base ./ + hash
├── src/routes/                     # 自己的文件路由：__root、(auth)/dashboard
└── src/shared/                     # orpc、宿主判定、locale、样式
apps/web/
├── server.ts                       # 新增：托管 /web/app/*，回退 index.html
└── src/routes/…/(auth)/dashboard/  # 删除，迁入 apps/app
apps/desktop/
├── electrobun.config.ts            # copy ../app/dist/desktop → views/mainview
└── src/bun/index.ts
```

## 3. 五条 `views://` 硬约束，三条路线各怎么过

| 约束                                                                           | A · web 双构建                                                                                                  | B · 共享包                                              | C · 独立产品应用                                             |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| 运行时没有服务器：`/app` 不能用 server function、服务端路由、oRPC 的服务端分支 | 靠约定 + lint 规则拦住；写了也能构建成功，只在桌面运行时 404                                                    | 共享包没有 Start 依赖，结构上写不出来；web 包装层可以用 | 应用里没有 Start，结构上写不出来                             |
| 基础路径必须是 `/`（web 的 `/web` 从 `VITE_WEB_URL` 推导）                     | desktop 模式下 `base`、Paraglide `basePath`、`appConfig.site.basePath` 三处改为从 `import.meta.env.BASE_URL` 取 | 桌面 SPA `base: "./"`                                   | 桌面模式 `base: "./"`；web 模式 `/web/app/`                  |
| 刷新与深链接：`views://` 没有文档化的 index.html 回退                          | 只能用 browser history（Start 限制），靠 preload 把首屏改回 `/app`；刷新深层路由待 spike 验证                   | hash history，一行配置                                  | 桌面模式 hash history；web 模式 browser history 由启动器回退 |
| i18n：URL 策略与 hash 冲突                                                     | 仍是 URL 策略，pushState 下可用                                                                                 | 桌面用 `overwriteGetLocale`，语言来自设置               | 同 B，应用内统一用设置，不带语言前缀                         |
| 视图必须 Vite 构建再 copy                                                      | `vite build --mode desktop`                                                                                     | `apps/desktop` 自己的 `vite build`                      | `vite build --mode desktop`                                  |

## 4. 综合对比

| 维度                | A · web 双构建                                                                              | B · 共享包                                            | C · 独立产品应用                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 桌面包内容          | 整个 web：营销页、法务页、Start 运行时、server function 客户端                              | 只有桌面 SPA + 共享页面                               | 只有产品应用                                                                           |
| web 受影响          | 一份 `vite.config.ts` 分两种模式，两份产物都要进 CI                                         | dashboard 搬进包，web 留薄包装；其余不变              | dashboard 迁出；启动器多一条托管规则；导航与跳转改为指向产品应用                       |
| 跨端导航            | web 内无缝（同一路由树）                                                                    | web 内无缝（同一路由树）                              | 营销页 ↔ 产品区是整页跳转                                                              |
| 服务端守卫          | web 保留；`/app` 改客户端守卫                                                               | web 保留                                              | 产品区只有客户端守卫                                                                   |
| Clerk provider 归属 | 绑定 `@clerk/tanstack-react-start`                                                          | 共享包只用 `@clerk/react` 的 hooks；provider 各端自选 | 应用自己用 `@clerk/react`                                                              |
| 初次改动面          | 最小：一个 mode + 挪一个页面                                                                | 中：新包 + 注入点 + 桌面 SPA                          | 中：新应用 + web 托管 + 导航/跳转                                                      |
| 长期维护            | 每加一个产品页都要记得"不能碰 Start"；两份产物                                              | 每个产品页写一次，两端各加一层路由包装                | 每个产品页写一次，没有包装层；但营销站与产品区是两个应用                               |
| 首次出窗口          | 1–2 天                                                                                      | 3–5 天                                                | 3–5 天                                                                                 |
| 主要风险            | `views://` 刷新行为未知；Start 的客户端入口不方便换 history；SPA 壳可能把"未登录"状态烤进去 | 注入点要先调用；共享包与两端的 lint 边界              | 整页跳转的体验；部署多一个目录；开发时 web 与 app 不同端口，Clerk 开发实例需要各自登录 |

## 5. 登录推迟给每条路线留的口子

- **A**：产品区代码绑定 `@clerk/tanstack-react-start`。桌面端接登录时，要在 desktop 模式下替换 provider 或绕过它的 Start 上下文。
- **B**：共享包只用 `@clerk/react` 的 hooks（`@clerk/tanstack-react-start` 本身就是 `export * from "@clerk/react"`），桌面端的 provider 和会话交接全部收在 `apps/desktop`。
- **C**：应用自己持有 `@clerk/react` 的 provider。web 宿主下同源 Cookie 直接可见；桌面宿主下的交接只改 `apps/app` 的一个 provider 和 `apps/desktop`。
- 三条路线共同：API 侧已经支持追加授权方（`CLERK_AUTHORIZED_PARTIES`），到时加入 `views://mainview`；后端 `authenticateRequest` 支持 `acceptsToken`，OAuth PKCE 可选。

## 6. 已排除的路线

| 路线                                                   | 排除原因                                                  |
| ------------------------------------------------------ | --------------------------------------------------------- |
| 远程壳（窗口直接加载已部署的 web，整站或 `/app` 专区） | 与"窗口加载本地包"前提冲突                                |
| 系统浏览器登录 + 一次性票据交接                        | 属于登录计划，不是本次架构选择；三条路线都兼容            |
| 本地 UI + 隐藏 web 窗口代领 token                      | 依赖隐藏窗口和给远程页面开 RPC，Electrobun 文档明确不建议 |
| Electron + `@clerk/electron`                           | 偏离 Electrobun；SDK 仍是 Beta                            |

## 7. 决策点

| #   | 问题                                                          | 影响范围                       |
| --- | ------------------------------------------------------------- | ------------------------------ |
| 1   | 选 A / B / C                                                  | 全部                           |
| 2   | 共享包或产品应用的名字（`app` / `product` / `console`）       | B、C                           |
| 3   | 应用名与 `identifier`（需要你持有的反向域名）                 | 全部                           |
| 4   | 根 `pnpm run dev` 是否带上 desktop                            | 全部                           |
| 5   | 根 `check` 首次要联网下载 Hutch，接受还是跳过                 | 全部                           |
| 6   | web 宿主下产品区用 browser history（启动器回退）还是也用 hash | C                              |
| 7   | web 的 `/dashboard` 是否迁到 `/app/*`                         | A 必须迁；B 可不迁；C 迁出 web |

## 8. 共同的 Spike

三条路线的第一步相同，代码可以丢弃，只留决策记录：

1. pnpm 11 + Node 24 + TS 7 下跑通 `electrobun dev`；devkit 的 tsconfig 是否兼容 TS 7。
2. Vite 产物（React + Tailwind v4 + 一个 `@tsu-stack/ui` 组件）在系统 webview 和 CEF 下的渲染。
3. `views://` 下 pushState、hash、刷新、前进后退的行为。A 依赖 pushState 的结论，B、C 只需要 hash。
4. 调 `health.live` 时实际带的 Origin 头，决定 API 直连还是主进程代发。
5. `Updater.localInfo.channel()`、`navigationRules`、`Utils.openExternal` 在 2.x 下的实际 API。
