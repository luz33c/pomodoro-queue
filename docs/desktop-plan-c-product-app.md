# 产品 App 与桌面端：当前架构

> 更新日期：2026-10-25。本文描述当前工作区源码，保留已选方案的理由与尚未实现的能力；不代表已经提交或部署到生产。
> [当前图解](./show-me-desktop-plan-c-final.html) · [历史方案归档](./archive/desktop/README.md)

## 当前状态

| 部分       | 源码现状                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| 网站       | `apps/web` 使用 TanStack Start，负责营销、法务、Playground 和登录注册；原受保护 Dashboard 路由已删除。 |
| 产品 App   | `apps/app` 是 Vite + React + TanStack Router SPA，已有 Dashboard、认证守卫、AppShell、语言和主题切换。 |
| 桌面壳     | `apps/desktop` 使用 Electrobun，已有窗口、外链处理、开发入口和本机打包配置。                           |
| 浏览器部署 | 独立 App 服务和 Web 同源子路径挂载均已有代码及 Docker 配置；容器验收仍待完成。                         |
| 桌面认证   | 尚未实现。桌面宿主固定未登录，显示登录占位页与公开 API 健康状态。                                      |
| 正式发布   | 尚未完成正式 identifier、图标、签名、公证、更新发布地址及跨平台 CI。                                   |

开发约定各自维护在 [App 指南](../apps/app/AGENTS.md)、[桌面指南](../.agents/desktop.md)、[认证指南](../.agents/auth.md) 和 [工具链指南](../.agents/toolchain.md)。本文不复制这些文件的详细规则或整段源码。

## 应用职责与连接

```text
apps/web                 网站、SSR、SEO、登录注册
    │ 完整 URL 导航与登录回跳
    ▼
apps/app                 产品 UI，同一份源码分两种模式构建
    ├── dist/web         → App 的 Node 静态服务，或 Web 的 Node 启动器
    └── dist/desktop     → apps/desktop 复制到 views/mainview

apps/desktop             Bun 主进程、窗口、导航规则、打包
apps/server              Hono + oRPC，按请求验证身份并提供 API
packages/ui、i18n、env   两个前端共享的组件、样式、文案和配置
```

- App 的 API 客户端只从 `@uni-stack/api/routers/types` 引用类型，浏览器运行时通过 HTTP 调用 API。
- Desktop 在开发依赖中声明 `@uni-stack/app`，通过 [Electrobun copy 配置](../apps/desktop/electrobun.config.ts) 消费 `../app/dist/desktop`。两者不互相导入应用源码。
- Web 在生产依赖中声明 `@uni-stack/app`，供 `pnpm deploy` 携带同源挂载需要的静态产物；Web 路由树不包含 App 页面。
- 网站进入 App 是整页导航。App 使用自己的布局，Web 的 Navbar 不包裹 App。

## 两种宿主

宿主由 App 的 Vite mode 在构建时确定：`vite --mode desktop` 加上 `desktop` 解析条件，`package.json` 的 `#/lib/host/runtime` 据此指向 [`lib/host/desktop`](../apps/app/src/lib/host/desktop/index.ts) 或 [`lib/host/web`](../apps/app/src/lib/host/web/index.ts)，两者实现同一个 `HostAdapter` 接口，另一个不会被打包。其他代码只读 `hostAdapter` 的能力；`AuthGate` 按 `hostAdapter.auth.signInRedirect` 决定是否要求登录。

| 行为       | 浏览器宿主                                 | 桌面宿主                                           |
| ---------- | ------------------------------------------ | -------------------------------------------------- |
| 构建       | `vite build` → `dist/web`                  | `vite build --mode desktop` → `dist/desktop`       |
| 资源路径   | 取自 `VITE_APP_URL` 的 pathname            | 相对路径 `./`                                      |
| 路由       | browser history，basepath 来自构建基础路径 | hash history，basepath 为 `/`                      |
| 地址示例   | `http://localhost:3002/app/dashboard`      | `views://mainview/index.html#/dashboard`           |
| 认证       | 挂载 Clerk，通过 `useAppAuth()` 读取会话   | 不挂载 Clerk，`useAppAuth()` 读取主进程的 OAuth 会话 |
| 未登录页面 | 跳到 Web 登录，携带当前 App URL            | 显示登录占位和 API 健康状态                        |
| 外链       | App 外链通常打开新标签页                   | 当前窗口导航被壳拦截，交给系统浏览器               |
| API        | 每次请求从 token getter 获取 Bearer token  | 目前只请求无需登录的健康接口；私有数据等待认证接入 |

