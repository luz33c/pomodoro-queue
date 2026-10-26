# 变更日志

记录每批改动的内容、部署注意事项和已知问题。日期为提交日期。

## 2026-10-26：Electric 同步的 Todos、桌面端本地 SQLite、preview-ui

### 新增

- **Todos（`apps/app`）**：新页面 `/todos`，数据放在 TanStack DB collection 里。
  - 云端模式（web 宿主）：通过 Electric shape 读取，通过 oRPC 写入。写入返回 Postgres txid，前端等这个 txid 同步回来再确认乐观更新。
  - 本地模式（桌面宿主）：本地 collection，经 preload 桥存进桌面壳的 SQLite 文件，不需要登录。
- **Shape 代理（`apps/server`、`packages/api`）**：`GET /shape/:name/:version` 校验 Clerk Bearer token。表、列和 `owner_id = $1` 过滤都由服务端决定，客户端只能传 Electric 协议参数。
- **Todo 写接口**：`todo.create`（客户端生成 id，重放幂等）、`todo.update`、`todo.remove`，都返回 `{ txid }`。
- **共享契约（`packages/core`）**：`sync`（`SHAPE_VERSIONS`、`TxidOutputSchema`）和 `todo`（`TodoRowSchema` 及输入 schema）。
- **桌面端（`apps/desktop`）**：基于 `bun:sqlite` 的 SQLite driver 和持久化适配器（改写自 TanStack 的 Node 实现）、webview preload 桥 `window.tsuDesktop`、带 Date 标记的 RPC 编解码。
- **UI**：`packages/ui` 新增 chat 组件 `LoadingState`、`Thinking`、`ToolChips` 和基础组件 `HoverCard`。新应用 `apps/preview-ui`（`:3004`）展示这些组件和一个脚本化 demo。
- **部署**：compose 新增 `app` 和 `electric`（`electricsql/electric:1.8.1`）服务。

### 变更

- **Server**：`/docs` 只在 `ENABLE_OPEN_API_DOCS=true` 时提供；5xx 响应不再返回内部错误信息；日志上报用 `bodyLimit` 限制体积，也覆盖没有 Content-Length 的请求；CORS 允许 `X-Evlog-Source` 并暴露 `electric-*` 响应头。
- **App**：`AuthGate` 在本地模式下不要求登录，dashboard 未登录时自己显示桌面登录占位；未登录时隐藏退出按钮；错误页"重试"改用 `router.invalidate()`。
- **Web**：传给 Clerk 的路径带上当前 locale 前缀，修复非默认语言下登录卡片空白。
- **Native**：env 改为静态读取 `process.env.EXPO_PUBLIC_*`，release 构建可用；二次验证改为读取本次登录返回的 factor。
- **DB**：`createTodo` 接收客户端 id，冲突时不写入；新增 `getCurrentTxid()`。

### 部署注意

- Postgres 必须以 `wal_level=logical` 启动（三个 compose 文件都已改）。
- Server 新增环境变量 `ELECTRIC_URL` 和 `ELECTRIC_SECRET`。生产环境不设 `ELECTRIC_URL` 时 `/shape` 返回 503。Electric 服务要配同一个 `ELECTRIC_SECRET`。
- Electric 第一次用到 `todo` 表时，会把它加入 publication 并设 `REPLICA IDENTITY FULL`，这要求它的数据库角色拥有该表。
- 桌面端调用 API 时，需要把 `views://mainview`（打包版）和 `http://localhost:3003`（开发版）加入 `CLERK_AUTHORIZED_PARTIES`。

### 已知问题

提交前代码审查发现、尚未修复的问题。标"待确认"的机制成立，但触发条件还没核实完。

- **高**：shape 流没有配 `onError`（`apps/app/src/shared/api/shape-options.ts`）。任何一次 401 或其他 4xx（token 过期、电脑睡醒后 token 还没刷新）都会让 Electric 同步永久停止，直到刷新页面。之后的写入在服务端成功，但前端等 txid 超时（15 秒）后回滚并提示"已撤销"，用户重试会生成重复的 todo。
- **高**：等 txid 超时被当成写入失败（`apps/app/src/entities/todo/lib/todo-collection.ts`）。Electric 慢或挂掉、或者生产环境没配 `ELECTRIC_URL`（`/shape` 一直 503）时，同样会出现"服务端已写入、前端显示撤销"和重复数据。没配 `ELECTRIC_URL` 时 Todos 页一直转圈，服务器也不报错。
- **中**：Todos 页只处理异步失败。collection 处于错误状态、要改的行已被别的设备删除等情况下，新增、勾选、删除会同步抛错，用户看不到提示，输入框也不清空（`apps/app/src/pages/todos/ui/todos-page.tsx`）。
- **中（待确认）**：同一用户会话内切换账号时，`resetUserScopedCollections()` 清理仍被页面使用的 collection，页面可能继续显示上一个账号的 todo。
- **中（待确认）**：写入没有按行排队。新建后马上删除或勾选、快速连点复选框时，请求可能乱序到达服务器，删掉的 todo 会重新出现，或勾选状态回跳。
- **中**：`/docs` 默认关闭后，网站导航和 App 里的 "API Docs" 链接默认 404。
- **中**：`/shape` 的失败不留服务端记录：请求日志排除了 `/shape/**`，代理吞掉了连不上 Electric 的错误。
- **低**：`ELECTRIC_URL` 带路径前缀时前缀会被丢掉（`new URL("/v1/shape", ELECTRIC_URL)`）。
- **低（潜在）**：桌面端 RPC 编解码只给普通对象和数组里的 Date 打标记。bigint 会让请求超时，NaN 变成 null，查询条件对象里的 Date 变成字符串。目前 `TodoRow` 用不到这些类型。
- **低**：Bun SQLite 没设 `busy_timeout`。第二个进程打开同一个数据库文件时，写入会立即报 `SQLITE_BUSY`，不会等待。
- **低**：桌面桥的类型在 `apps/app` 和 `apps/desktop` 各声明一份。桥没装上时会静默退回内存 collection，重启后数据丢失且没有提示。
- **低**：代理把 Electric 的 `cache-control: public` 原样转发，只靠 `Vary: Authorization` 防止串号。忽略 `Vary` 的 CDN 缓存可能把一个用户的数据返回给另一个用户。
- **清理项**：桌面端 driver 和持久化适配器里有从 Node 版带过来、没被用到的代码；`@tanstack/db` 的直接依赖没被导入；`maxLength={500}` 重复了 `packages/core` 里的标题上限；两个 chat 组件重复定义了 `ADDED_TEXT`；`apps/server/Dockerfile` 只给 Electric 变量加了 `ARG`，没加 `ENV`。

### 本次未验证

- 除 commit 时 pre-commit 钩子跑的 `pnpm run check` 外，没有构建或跑测试。
- 没有实测 Electric 端到端同步、桌面端 SQLite 桥和 Docker 部署。
