# 变更日志

记录每批改动的内容、部署注意事项和已知问题。日期为提交日期。

## 2026-11-02：Todos 改用 TanStack DB Query Collection，移除 Electric

### 变更

- **App**：云端 todo collection 从 `electricCollectionOptions` 换成 `queryCollectionOptions`（`@tanstack/query-db-collection` 1.4.8，与 `@tanstack/db` 0.15.2 配套）。读取调用 `todo.list`；新增和修改写回服务端返回的行，删除后重新拉取列表。其他设备的修改在切回页面、重新联网或失效时拉取。
- **API**：新增 `todo.list`。`create`、`update` 返回存储后的行（重放的 create 返回已有行），`remove` 无返回值，不再返回 txid。
- **移除**：`/shape` 路由与代理、shape 注册表、`packages/core` 的 `sync`（`SHAPE_VERSIONS`、`TxidOutputSchema`）、`getCurrentTxid`、CORS 暴露的 `electric-*` 头、依赖 `@electric-sql/client` 和 `@tanstack/electric-db-collection`。

### 部署注意

- 三个 compose 文件去掉了 `electric` 服务和它的数据卷，Postgres 不再以 `wal_level=logical` 启动。
- Server 不再读取 `ELECTRIC_URL` 和 `ELECTRIC_SECRET`，可从部署环境删除。
- 已有数据库里 Electric 建的复制槽 `electric_slot_default` 和 publication 不会自动删除。不活跃的复制槽会让 Postgres 一直保留 WAL，部署后执行一次：`SELECT pg_drop_replication_slot('electric_slot_default');`、`DROP PUBLICATION IF EXISTS electric_publication_default;`、`ALTER TABLE todo REPLICA IDENTITY DEFAULT;`。

### 本次未验证

- 改动后没有跑类型检查、构建或测试，也没有实测 todo 的增删改。

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

提交前代码审查发现、尚未修复的问题，已逐条对照代码和依赖库源码核实。标"待确认"的机制成立，但要靠请求乱序或特定配置才会触发。

- **高**：shape 流没有配 `onError`（`apps/app/src/shared/api/shape-options.ts`）。任何一次 401 或其他 4xx（token 过期、电脑睡醒后 token 还没刷新）都会让 Electric 同步永久停止，直到刷新页面。首次同步就失败时，collection 进入错误状态，页面显示空列表，之后的新增会直接抛错。
- **高**：等 txid 超时（15 秒）被当成写入失败（`apps/app/src/entities/todo/lib/todo-collection.ts`）。最常见的触发是写入后 15 秒内切到别的标签页：Electric 在页面隐藏时暂停同步流，等不到 txid 就回滚并提示"已撤销"，但服务端其实已经写入，回到页面后数据又出现。Electric 慢或挂掉、上一条的同步流已停止、生产环境没配 `ELECTRIC_URL`（`/shape` 一直 503，页面一直转圈、服务器不报错）也一样。每次新增都生成新 id，用户重试会写出重复的 todo。
- **中**：Todos 页只处理异步失败。collection 处于错误状态时，新增会同步抛错，用户看不到提示，输入框也不清空（`apps/app/src/pages/todos/ui/todos-page.tsx`）。
- **中（待确认）**：写入没有按行排队。新建后马上删除或勾选、快速连点复选框时，请求可能乱序到达服务器，删掉的 todo 会重新出现，或勾选状态回跳。
- **中**：`/docs` 默认关闭后，网站导航和 App 里的 "API Docs" 链接默认 404。改动前 `/docs` 实际上不受开关控制，一直可访问。开关打开时，`/docs/`（带末尾斜杠）也会 404。
- **中**：`/shape` 的失败不留服务端记录：请求日志排除了 `/shape/**`，代理吞掉了连不上 Electric 的错误。
- **低**：`ELECTRIC_URL` 带路径前缀时前缀会被丢掉（`new URL("/v1/shape", ELECTRIC_URL)`）。
- **低（待确认）**：`timestamptz` 用 `new Date(value)` 解析（Electric 官方示例的写法）。如果 Electric 发的是 Postgres 文本格式（空格分隔、`+00` 时区），Safari 能否解析取决于引擎。
- **低**：在非 localhost 的纯 http 地址打开 web 版（比如局域网 IP）时，`crypto.randomUUID` 不存在，新增 todo 会抛错。可改用 `@tanstack/react-db` 导出的 `safeRandomUUID`。桌面端的 `views://` 是安全上下文，不受影响。
- **低（待确认）**：同一页面内切换账号时，`resetUserScopedCollections()` 清理仍被页面使用的 collection，页面会继续显示上一个账号的 todo。目前没有能触发的路径（没有启用 Clerk 多会话）。
- **低（潜在）**：桌面端 RPC 编解码只给普通对象和数组里的 Date 打标记。bigint 会让请求超时，NaN 变成 null，查询条件对象里的 Date 变成字符串。当前的 eager 模式和 `TodoRow` 用不到这些。
- **低**：Bun SQLite 没设 `busy_timeout`。另一个进程（比如数据库工具）持有写锁时，写入会立即报 `SQLITE_BUSY`，不会等待。
- **低**：桌面桥的类型在 `apps/app` 和 `apps/desktop` 各声明一份，两边改名时类型检查发现不了。桥没装上时会静默退回内存 collection，重启后数据丢失且没有提示。
- **低**：代理把 Electric 的 `cache-control: public` 原样转发，只靠 `Vary: Authorization` 防止串号。忽略 `Vary` 的 CDN 缓存可能把一个用户的数据返回给另一个用户。
- **清理项**：桌面端 driver 和持久化适配器里有从 Node 版带过来、没被用到的代码；`@tanstack/db` 的直接依赖没被导入；`maxLength={500}` 重复了 `packages/core` 里的标题上限；两个 chat 组件重复定义了 `ADDED_TEXT`；`apps/server/Dockerfile` 只给 Electric 变量加了 `ARG`，没加 `ENV`。

### 本次未验证

- commit 时 pre-commit 钩子跑的 `pnpm run check`（格式、lint、全部项目的类型检查）已通过。没有构建，也没有跑测试。
- 没有实测 Electric 端到端同步、桌面端 SQLite 桥和 Docker 部署。