桌面使用 hash 路由是因为 `views://` 没有服务端页面回退。外链处理仅把 HTTP、HTTPS 和 mailto 地址交给系统，并对重复事件去重；实现见 [navigation.ts](../apps/desktop/src/main/ui/navigation.ts)。

App 的语言在启动时按 `localStorage → navigator.languages → baseLocale` 决定，切换后刷新；它复用 Web 编译的 Paraglide 消息，通过 `overwriteGetLocale` 覆盖语言读取。Web 的语言由 URL 决定，两者不会自动共享语言选择。

主题与字体位于 `packages/ui`。两端使用 next-themes 默认的主题存储键：不同 origin 时本地存储隔离，同源挂载时共享主题存储。没有额外的跨应用偏好同步协议。

## 浏览器登录与 API

```text
App 的受保护页面
  → 等待 Clerk 就绪
  → 未登录：跳到 Web /sign-in?redirect=<当前 App URL>
  → Web 校验回跳地址并完成登录
  → 返回 App 原页面
  → App 调用 Clerk getToken()，以 Bearer token 请求 API
```

Web 的回跳校验要求目标 origin 与 `VITE_APP_URL` 一致，且 pathname 位于 App 基础路径内。站内目标继续使用已有的本地化路由校验；没有 redirect 时默认去 App 首页。代码见 [app-redirect.ts](../apps/web/src/features/auth/lib/app-redirect.ts)。

