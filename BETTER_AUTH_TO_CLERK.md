# Better Auth 到 Clerk 接入说明

## 当前状态

Clerk 已成为 Web、Native、Extension 和 API 的唯一认证提供方。`packages/auth`、旧 `/auth/*` 路由、Better Auth 依赖和 `BETTER_AUTH_SECRET` 配置已移除，OpenAPI 只保留 Clerk Bearer 认证说明。

当前 Drizzle schema 已移除 `user`、`account`、`session`、`verification` 四张旧认证表及其关系定义，尚未添加业务表。数据库连接、健康检查和迁移能力继续保留。新增清理迁移负责按外键依赖顺序删除四张旧表；原有迁移及快照保持不变，保留已有数据库的升级路径。

各环境是否已完成删表，以该数据库实际应用的迁移记录为准。生产 Server 会在启动时执行待应用迁移，Compose 也有独立迁移服务，因此发布前必须确认目标库的数据处置和迁移进度。如果旧库尚未应用 `20260827094050_cloudy_argent`，其中的账号 issuer 回填可能因旧 OAuth 账号或重复身份而失败；应先处理这一前置迁移，不能修改历史迁移或伪造已应用记录来跳过。

当前开发约定见 [认证指南](.agents/auth.md)。下文保留此前接入过程的历史记录，其中“保留兼容入口”等描述不再代表当前运行时状态。

## 初次接入记录

本文档记录本项目这次将主登录体系从 Better Auth 切到 Clerk 的过程。

这次调整不是删除 Better Auth，而是让 `apps/web` 和 `packages/api` 的主认证链路使用 Clerk。Better Auth 的数据库表、`packages/auth` 包、以及 server 上的 `/auth/*` 兼容接口都保留。

## 目标

- Web 登录、注册、登录态读取、退出登录改用 Clerk。
- Web 调用 oRPC API 时携带 Clerk session token。
- API protected procedure 改为校验 Clerk bearer token。
- 保留 Better Auth 相关表和 `packages/auth`，避免破坏既有数据与兼容入口。
- 参考项目：`/Users/luz/code/neobeast/my-better-t-app`。

## 保留内容

以下内容没有移除：

- `packages/auth`
- Better Auth 相关 Drizzle schema / 数据表
- `apps/server/src/index.ts` 中的 `/auth/*`
- `apps/server/src/index.ts` 中的 `/auth/open-api/generate-schema`
- OpenAPI docs 中的 Better Auth `authCookie` security scheme

因此，目前项目形态是：

- 新的 Web 和 API 主认证：Clerk
- 旧的 Better Auth 能力：保留为兼容面

## 依赖调整

在 `pnpm-workspace.yaml` catalog 中新增：

- `@clerk/backend`
- `@clerk/tanstack-react-start`

在 `apps/web/package.json` 中：

- 新增 `@clerk/tanstack-react-start`
- 移除对 `@tsu-stack/auth` 的直接依赖

在 `packages/api/package.json` 中：

- 新增 `@clerk/backend`
- 新增 `@clerk/tanstack-react-start`
- 移除对 `@tsu-stack/auth` 的直接依赖

`pnpm-lock.yaml` 通过 `pnpm install` 更新。

## 环境变量调整

新增两个 Clerk 环境变量：

- `CLERK_SECRET_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY`

涉及文件：

- `packages/env/src/server/env.ts`
- `packages/env/src/web/env.server.ts`
- `packages/env/src/web/env.isomorphic.ts`
- `packages/env/.env.example`
- `.env.docker.example`
- `docker-compose.yaml`
- `docker-compose.coolify.yaml`
- `apps/web/Dockerfile`
- `apps/server/Dockerfile`
- `apps/web/vite.config.ts`
- `.github/README.md`

注意：

- `CLERK_SECRET_KEY` 只用于服务端和 TanStack Start middleware。
- `VITE_CLERK_PUBLISHABLE_KEY` 会暴露给浏览器，供 Clerk Provider 使用。
- 本地真实值需要写入 `packages/env/.env`，不要只依赖 example 文件。

## Web 端改动

### 1. 接入 Clerk middleware

在 `apps/web/src/start.ts` 中加入：

```ts
import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
```

并把 `clerkMiddleware()` 放入 `requestMiddleware`。

这样 TanStack Start 的 server function 和 route `beforeLoad` 可以读取 Clerk auth state。

### 2. 根组件包裹 ClerkProvider

在 `apps/web/src/routes/__root.tsx` 中使用：

```tsx
<ClerkProvider publishableKey={ENV_WEB_ISOMORPHIC.VITE_CLERK_PUBLISHABLE_KEY}>...</ClerkProvider>
```