API 的授权方和 CORS 列表自动包含 Web 与 App 的 origin；额外来源由 `CLERK_AUTHORIZED_PARTIES` 提供。桌面开发来源为 `http://localhost:3003`，打包后来源为 `views://mainview`。添加来源只允许请求通过来源校验；桌面登录走 Clerk OAuth（PKCE + 本机回调），见[认证指南](../.agents/auth.md#desktop-sign-in)。

生产部署要求 Web 与 App 使用同一 Clerk 生产实例和同一根域，并按实际子域配置 Clerk。真实生产域名的会话共享仍需验收。App 退出登录后返回 `VITE_WEB_URL`。

## 部署方式

### 独立 App 服务

默认示例为 Web `http://localhost:3000/web`、App `http://localhost:3002/app`。生产可使用 `https://example.com` 与 `https://app.example.com`。

[`apps/app/server.ts`](../apps/app/server.ts) 按 `VITE_APP_URL` 的 pathname 托管 `dist/web`：已有静态资源直接返回，`assets/` 使用长期缓存，页面路径回退到 `index.html`，缺失且带扩展名的资源路径返回 404。健康检查位于该基础路径下的 `/_health`。

[App Dockerfile](../apps/app/Dockerfile) 构建后执行 `pnpm deploy --prod --legacy`。App 的运行时依赖仅为 Hono 和 Node 适配器。两个 Compose 文件均已包含独立 app 服务，Coolify 使用 `SERVICE_URL_APP`。

### Web 同源子路径挂载

此方式已实现。例如：

```text
VITE_WEB_URL=http://localhost:3000/web
VITE_APP_URL=http://localhost:3000/web/app
```

- 生产：[Web 启动器](../apps/web/server.ts) 在请求进入网站静态文件和 Start 处理器之前，托管 App 的 `dist/web`。
- 构建：[Web Dockerfile](../apps/web/Dockerfile) 在 App URL 位于 Web URL 之下时额外构建 App，再由部署依赖携带产物。
- 开发：[Web Vite 配置](../apps/web/vite.config.ts) 把 App 路径转发到 `:3002`；App 开发服务器保留同一基础路径。规则覆盖基础路径本身、带查询参数的基础路径和子路径，并排除 `/application` 之类的相邻路径。
- Compose 仍声明独立 app 服务，不会因选择同源挂载自动移除它。该入口由 Web 服务提供。

当前 Docker 的构建条件仍是原始 URL 字符串前缀匹配，运行时使用解析后的 URL。配置应采用一致的协议、主机名与端口写法；显式默认端口等规范化差异仍可能导致漏构建。这项限制尚未修复。

### 外部网关分流

仓库没有实现或验证外部网关配置。若以后采用网关，需要将 App 路径及其查询参数转给独立 App 服务，并保留基础路径；它属于部署选项，不是已交付的第三套托管实现。

### 构建地址约束

`VITE_APP_URL` 的基础路径会写入浏览器产物。一份 `dist/web` 服务一个构建地址；从子域根路径切到 `/app` 时需要重新构建，Web 和 API 的配置也要同步。`dist/desktop` 是独立构建产物。

App 的四个构建变量以 [ENV_APP](../packages/env/src/app/env.ts) 为准：`VITE_APP_URL`、`VITE_SERVER_URL`、`VITE_WEB_URL`、`VITE_CLERK_PUBLISHABLE_KEY`。桌面发布必须注入生产值；仅修改打包后进程环境不会替换前端 bundle 中的地址。

## 开发与构建入口

| 根命令                   | 当前行为                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `pnpm run dev`           | 启动 i18n 监听、Server、Web 和 App；不启动 desktop、native 或 extension。                           |
| `pnpm run dev:desktop`   | 确保 i18n 产物并构建桌面页面，再并行启动 App 的 `:3003` 开发服务与桌面壳。不会同时启动 API 和网站。 |
| `pnpm run build`         | 包含 i18n、App 浏览器版、Web、Server 和 Extension，按依赖顺序构建；不打包桌面壳。                   |
| `pnpm run build:desktop` | 编译 i18n、构建 App 桌面页面，然后打包当前平台的 stable 桌面应用。                                  |

详细包级脚本见 [App package.json](../apps/app/package.json) 和 [Desktop package.json](../apps/desktop/package.json)。单独构建 App 前若修改了文案，需要先编译 i18n；`i18n:ensure` 只处理产物缺失。

桌面当前仅在 dev channel 探测一次 `:3003`。请求失败就加载打包页面，本次窗口不会自动切回开发服务器；加载开发服务器时才有 Vite HMR。非 dev channel 直接使用打包页面。该启动策略保持现状，具体实现见 [view-url.ts](../apps/desktop/src/main/ui/view-url.ts)。

## 已采纳的决策

| 决策                         | 原因                                                                      |
| ---------------------------- | ------------------------------------------------------------------------- |
| 采用独立产品 App（原方案 C） | 产品 UI 有独立的浏览器与桌面构建，网站继续负责 SSR、SEO 和认证入口。      |
| Desktop 只消费静态产物       | 避免把另一套路由、主题、页面和查询组装进桌面工程。                        |
| 桌面请求直接到 API           | 早期实验确认 `views://mainview` 的请求来源与预检可用，无需主进程代理。    |
| 主进程使用 Bun               | 当前配置与工具链采用 Bun；Cottontail 仅作为早期实验记录，不是当前主进程。 |
| macOS 使用系统 WebView       | 当前没有启用 CEF；早期实验记录的 CEF 体积更大且新窗口事件不同。           |
| 延后桌面认证与原生能力       | 目前只保留宿主接口与登录占位，不引入未实现的会话交接或 preload 协议。     |

方案 A（Web 双构建）、方案 B（共享产品包）及早期方案 C 的部署讨论已移入[历史归档](./archive/desktop/README.md)。其中的配置和代码草图不作为当前实施指南。

## 验证记录与尚未完成的工作

整理前的 2026-10-24 实施记录记载：本机浏览器登录往返、App 两种构建、App 静态服务路径行为、桌面开发热更新与 macOS arm64 打包曾通过检查，也记录过根 `pnpm run check` 通过。Electrobun 的实验环境与观察保存在[桌面指南](../.agents/desktop.md)。这些是历史验证记录，不表示本次重新完成了这些环境验收或全仓检查。

当前仍需完成：

- Docker 中的独立 App 服务与 Web 同源挂载验收，以及真实生产域名下的 Clerk 会话共享。
- 桌面登录已实现但未端到端实测：refresh token 轮换、回调后窗口激活、未签名打包版的钥匙串弹框。
- 正式应用 identifier、版本与图标。当前配置仍是 `dev.tsu-stack.desktop.spike`、`0.0.0`。
- macOS 签名、公证、更新发布地址和跨平台 CI；Windows、Linux 及较旧 macOS 尚无完整验收记录。
- PWA、离线缓存与同步、preload 桥、原生菜单、托盘、通知和窗口状态保存均未实现，不应作为现有能力宣传。

2026-10-25 定向验证：本次涉及的 15 个文件经 Oxfmt 格式化并通过格式检查；直接提取当前 `getAppDevProxy` 函数运行的 35 个路径与配置边界用例通过，覆盖查询参数、尾斜杠、相邻路径、特殊字符和非挂载配置；`pnpm --filter @uni-stack/web run check`（`tsc --noEmit`）通过。当前及归档图文的本地链接与锚点也已核对。

本轮没有运行全仓检查、应用构建、完整测试套件或浏览器、容器、桌面交互验收。后续验证遵循[仓库工作流](../.agents/workflow.md)。