原先 root route 中基于 Better Auth 的 `getAuthUserQueryOptions()` 预取被移除。Router context 也不再保存 Better Auth user，只保留 `queryClient`。

### 3. 建立 Clerk token bridge

新增文件：

- `packages/api/src/client/tanstack-start/clerk-auth.ts`

它保存一个来自 Clerk `useAuth().getToken` 的 getter：

```ts
setClerkAuthTokenGetter(getToken);
```

然后 `packages/api/src/client/tanstack-start/orpc.ts` 在浏览器侧发起 oRPC 请求时调用 `getClerkAuthToken()`，并写入：

```ts
Authorization: Bearer<token>;
```

这样 API server 可以用 Clerk 验证请求身份。

### 4. 登录和注册页改为 Clerk UI

以下文件从自维护 Better Auth 表单改为 Clerk prebuilt component：

- `apps/web/src/features/auth/ui/sign-in-form.tsx`
- `apps/web/src/features/auth/ui/create-an-account-form.tsx`

原来使用的内容包括：

- `authClient.signIn.email`
- `authClient.signUp.email`
- `useAuth`
- `getAuthUserQueryOptions`
- 自维护 email/password 表单

现在改为：

- `<SignIn />`
- `<SignUp />`

并保留站点 logo、terms/privacy 文案等外层 UI。

这里有一个 Clerk SDK 类型细节：当前安装的 `@clerk/tanstack-react-start` 支持 `path` 模式，但 `path` 和 `routing="hash"` 不能同时传。因此最终写法保留 `path`，不再传 `routing="hash"`。

Clerk 的 TanStack React Start SDK 在 `path` routing 下会使用登录页下面的内部子路径，例如 OAuth/social callback 会回到：

```text
/sign-in/sso-callback
```

因此自托管 `<SignIn />` / `<SignUp />` 时，不能只创建 index route，还需要给 Clerk 内部流程增加 TanStack Router catch-all route：

- `apps/web/src/routes/{-$locale}/(centered-layout)/(guest)/sign-in/$.tsx`
- `apps/web/src/routes/{-$locale}/(centered-layout)/(guest)/create-an-account/$.tsx`

这两个 route 继续渲染同一个 Clerk 组件，让 SDK 根据 `_splat` 去掉内部路径后识别真实挂载点 `/sign-in` 或 `/create-an-account`。

### 5. 登录页跳转路径处理

新增文件：

- `apps/web/src/features/auth/lib/clerk-urls.ts`

用途：

- 根据 `VITE_WEB_URL` 的 pathname 处理部署在子路径时的 Clerk path。
- 把本项目的 `redirect` search 参数带到 Clerk 登录/注册链接中。
- 登录或注册成功后，通过 `forceRedirectUrl` 跳回原目标页。

### 6. Route guard 改用 Clerk auth state

新增 server function：

- `apps/web/src/features/auth/api/clerk-auth-state.functions.ts`

它通过 `@clerk/tanstack-react-start/server` 的 `auth()` 返回：

- `isAuthenticated`
- `userId`

受保护路由：

- `apps/web/src/routes/{-$locale}/(root-layout)/(auth)/route.tsx`

改为在 `beforeLoad` 中读取 Clerk auth state。未登录时重定向到 `/sign-in`，并保留原目标地址到 `redirect` search。

访客路由：

- `apps/web/src/routes/{-$locale}/(centered-layout)/(guest)/route.tsx`

改为在已登录时直接重定向到 `redirect` 指向的目标页。

### 7. 导航栏、日志身份、Dashboard 改用 Clerk hooks

以下文件从 Better Auth hooks 切换到 Clerk hooks：

- `apps/web/src/features/navbar/ui/user-dropdown.tsx`
- `apps/web/src/features/navbar/ui/mobile-nav.tsx`
- `apps/web/src/shared/providers/logger-provider.tsx`
- `apps/web/src/routes/{-$locale}/(root-layout)/(auth)/dashboard/index.tsx`

主要替换：

- `useAuthSuspense()` -> `useAuth()` / `useUser()`
- `authClient.signOut()` -> Clerk `signOut()`
- Better Auth user 字段 -> Clerk `userId`、`user.fullName`、`user.username`、`user.primaryEmailAddress`、`user.imageUrl`

## API 端改动

### 1. Context 改为 Clerk auth

核心文件：

- `packages/api/src/lib/context/hono/create-context.ts`
- `packages/api/src/lib/context/types.ts`

原先逻辑：

```ts
auth.api.getSession({ headers });
```

现在改为：

```ts
const clerkClient = createClerkClient({
  publishableKey: ENV_SERVER.VITE_CLERK_PUBLISHABLE_KEY,
  secretKey: ENV_SERVER.CLERK_SECRET_KEY
});
```

然后对 Hono raw request 执行：

```ts
clerkClient.authenticateRequest(request, {
  authorizedParties: [new URL(ENV_SERVER.VITE_WEB_URL).origin]
});
```

最终 `OrpcContext` 变为：

```ts
{
  auth: { userId: string } | null;
  logger: RequestLogger;
  session: null;
}
```

`session` 目前保留为 `null`，目的是减少跨包接口震荡，同时明确 API 主认证已经不再依赖 Better Auth session。

### 2. Protected procedure 改为 Clerk userId

核心文件：

- `packages/api/src/lib/procedures/factory.ts`

原先检查：

```ts
context.session?.user;
```

现在检查：

```ts
context.auth?.userId;
```

OpenAPI security 也从：

```ts
authCookie;
```

改为：

```ts
clerkBearer;
```

### 3. oRPC client 同时支持 server/client 两种调用

核心文件：

- `packages/api/src/client/tanstack-start/orpc.ts`

Server 侧 direct router client：

- 使用 Clerk `auth()` 获取 `userId`
- 构造 `{ auth: { userId }, session: null }`

Browser 侧 RPCLink：

- 使用 token bridge 获取 Clerk token
- 设置 `Authorization: Bearer <token>`

### 4. Server 保留 Better Auth 兼容入口

核心文件：

- `apps/server/src/index.ts`

保留：

```ts
app.on(["POST", "GET"], "/auth/*", async (c) => auth.handler(c.req.raw));
```

新增或调整：

- CORS `allowHeaders` 加入 `Authorization`
- OpenAPI security schemes 加入 `clerkBearer`
- API 使用说明改成 protected endpoint 需要 Clerk bearer token
- Better Auth `/auth/*` 文档仍保留为 legacy compatibility

## 为什么没有使用 `@hono/clerk-auth`

这次 API 主入口是 oRPC handler，它需要统一通过 `createContext()` 给 RPC/OpenAPI handler 注入上下文。

`@hono/clerk-auth` 更适合直接挂在 Hono route middleware 上，然后在具体 Hono handler 中通过 `getAuth()` 读取身份。本项目 protected logic 在 oRPC procedure 层，因此最终采用 `@clerk/backend` 的 `createClerkClient().authenticateRequest()`，直接在 oRPC context 创建阶段完成验证。

## Supabase / 用户同步说明

这次实现没有引入 Supabase user sync。当前 API 已经能够稳定拿到 Clerk `userId`，后续如果要把 Clerk 用户同步到 Better Auth 表或业务用户表，可以在以下位置扩展：

- API request context：`packages/api/src/lib/context/hono/create-context.ts`
- 登录后 webhook：Clerk Dashboard 配置 user created / updated webhook
- 数据层：新增一个显式 `clerkUserId` 映射字段，避免把 Clerk id 硬塞进 Better Auth 原生 session 语义

推荐后续使用 Clerk webhook 做用户落库，而不是在每个 API request 中同步完整用户资料。API request 中最多做轻量的 user id upsert 或缓存检查。

## 验证记录

已执行：

```bash
CLERK_SECRET_KEY=sk_test_replace_with_real_key \
VITE_CLERK_PUBLISHABLE_KEY=pk_test_replace_with_real_key \
pnpm run check
```

结果：通过。

已执行：

```bash
CLERK_SECRET_KEY=sk_test_replace_with_real_key \
VITE_CLERK_PUBLISHABLE_KEY=pk_test_replace_with_real_key \
pnpm exec oxlint --type-aware --type-check apps packages
```

结果：通过。

已执行：

```bash
git diff --check
```

结果：通过。

已执行 server 打包：

```bash
CLERK_SECRET_KEY=sk_test_replace_with_real_key \
VITE_CLERK_PUBLISHABLE_KEY=pk_test_replace_with_real_key \
DATABASE_URL=postgresql://postgres:changeme@localhost:5432/tsu-stack \
BETTER_AUTH_SECRET=replace-with-at-least-32-characters \
SOURCE_COMMIT=local \
VITE_SERVER_URL=http://localhost:5000/server \
VITE_WEB_URL=http://localhost:3000/web \
pnpm --filter @tsu-stack/server run build
```

结果：通过。

已知情况：

- 在工具链迁移前的验证中，仓库检查曾因 `.agents/choice-flows.md` 的既有格式问题失败；迁移后的对应命令是 `pnpm run check`。
- 该格式问题与 Clerk 接入无关，所以本次没有修改该文档。
- server build 会提示 Better Auth 的可选 `@opentelemetry/api` 被外置，这是 Better Auth 兼容入口带来的非阻塞 warning。

## 运行前需要配置

在真实环境中配置：

```env
CLERK_SECRET_KEY=...
VITE_CLERK_PUBLISHABLE_KEY=...
```

同时需要在 Clerk Dashboard 中确认：

- Allowed origins 包含 `VITE_WEB_URL` 的 origin。
- Redirect URL / application URL 与本项目的 `/sign-in`、`/create-an-account` 路由匹配。
- 如果项目部署在子路径，例如 `/web`，需要确保 Clerk 的 redirect 允许该子路径。

## 当前认证链路

登录页：

```text
apps/web route -> Clerk SignIn / SignUp -> Clerk session
```

Web 调 API：

```text
Clerk useAuth().getToken()
  -> packages/api client token bridge
  -> oRPC RPCLink Authorization header
  -> Hono createContext()
  -> Clerk authenticateRequest()
  -> protectedProcedure context.auth.userId
```

Server side route guard：

```text
TanStack Start beforeLoad
  -> getClerkAuthState server function
  -> Clerk auth()
  -> redirect or allow route
```

Better Auth 兼容入口：

```text
apps/server /auth/*
  -> packages/auth auth.handler()
```

## Native / Extension 追加接入

本次继续新增两个 app：

- `apps/native`
- `apps/extension`

### Native

`apps/native` 使用 Expo Router 和 `@clerk/expo`：

- 根布局通过 `ClerkProvider` 注入 Clerk。
- 使用 `@clerk/expo/token-cache` 把 session token 缓存在 `expo-secure-store`。
- 登录、注册页使用 Clerk Expo hooks 实现 email/password 与 email code 验证。
- `utils/clerk-auth.ts` 保存 `useAuth().getToken`，`utils/orpc.ts` 在请求 API 时写入 `Authorization: Bearer <token>`。
- protected dashboard 调用当前 API 的 `orpc.private.data`。

新增 native 环境变量：

```env
EXPO_PUBLIC_SERVER_URL=...
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=...
```

运行：

```bash
pnpm run dev:native
```

### Extension

`apps/extension` 使用 WXT + React 和 `@clerk/chrome-extension`：

- popup 通过 `ClerkProvider`、`SignInButton`、`SignUpButton`、`UserButton` 处理 Clerk 登录态。
- background service worker 使用 `createClerkClient({ background: true })` 获取 fresh session token。
- extension 的 oRPC client 通过 `browser.runtime.sendMessage()` 向 background 请求 token，再发送 `Authorization: Bearer <token>`。
- popup 中展示 public health 状态和 protected API 返回值。

新增 extension 环境变量：

```env
WXT_SERVER_URL=...
WXT_CLERK_PUBLISHABLE_KEY=...
WXT_CLERK_FRONTEND_API=...
WXT_CLERK_SYNC_HOST=...
WXT_EXTENSION_PUBLIC_KEY=...
```

运行：

```bash
pnpm run dev:extension
```

### Extension authorized parties

API 端新增：

```env
CLERK_AUTHORIZED_PARTIES=chrome-extension://<stable-extension-id>
```

`packages/api/src/lib/auth/clerk-authorized-parties.ts` 会把 `VITE_WEB_URL` 的 origin 和 `CLERK_AUTHORIZED_PARTIES` 合并，供：

- Hono CORS `origin`
- Clerk `authenticateRequest(..., { authorizedParties })`

因此 extension 如果要调用 protected API，需要先配置稳定 CRX ID，并把对应 origin 加到 `CLERK_AUTHORIZED_PARTIES`。

## Native / Extension 验证记录

已执行：

```bash
pnpm install
pnpm --filter @tsu-stack/native run check
pnpm --filter @tsu-stack/extension run check
pnpm --filter @tsu-stack/api run typecheck
pnpm --filter @tsu-stack/env run typecheck
WXT_SERVER_URL=http://localhost:5000/server \
WXT_CLERK_PUBLISHABLE_KEY=pk_test_replace-with-your-clerk-publishable-key \
WXT_CLERK_SYNC_HOST=http://localhost:3000/web \
pnpm --filter @tsu-stack/extension run build
EXPO_PUBLIC_SERVER_URL=http://localhost:5000/server \
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_replace-with-your-clerk-publishable-key \
pnpm --filter @tsu-stack/native exec expo config --json
```

结果：通过。

已知情况：

- `pnpm peers check` 仍有既有依赖链 warning：Nitro 的旧 `srvx`、TanStack Zod adapter 的 Zod 3 peer 声明，以及 Expo 间接依赖的 `ws` / `utf-8-validate` 版本声明。Better Auth 已切换为同版本 stable adapter，Native 的 Expo / React Native 版本由 Expo compatibility check 校准。
- Clerk Chrome Extension build 会从 Clerk UI 依赖链生成较大的 chunks，并输出 `import.meta`/chunk size warning；WXT build 仍成功。
