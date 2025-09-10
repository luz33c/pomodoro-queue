# Pomodoro-Queue 项目调研报告

## 1. 统一 .env 配置的方案

**当前环境变量现状：** 该 Turbo monorepo 项目在不同子工程下各有独立的 `.env` 文件，而非在仓库根目录统一管理。例如：Web 前端 (`apps/web`) 使用 `.env.local`，移动端 Expo (`apps/native`) 使用 `.env`，后端 Convex (`packages/backend`) 使用 `.env.local`。这种分散配置导致本地开发需要在多个目录放置配置，增加了维护成本。特别是 Convex 开发服务器要求在 `packages/backend/.env.local` 提供变量（如 `CLERK_JWT_ISSUER_DOMAIN` 等），无法直接使用根目录 `.env`。

**方案目标：** 在项目根目录集中管理一个 `.env` 文件，方便设置和维护所有环境变量，并使各子项目自动加载该文件中的配置。这样可避免重复配置，符合 monorepo 最佳实践。

**可行方案：**

* **方案 A：使用 dotenv CLI 实现全局加载** – 利用库 **dotenv-cli** 或类似工具，在运行开发/构建脚本时预先加载根目录的 `.env` 文件，然后再启动 Turbo 命令。这一方案在许多 monorepo 项目中实践良好。具体步骤：

  1. **安装 dotenv-cli：** 在根目录添加开发依赖 `dotenv-cli`（使用 Bun：`bun add -D dotenv-cli`）。
  2. **配置启动脚本：** 修改根 `package.json` 的脚本命令，在执行 `turbo` 之前调用 dotenv。例如，将`"dev": "turbo dev"`改为：

     ```json
     {
       "scripts": {
         "dev": "dotenv -e .env -- turbo dev",
         "build": "dotenv -e .env -- turbo build"
       }
     }
     ```

     这样运行 `bun dev` 时，会由 dotenv-cli 加载根`.env`中的变量，然后再启动 Turborepo 的并行任务。子应用启动时即可从进程环境中获得这些变量。无需每个子项目单独配置 .env 文件。
  3. **各子项目使用环境变量：**

     * **Next.js 应用 (apps/web)：** Next 开发服务器会从进程环境读取变量（Next 默认也会加载 `.env.local`，但由于我们已用dotenv预载，无需该文件）。确保公开变量加前缀，如 `NEXT_PUBLIC_`（目前使用的 Clerk 和 Convex URL 前缀为 EXPO\_PUBLIC，对 Next 来说等效于NEXT\_PUBLIC）。
     * **Expo 应用 (apps/native)：** Expo CLI 可读取环境变量，Expo SDK 对 `EXPO_PUBLIC_*` 前缀的变量会注入客户端。因此通过 dotenv 预加载后，`apps/native` 中的代码（或配置）可直接访问这些变量。可以移除 `apps/native/.env`，转而使用根 `.env`（同时保留 `.env.example` 供参考）。
     * **Convex 后端 (packages/backend)：** 运行`bun dev:server`会执行 `convex dev` 脚本。Convex CLI 会继承由 dotenv 预加载的环境变量，因此能获取如 Clerk Issuer 等配置。如果 Convex CLI 对 `.env.local` 有特殊依赖，我们有两种选择：其一是保持在 `packages/backend/` 放置一个 `.env.local` 链接或拷贝（可用符号链接将根 `.env` 映射为 `.env.local`）；其二是直接依赖进程环境（据实践，Convex 在 dev 模式下也会读取进程中的 `process.env`，因此 dotenv 预加载已覆盖这一需求）。出于稳妥，可以在开发环境建立一个符号链接 `packages/backend/.env.local -> ../../.env`，确保 Convex CLI 始终读取最新的根配置。

* **方案 B：Turborepo 全局环境配置** – Turborepo 支持在 `turbo.json` 中定义 `globalEnv` 或 `globalDependencies` 来影响任务缓存。不过这主要用于缓存，不直接负责注入变量值。因此，我们仍需借助方案 A 或手动导出环境变量。另一种做法是利用 `env-cmd` 等工具实现类似 dotenv 的效果。总体思路一致：在启动命令前载入根 `.env`。

**推荐方案：** 方案 A 即“dotenv 预加载 + 单一 .env”是较优雅的做法，符合业界最佳实践。这种方式简单可靠，不修改框架本身行为，且易于团队理解。配置完成后，开发者只需在根目录维护一个 `.env` 文件，包含例如：

```dotenv
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=...(Clerk 前端发布钥)
EXPO_PUBLIC_CONVEX_URL=...(Convex 云端URL)
CLERK_JWT_ISSUER_DOMAIN=...(Convex 验证用Issuer)
```

上述键名覆盖了 web 与移动端必需的变量，也包括后端需要的 Clerk Issuer 域。加载后各部分均可通过 `process.env.KEY` 访问。

**注意事项：** 更新脚本后请运行 `bun dev` 验证各服务正常启动并获取到变量。例如，在 `apps/web` 内打印 `process.env.EXPO_PUBLIC_CONVEX_URL` 应有值。同样，Expo 应用通过 `Constants.expoConfig.extra` 或直接 `process.env`（配置了 babel plugin）获取变量值，也应成功。Convex CLI 若缺少变量会在启动时警告，应确认无误后再移除冗余的 `.env.local` 文件。

通过此方案，可在 monorepo 根实现对环境配置的一处管理，减少重复，提高开发体验。

---

## 2. 浏览器插件架构与严格休息暂停功能

**浏览器扩展架构概览：** `apps/browser-extension` 是基于 Plasmo 的 Chrome 扩展，实现番茄钟定时及强制休息功能。架构上分为**后台脚本**和**前台界面**两部分：

* **后台脚本 (background)**：负责番茄钟核心逻辑和 Chrome API 交互。`src/background/index.ts` 中维护了番茄钟的状态 (`PomodoroState`)，包括当前阶段（专注/短休/长休）、计时器、暂停等。后台使用 `chrome.alarms` 定时下一个阶段结束；并在定时器触发或用户操作时，更新状态存储到浏览器 `Storage (local)`，以及通过消息或存储触发前端 UI 刷新。后台还监听 Chrome 浏览器事件，实现“严格模式休息”的标签管控，如：

  * **休息页控制**：注册 `chrome.tabs.onActivated` 等事件，当检测到严格模式下用户激活非休息页标签时，自动将焦点拉回到休息页面。类似地，监听窗口焦点变化、标签创建和更新事件，在休息阶段一律把用户界面重定向到休息提示页，防止偷偷工作。
  * **强制休息页面管理**：通过 `beginStrictBreak()` 和 `endStrictBreak()` 控制休息页的创建和关闭。严格模式开始休息时，后台会在每个窗口打开或激活一个休息页（特殊的扩展页显示倒计时）。结束休息或退出严格模式时，后台脚本关闭所有该休息提示页。后台用 `breakTabIdsByWindow` 映射跟踪各窗口中的休息页，以便在事件中判断和操作。
  * **遮罩模式**：如果未开启严格模式 (`strictMode=false`)，休息阶段不强制切页，而是通过 `showOverlayOnAllOpenTabs()` 向所有现有页面插入一层半透明遮罩。这通过 Chrome Scripting API 将 content script 注入所有 HTTP 标签页，实现休息提醒但不锁定页面的效果。

* **前台界面 (UI)**：包括**浏览器操作弹窗 (popup)**和**休息页面 (Break Page)**。

  * **主弹窗界面**：由 `popup.tsx` 加载，包含计时器显示和控制按钮，以及历史记录和设置等组件。核心组件有 `PomodoroTimer`（展示倒计时和开始/暂停/恢复/跳过按钮）和 `HistoryList`（显示当前番茄工作循环的历史记录）。用户点击“开始”时，若当前没有运行，则弹出 `CreateQueueModal` 让用户设定一次番茄工作(session)的参数（专注/休息时长等）。开始后，popup 界面通过 `usePomodoro` hook 订阅后台状态存储的变化，实时更新进度和时间。
  * **休息页界面**：当进入休息阶段且严格模式开启时，后台在新标签打开 `tabs/break.html`，对应 React 组件 `BreakPage`。该页面全屏显示休息提示（咖啡杯图标、呼吸引导等）和一个隐藏的**暂停控制**按钮。休息页同样通过 `usePomodoro` hook 读取剩余时间 (`mmss`)，并提供 **暂停/继续** 按钮让用户可以在休息计时中暂停或恢复。另外，休息页检测后台存储 `breakLastForcedAt` 字段，以在每次用户被强制拉回时闪烁提示，提醒用户“休息模式已启用”。当后台检测到已不在休息状态（例如用户点了“跳过休息”或计时结束），休息页会自我关闭。

**架构合理性分析：** 整体来看，该架构清晰地将**状态控制逻辑**与**UI呈现**解耦：后台作为单一数据源，通过 Chrome 存储和消息与前端通信，前端组件通过 hook 从存储订阅状态更新，保证了 Web UI 和后台逻辑的一致性。这种模式在浏览器扩展中较常见，可类比 Redux 存储在 background，UI 通过订阅获取。**严格休息模式**的实现也较完善，利用浏览器事件机制拦截用户操作，强制聚焦休息页。用 content script 遮罩实现非严格模式的休息提醒，则兼顾用户体验和技术可行性。代码中以 “Mark: break control” 标记了各关键步骤，让人容易定位强制休息相关逻辑，架构清晰明了。多窗口、多标签的处理也都有考虑（如对每个窗口打开休息页并用 Map 跟踪）。唯一复杂之处在于**暂停休息**的处理，目前存在改进空间（见下）。总体而言，架构符合 Chrome 扩展的惯用模式，逻辑清晰，模块职责分明，易于维护。

**“休息阶段暂停”需求分析：** 当前实现允许用户在休息页点击暂停按钮，但由于严格模式的逻辑没有把“暂停”视为特殊状态，实际效果是**计时暂停了，然而用户仍被锁定在休息页**，无法利用暂停时间浏览其他页面。这是因为后台 `shouldEnforce()` 函数仅根据是否严格模式和当前阶段是否休息来决定是否强制切回休息页；并未排除暂停的情形，导致即便计时暂停，`shouldEnforce()` 依然返回 true，扩展继续拦截标签切换。这样的设计在严格休息场景下略显死板，不够人性化。允许**休息计时暂停时暂时解除页面锁定**，能提高用户体验：例如用户临时有紧急事务，需要中断休息去处理，那么暂停休息计时并恢复浏览权限是合理的。

**实现方案：** 我们可以对严格模式的判定和暂停逻辑做一些调整，使“休息暂停不强制停留休息页”成为可能：

1. **修改严格模式判定逻辑：** 在 `strict-break.ts` 中，调整 `shouldEnforce()` 函数的返回条件，加入对 `paused` 状态的判断。当计时已暂停时，返回 false，停止强制。代码修改如下：

   ```diff
   - return Boolean(s?.config?.strictMode && (s?.phase === "short" || s?.phase === "long"))
   + return Boolean(s?.config?.strictMode && !s?.paused && (s?.phase === "short" || s?.phase === "long"))
   ```

   这样，一旦后台状态 `paused=true`（无论专注或休息），各个 `chrome.tabs` 事件监听中调用 `shouldEnforce()` 时都会得到 false，不再执行强制拉回操作。换言之，暂停时用户可以自由浏览别的标签页，扩展不会干预。

2. **暂停时关闭休息页：** 除了停止拦截，新开标签的休息页最好也关闭或隐藏，否则用户仍然留在休息页界面。可以在后台的 `pauseTimer()` 实现中加入一行，在暂停休息时直接关闭休息页面：

   ```ts
   export async function pauseTimer() {
     const s = await storage.get(STORAGE_KEY)
     if (!s?.running || s.paused) return
     // ... 将当前状态设为 paused ...
     await storage.set(STORAGE_KEY, { ...s, paused: true, pausedAt: Date.now() })
     await chrome.alarms.clear(PHASE_ALARM)
     if (s.phase === "short" || s.phase === "long") {
       await endStrictBreak() // 暂停时关闭 Break 页面
     }
   }
   ```

   这段逻辑在用户点击暂停且当前处于休息阶段时，调用我们前述的 `endStrictBreak()` 方法关闭所有休息页标签。由于我们也修改了 `shouldEnforce()` 判定，关闭后即使用户重新打开其他页面，扩展也不会再跳回休息页。

3. **恢复时重新开启休息页：** 相应地，在用户点击恢复时需要重新进入严格休息。可在 `resumeTimer()` 中检测如果当前配置是严格模式且阶段属于休息，则调用 `beginStrictBreak()` 重新打开休息页：

   ```ts
   export async function resumeTimer() {
     const s = await storage.get(STORAGE_KEY)
     if (!(s?.running && s.paused)) return
     // ...恢复计时...
     await storage.set(STORAGE_KEY, { ...s, paused: false })
     if (s.config?.strictMode && (s.phase === "short" || s.phase === "long")) {
       await beginStrictBreak() // 恢复休息计时，重新打开 Break 页面
     }
   }
   ```

   由于恢复时计时器继续，且 `shouldEnforce()` 也重新允许强制，此时我们确保休息页再次出现，提醒用户返回休息状态。

以上改动使得**暂停休息**具备实质意义：暂停后扩展不再强制保留休息界面，用户可暂时离开；而一旦恢复休息计时，扩展又恢复原有的强制休息行为。需要注意，这一改变稍微削弱了严格模式的“强制”程度（用户可以通过暂停来绕过休息锁定），但给予了用户必要的灵活性，属于产品取舍。我们可以在文档或提示中说明：“严格模式下，暂停计时将临时解除页面限制”。

实施该方案后，建议充分测试：在严格模式休息时点击暂停，应看到休息页关闭，且扩展图标计时暂停；此时切换标签不会被拉回。再点击恢复，应重新打开休息页并倒计时继续。确认上述流程正常后，严格模式的暂停功能即算优化完成。

---

## 3. 第二阶段（任务驱动）技术实现指南

**需求背景：** 第一阶段产品（PRD\_v1：“自由队列”）实现了不绑定具体任务的番茄钟循环，用户可以自由开始番茄工作，并记录历史。但根据 PRD\_v2（“任务驱动 – 今日任务”）的设想，应用将引入“**今日待办任务**”列表，让番茄钟与具体任务关联起来。用户可以在每天开始时添加当日任务清单，并在开始番茄时选择要专注的任务。番茄钟将围绕任务运转，如完成专注后提示任务完成等。这一阶段旨在提升番茄工作的目的性和计划性。

**总体思路：** 在现有扩展基础上，引入**任务管理模块**，包括任务的数据结构、UI 展示，以及与番茄计时流程的交互。主要改动集中在前端界面和部分后台逻辑，后端暂不考虑（数据可先存在本地）。下面将按模块详细说明实现方案，并拆解开发步骤，确保逐步迭代、方便验收。

### 3.1 数据模型与存储

首先扩展应用的状态模型，加入任务相关的数据结构。

* **任务类型定义：** 在 `apps/browser-extension/src/model/pomodoro/types.ts` 中新增一个类型定义，例如：

  ```ts
  export type PomodoroTask = {
    id: string
    title: string
    completed: boolean
  }
  ```

  每个任务包含唯一 `id`（字符串），任务内容 `title`，以及是否完成 `completed`。任务完成状态用于在 UI 上打勾或划线。ID 可采用现有类似历史记录 ID 的生成策略：比如用时间戳和随机片段组合确保唯一性（可复用 `genId()` 逻辑）。
  此外，定义一个任务列表存储的键名，如：

  ```ts
  export const TASKS_KEY = 'pomodoroTasks'
  ```

  这样我们在 Storage 中可以通过该键读取/保存任务数组。

* **当前任务指示：** 为使后台知道当前正在进行的任务，我们在番茄钟状态 `PomodoroState` 中添加一个可选字段：

  ```ts
  export type PomodoroState = {
    // ...原有字段...
    currentTaskId?: string
  }
  ```

  该字段用于记录当前专注阶段所关联的任务 ID（如果有的话）。在非专注阶段或未选择任务时可以是 `undefined`。更新默认初始状态时也将其置为空。

通过上述修改，后台状态将包含任务的信息，但任务列表本身我们不放入 `PomodoroState`，而是单独存在 Storage 指定键下。这符合单一职责：PomodoroState 管理计时循环，任务列表作为独立数据源。

### 3.2 前端界面：任务列表 UI

有了数据结构，接下来实现任务列表的界面，以支持用户查看今日任务、添加新任务、标记完成，并启动番茄计时。我们计划将任务列表整合到弹窗主界面中，在“任务模式”下替代原来的历史记录列表。具体步骤：

* **任务列表组件：** 新建组件文件 `apps/browser-extension/src/components/pomodoro/TaskList.tsx`，用于渲染任务列表。UI 设计遵循现有风格（Tailwind + shadcn/UI 组件）。该组件主要包含：

  * 一个添加任务的输入框和按钮，允许用户输入任务名称后点击“添加”。
  * 列出当前任务清单，每条任务显示任务标题、完成状态（复选框或 ✓ 图标）以及一个“开始专注”按钮。未完成任务正常显示，已完成任务以浅色或删除线标识。
  * 可以参考 HistoryList 的结构来布局。每个任务项可使用 Card 容器，内部是任务名和操作按钮。

  **数据获取：** 利用 Plasmo 提供的 `useStorage` Hook 直接订阅任务列表存储。示例：

  ```ts
  import { Storage, useStorage } from '@plasmohq/storage/hook'
  const localStorage = new Storage({ area: 'local' })
  const [tasks = [], setTasks] = useStorage<PomodoroTask[]>({
    key: TASKS_KEY,
    instance: localStorage
  })
  ```

  这样 `tasks` 会实时同步 Storage 中 `pomodoroTasks` 的值，`setTasks` 可以用于更新任务列表并持久化。

  **添加任务功能：** 在组件顶部放置一个文本输入框 (`<Input>`) 和“添加”按钮 (`<Button>`)。用户输入任务名称后，点击添加时触发处理函数：

  ```ts
  const handleAddTask = () => {
    const title = inputValue.trim()
    if (!title) return
    const newTask: PomodoroTask = {
      id: generateId(),
      title,
      completed: false
    }
    setTasks([...tasks, newTask]) // 添加并更新 Storage
    setInputValue('') // 清空输入框
  }
  ```

  其中 `generateId()` 可以使用我们在后台相同的 ID 生成逻辑，保证任务 ID 唯一。添加后 `tasks` 状态会自动更新并持久保存到 local storage。

  **展示任务列表：** 遍历 `tasks` 数组，渲染每个任务项：

  ```tsx
  {tasks.map((task) => (
    <Card key={task.id} className="flex items-center justify-between p-3">
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => handleToggleComplete(task.id)}
        />
        <span className={`ml-2 ${task.completed ? 'line-through text-white/50' : 'text-white'}`}>
          {task.title}
        </span>
      </div>
      {!task.completed && (
        <Button onClick={() => handleStartTask(task.id)} size="sm">
          ▶ 专注
        </Button>
      )}
    </Card>
  ))}
  ```

  上述伪代码中：

  * 勾选框绑定 `handleToggleComplete(task.id)`，用于切换任务完成状态。
  * 完成的任务不显示“专注”按钮（因为已完成无需再专注），未完成任务才显示开始按钮。
  * 任务标题根据完成状态添加删除线和透明度样式。

  **任务完成切换：** `handleToggleComplete(id)` 实现为：

  ```ts
  const handleToggleComplete = (taskId: string) => {
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)))
  }
  ```

  这样点选复选框即可更新任务完成状态并保存。不完成的任务用户也可随时标记完成。

  **开始专注按钮：** 点击某任务的“专注”▶按钮时，调用 `handleStartTask(task.id)`，其逻辑是通过 `usePomodoro` Hook 调用后台开始计时，但要传递任务 ID：

  ```ts
  const { start } = usePomodoro()
  const handleStartTask = async (taskId: string) => {
    await start('focus', taskId)
  }
  ```

  注意，我们需要修改 `usePomodoro` Hook 和后台消息 handler 以支持传任务 ID，这在后文 **后台逻辑调整** 部分详述。

* **集成任务列表到主界面：** 在 `PomodoroHome.tsx` 中，原先渲染的是 `PomodoroTimer` + `HistoryList`。现在我们希望在“任务模式”启用时显示任务列表，非任务模式则仍显示历史。可以这样修改：

  ```tsx
  import { usePomodoro } from '@/hooks/pomodoro/usePomodoro'
  import { TaskList } from './TaskList'
  // ...
  export function PomodoroHome({ onOpenSettings }) {
    const { state } = usePomodoro()
    const enableTaskMode = state?.config.enableTask ?? false
    return (
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="flex-shrink-0 p-4">
          <PomodoroTimer onOpenSettings={onOpenSettings} />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-4 pb-4">
          {enableTaskMode ? <TaskList /> : <HistoryList />}
        </div>
      </div>
    )
  }
  ```

  这样，当任务模式开启时，用户在弹窗中将看到**今日任务列表**（及添加输入框），而非历史记录。反之，普通模式下界面保持不变。

* **调整控制按钮逻辑：** 在任务模式下，番茄工作的启动方式与自由模式不同：用户应从任务列表点击“专注”来启动，而不是直接点击顶部的“开始”按钮，因为任务模式下开始必须关联任务。因此我们需要防止两种开始方式冲突：

  * `PomodoroTimer` 组件中原有的“开始”按钮：只有在 `!running` 且当前没有运行计时时显示。我们应在任务模式启用时隐藏或禁用该按钮，避免用户绕过任务列表启动。可以修改那段 JSX：

    ```tsx
    {!running && !enableTaskMode && (
      <Button onClick={() => setCreateModalOpen(true)}>{t('buttonStart')}</Button>
    )}
    ```

    其中 `enableTaskMode` 可通过 `const enableTaskMode = state?.config.enableTask` 在 PomodoroTimer 内获取（通过 usePomodoro）。这一改动确保任务模式时顶部不会出现 Start 按钮。用户需要通过任务列表中的“专注”按钮启动计时。
  * `CreateQueueModal` 弹窗：由于任务模式不使用自由队列概念，我们可以在任务模式下**直接跳过**这个弹窗。当用户点击任务的开始时，我们将以默认配置开始一个专注，不再弹出设置窗口。因此，当任务模式启用时，可以不再调用 `setCreateModalOpen(true)`。实际上，通过上一步隐藏 Start 按钮，CreateQueueModal 就不会再被触发了（因为用户不会点到）。如果仍有入口，比如可能有人从设置面板启用，则可以在 `handleStartTask` 中直接调用 `start` 而非先 open modal。

至此，前端任务列表界面和交互基本完成。简单总结一下任务模式下用户流程：
用户打开扩展弹窗 → 看到今日任务列表 → 输入添加若干任务 → 点击某任务的“▶专注”按钮 → 计时开始，弹窗顶部显示倒计时，任务列表仍可见当前任务正在进行。任务完成后用户可手动勾选完成，或继续下一任务。

### 3.3 后台逻辑调整

前端接入任务后，还需要让后台计时逻辑识别和利用这些任务信息，包括**启动计时时记录所选任务**、**计时结束记录任务标题到历史**等。具体改造如下：

* **支持带任务 ID 启动：** 扩展消息机制 `pomodoro.start` 目前只接受阶段参数。我们将其扩展，使前端可以传入任务 ID，后台据此设置当前任务。

  1. **消息类型修改：** 在 `background/messages/pomodoro.start.ts` 中修改 RequestBody 定义：

     ```ts
     export type RequestBody = { phase?: PomodoroPhase; taskId?: string }
     ```

     这样消息可附带一个可选的 `taskId` 字段。对应地，前端 `usePomodoro` 的 `start` 方法也调整签名：

     ```ts
     // usePomodoro.ts
     start: (phase: PomodoroPhase = 'focus', taskId?: string) =>
       sendToBackground<{ phase?: PomodoroPhase; taskId?: string }, { ok: true }>({
         name: 'pomodoro.start',
         body: { phase, taskId }
       })
     ```

     （TypeScript 类型也同步修改，以免报错）。前端调用如 `start('focus', taskId)` 即可把任务 ID 发送给后台。

  2. **后台处理任务 ID：** 在 `pomodoro.start.ts` 的 handler 中，提取 taskId 并传递给核心启动函数：

     ```ts
     const { phase = 'focus', taskId } = req.body
     await startPhase(phase, taskId)
     res.send({ ok: true })
     ```

     随后我们修改后台 `startPhase` 函数签名为 `startPhase(phase: PomodoroPhase, taskId?: string)`，以便接受任务参数。

  3. **设置 currentTaskId：** 在 `background/index.ts` 里的 `startPhase` 实现中，当开始一个 **专注 (focus)** 阶段时，将 `PomodoroState.currentTaskId` 设置为传入的任务 ID。修改如下：

     ```ts
     export async function startPhase(phase: PomodoroPhase, taskId?: string) {
       const s = (await storage.get<PomodoroState>(STORAGE_KEY)) ?? INITIAL_STATE
       const now = Date.now()
       if (!s.running || s.phase === 'idle') {
         await ensureCurrentQueue(now)
       }
       const next: PomodoroState = {
         ...s,
         phase,
         running: true,
         startedAt: now,
         endsAt: calcEndsAt(now, phase, s.config),
         paused: false,
         pauseAccumMs: 0,
         currentTaskId: phase === 'focus' ? taskId ?? undefined : undefined
       }
       await storage.set(STORAGE_KEY, next)
       await schedulePhaseEndAlarm(next)
       notifyPhase(phase).catch(() => {})
       // ...严格模式处理...
     }
     ```

     逻辑解释：如果启动的是专注阶段且提供了 taskId，则记录该 taskId；如果启动的是休息或 idle 阶段，或没有 taskId，则确保 currentTaskId 为 undefined（休息时没有当前任务）。以上修改使后台知道“当前专注在某个任务上”。

* **历史记录记录任务:** 我们希望在任务驱动模式下，历史记录中专注项显示具体任务名称，而不是一律显示“专注”。为此，在生成历史记录时需区别对待：

  * **番茄周期自然结束（计时器 Alarm）：** `chrome.alarms.onAlarm` 监听处理阶段切换。当一个阶段结束时，如果刚结束的是专注阶段，我们会调用 `pushHistory` 记录历史。目前代码里，`title` 对于专注阶段是固定取“专注”。我们要改为：如果该专注有绑定任务（即 `state.currentTaskId` 存在），则取对应任务的标题作为 title：

    ```diff
    const title =
    -  state.phase === 'focus'
    -    ? chrome.i18n.getMessage('phaseFocus')
    +  state.phase === 'focus'
    +    ? (state.currentTaskId
    +         ? (await getTaskTitleById(state.currentTaskId)) || chrome.i18n.getMessage('phaseFocus')
    +         : chrome.i18n.getMessage('phaseFocus'))
         : state.phase === 'short'
           ? chrome.i18n.getMessage('phaseShortBreak')
           : chrome.i18n.getMessage('phaseLongBreak')
    ```

    这里我们假设实现一个辅助函数 `getTaskTitleById(id): Promise<string | undefined>`，从 Storage 的任务列表中查找任务并返回其标题。实现上，后台可以直接使用 Storage 获取：

    ```ts
    async function getTaskTitleById(id: string): Promise<string | undefined> {
      const tasks = await storage.get<PomodoroTask[]>(TASKS_KEY)
      return tasks?.find((t) => t.id === id)?.title
    }
    ```

    有了任务标题，就用它替换默认的“专注”文字。如果找不到任务（理论上不太会发生，除非任务被删），则仍使用通用“专注”。

  * **手动停止番茄 (Stop)**：用户点击“停止”按钮时，后台 `stopAll()` 会终止当前循环并记录当前阶段到历史。我们需要同样处理正在进行的专注任务：

    ```diff
    if (s?.running && s.phase !== 'idle' && s.startedAt) {
      const endedAt = Date.now()
    - const title = s.phase === 'focus'
    -   ? chrome.i18n.getMessage('phaseFocus')
    + let title
    + if (s.phase === 'focus') {
    +   title =
    +     s.currentTaskId
    +       ? (await getTaskTitleById(s.currentTaskId)) || chrome.i18n.getMessage('phaseFocus')
    +       : chrome.i18n.getMessage('phaseFocus')
    + } else if (s.phase === 'short') {
    +   title = chrome.i18n.getMessage('phaseShortBreak')
    + } else if (s.phase === 'long') {
    +   title = chrome.i18n.getMessage('phaseLongBreak')
    + }
      await pushHistory({ id: genId(), phase: s.phase, title, startedAt: s.startedAt, endedAt })
    }
    ```

    如上，对停止时正在进行的专注，同样使用任务标题。

* **循环阶段转换与任务清理：** 当一个专注阶段结束后进入休息，我们应该清除当前任务标记，因为下一个专注可能会是新的任务。`PomodoroState.currentTaskId` 不应延续到休息或下轮。实现上有两处：

  * 在 alarm 处理函数中，获取下一阶段 `next` 后，如果 `next.phase` 是休息或 idle，则可以将 `next.currentTaskId` 清空。也可以直接在计算 `next = getNextStateAfterPhase(state)` 时让它不继承 taskId。比较简单做法是在完成 pushHistory 之后、设置下一阶段之前清理。例如：

    ```ts
    let next = getNextStateAfterPhase(state)
    if (state.phase === 'focus') {
      // 刚结束的是专注，则清除任务关联
      next.currentTaskId = undefined
    }
    await storage.set(STORAGE_KEY, next)
    ```
  * 在 `stopAll()` 中，构建 idle 状态 `next` 时也要清空 currentTaskId：

    ```diff
    const next: PomodoroState = {
      ...s,
      phase: 'idle',
      running: false,
      cycleCount: 0,
      startedAt: undefined,
      endsAt: undefined,
      paused: false,
      pauseAccumMs: 0,
      currentTaskId: undefined
    }
    ```

完成上述后台改造后，扩展在任务模式下的行为将如下：当用户通过任务列表启动专注时，后台记录所选任务 ID；计时完成时，历史记录保存该任务名，让用户回顾一天完成了哪些任务、用时多少分钟。这满足了任务驱动模式的核心需求。

### 3.4 分阶段实施计划

为降低实现难度和便于测试验收，建议将任务驱动功能拆解为多个里程碑逐步完成：

* **Phase 1 – 基础数据结构与开关：** 完成任务类型定义和后台状态扩展（PomodoroTask 结构、TASKS\_KEY、currentTaskId 字段），以及设置界面中的“任务模式”开关的展示。此阶段不改变前端行为，仅为后续功能铺垫。可以在设置面板中启用该开关（`PomodoroSettings.showTaskSetting=true`）进行测试，确保 `state.config.enableTask` 能正确存储和切换。

* **Phase 2 – 任务列表 UI 实现：** 开发 TaskList 组件，实现任务的增删改查界面。先不接入后台，只保证任务列表的添加和标记完成在前端 Storage 中正常工作。验收点：在设置中打开任务模式后，弹窗下半部分显示任务列表 UI；添加任务显示在列表中，可标记完成状态，并在关闭重开弹窗后仍然保留（数据持久化验证）。

* **Phase 3 – 集成番茄计时流程：** 修改 PomodoroHome 切换 HistoryList/TaskList，调整 PomodoroTimer 隐藏开始按钮（任务模式下）等。实现 handleStartTask 调用后台开始计时。如果 Phase2 完成，点击任务的“专注”按钮即可触发计时。验收点：选择任务启动后，弹窗顶部计时器开始倒计时，按钮变为“暂停/跳过”等，任务列表仍在下方显示。此时扩展应记录了 currentTaskId（可在 Console 检查 Storage `pomodoroState` 内容）。

* **Phase 4 – 后台任务记录完善：** 完成后台 pushHistory 日志改造，用任务名称替换专注项标题。模拟一次专注+休息流程，查看 HistoryList 展示是否出现任务名称以及正确的用时和时间戳。另外测试停止按钮：专注进行中点击“停止”，HistoryList 应有对应任务的记录。

* **Phase 5 – 测试和细节优化：** 全面测试任务模式和非任务模式的所有功能，包括：任务模式下暂停/恢复/跳过/停止是否正常（尤其跳过/停止应正确清理 currentTaskId）；切换 enableTask 开关对 UI 的影响（关闭任务模式应恢复历史列表显示，已有任务数据仍保留在 Storage 下次打开可见）；严格模式在任务模式下行为应该一致（强制休息不受任务模式影响）。根据测试结果完善细节，比如可以考虑：

  * 任务完成后自动弹出通知或标记（当前实现需手动勾选完成任务，可选改进是当专注结束时弹窗询问“任务 X 是否已完成？”）。
  * UI 优化：任务很多时列表滚动，或者为任务列表和历史列表共存做准备（比如提供任务视图和历史视图切换）。若 PRD v2 需要可以考虑。

通过以上阶段的实施，逐步将任务驱动功能稳定集成。整个过程不涉及后端，数据全在浏览器本地；在确保本地逻辑完备后，将来若需要云同步任务，可再引入 Convex/数据库，但那属于以后阶段。

---

## 4. 移动端 (Expo 应用) v1/v2 实现方案

第二阶段完成浏览器插件的任务驱动功能后，下一步产品计划是在移动端应用（`apps/native`, 基于 Expo/React Native）实现相同的功能（包括第一阶段的番茄钟计时和严格休息，以及第二阶段的任务列表）。移动端实现需要考虑平台差异和用户体验上的调整。以下从技术角度评估实现方案并提出解决思路：

**4.1 移动端与浏览器端差异分析：**

* **计时与后台运行：** 浏览器扩展利用 Chrome 提供的后台脚本和 alarms，可以在用户切换标签甚至关闭浏览器窗口时继续计时。而移动端受限于移动操作系统，对应用在后台长时间执行计时有限制。尤其在 iOS，上锁屏或切到后台后，普通 JS 计时器会暂停，除非使用后台任务或推送机制。Android 相对开放一些，可以用前台服务保持计时。实现移动番茄钟，需要结合 Expo/React Native 提供的后台任务或通知来保证计时不中断。

* **严格休息模式不可强制：** 在浏览器中，我们能劫持标签使用户无法访问其他站点。但在手机上，应用无法阻止用户切换到别的应用，系统也不允许应用层面锁定屏幕。因此，**手机端无法完全实现浏览器端那种“强制休息不让干别的”**的效果。我们只能在应用内提示用户休息，但无法防止用户按 Home 键或用其它 App。这需要在产品上做妥协，例如通过发送**通知**反复提醒用户（“休息尚未结束，请勿继续工作”），但不能真正强制。

* **UI 屏幕常驻/Widget：** 浏览器扩展弹窗仅在用户点击时出现，平时计时主要通过图标提示。而移动端可以有专门的 App 界面，甚至提供**桌面小组件 (Widget)** 显示倒计时。考虑移动端使用场景，提供一个在主屏幕显示剩余时间的小组件会很有帮助，用户不需每次打开 App 查看。这属于移动端特有的实现，可以提高易用性。

* **代码和组件复用：** Web 扩展和移动 App 都使用 React/TypeScript，加上项目使用了 **shadcn/UI 的组件和 TailwindCSS** 风格。如果我们能够**复用前端组件代码**，开发效率将提高。所幸有社区方案 **React Native Reusables** 可以在 React Native 中使用类似 shadcn/UI 的组件和样式。项目中已经在使用这些 UI 原子组件（Button、Card、Input 等）并通过 `nativewind` 适配 RN。那么浏览器扩展的许多界面代码（如 PomodoroTimer、TaskList 等 JSX 和 Tailwind 类）可以在 RN 中直接或稍加修改后使用，大大减少重新写 UI 的工作量。

基于上述差异，移动端的实现方案将分为两个部分：**核心计时逻辑**和**界面/交互**，下面分别说明。

**4.2 核心计时逻辑与通知**

* **状态管理：** 在 Expo App 中，我们需要有类似浏览器端的中央状态来跟踪番茄钟倒计时和任务。可选择使用 React Context 或 Zustand 等轻量状态库来保存番茄钟状态（phase, running, remainingTime, config 等）。参考浏览器端，我们可以创建一个 `usePomodoro` Hook（在 `apps/native`），负责：

  * 保存番茄钟当前状态（可以直接用与浏览器相同的 PomodoroState 类型，减去 Chrome 特有内容）。
  * 方法：start/pause/resume/stop/skip，修改状态并安排定时。
  * 在 web 扩展中，状态储存在 Storage，由后台维护；在移动端，我们可以在 Hook 中使用 `useReducer` 或 `useState` 来管理，在应用前台时持续倒计时（`setInterval` 每秒更新，或使用动画驱动的进度）。

* **计时实现：** 在 App 前台时，可以使用 JavaScript 定时器更新状态。例如，App 启动时如果检测已有进行中的计时（可存储在 AsyncStorage），就继续计时；否则 start 创建新的。每秒减少剩余时间直至 0，期间通过 Context 触发 UI 更新。需要注意的是，当 App 转入后台，普通定时器可能被暂停。为此：

  * **本地通知**：借助 **Expo Notifications**，在开始一个阶段时就使用 `Notifications.scheduleNotificationAsync` 调度一个本地通知，在 `{duration} 分钟`后触发提示。这相当于一个闹钟，即使 App 后台也能提醒用户。比如：“专注结束！休息一下”。如果用户没有关闭 App，则我们的 JS 计时也同步走到 0；如果 App 在后台，用户会通过通知知道该回来。
  * **后台任务**：Expo 提供 **TaskManager** 和 **BackgroundFetch** 接口，可执行有限的后台代码。但精确计时每秒更新并不现实，因为移动 OS 会限制频率。所以我们不打算尝试每秒后台更新 UI，而是使用通知/闹钟来处理后台长期计时。
  * **前台服务 (Android)**：对于 Android，可以考虑使用 `react-native-background-timer` 在后台维持一个计时器（需要配置 foreground service）。若对这一点要求不高（容忍锁屏暂停计时，只用通知提示），可暂不实现复杂的后台服务。

* **严格模式处理：** 如前所述，在移动端无法真正阻止用户离开应用。因此 Strict 模式的作用有限。我们的策略：

  * 在 App 前台，如果 strictMode 开启且进入休息阶段，就弹出一个**全屏休息提示**组件，类似浏览器的 BreakPage（显示休息倒计时和提示语）。应用内可以禁止关闭此提示（除非点击跳过），从而在 App 内强制休息。
  * 如果用户强制退出 App，我们无法控制。但可以发送持续通知提醒。例如每分钟发一条通知：“休息还剩 X 分钟，请勿使用手机工作”。虽然不一定有效，但聊胜于无。可以在 strict 休息开始时，用 `Notifications.scheduleNotificationAsync` 安排多个分时通知。
  * 简而言之，移动端 strictMode 更多是**提醒而非硬性强制**。我们应在 UI 上告知用户这点：比如在设置里说明“移动端无法完全强制”。

* **任务完成提醒：** 类似地，当一个专注任务完成时，除了通知提醒休息，我们也可以发送“任务 X 专注完成，用时 25 分钟”之类的通知，增强达成感。

**4.3 界面与组件复用**

* **导航结构：** 采用 React Navigation 构建 App 导航。建议一个主屏幕 PomodoroScreen，用于显示计时器和任务列表，以及一个设置屏。如果实现严格模式休息页，可在状态进入休息时 navigate 到一个 BreakScreen（内容和浏览器端 BreakPage 类似），并在休息结束后自动 navigate 回来。

  * 主界面 PomodoroScreen：显示**任务列表**（或历史列表）和**计时器**。其实可以复用 PomodoroHome 的概念。在移动端，屏幕高度比浏览器 popup 大，可以上下分布更多内容。例如顶部显示日期或 App 标题，中间计时环，底部任务列表。
  * 休息提示 BreakScreen：全屏显示休息动画和提示语，还有“跳过休息”按钮。如果 strictMode 开，就不提供关闭，除非计时到 0 或跳过。对于实现，BreakScreen 可以直接复用扩展里 BreakPage 的大部分 JSX 和逻辑，只是触发时机由 App 内导航控制。
  * 设置 Screen：类似浏览器 Settings，但可能精简些（或用 Modal 弹窗形式）。其中“任务模式”开关、“严格模式”开关、“时长设置”等都可配置。这部分 UI 代码也能借鉴 web 的 PomodoroSettings。

* **组件样式**：React Native Reusables 提供了与 shadcn 类似的 UI 组件（如 `<Button>` `<Card>` 等）并支持 Tailwind 类名。因此我们可以**直接复制**浏览器扩展的大部分 JSX 结构和 Tailwind 样式到 RN。需要改动的：

  * 将浏览器端使用的 HTML 标签（如 `<div>`, `<span>` 等）替换为 RN 对应的 `<View>`, `<Text>` 等。
  * 样式类基本可保持不变，因为 NativeWind 会解析 Tailwind 类名应用到 RN 样式。
  * Chrome 特定逻辑（如 i18n 用 `chrome.i18n`）需要替换。移动端可使用 i18next 或 Expo Localization 做多语言支持，或暂时硬编码中文。
  * 图标：浏览器端可能用了一些 Emoji 或 Icon 字体，在移动端也可用 Emoji 或使用 React Native Vector Icons 提供统一图标。

* **任务列表复用：** 第二阶段的任务列表（TaskList 组件）基本是纯前端逻辑，没有浏览器特定 API，因此**高度可复用**。可以将 `TaskList.tsx` 复制到 `apps/native` 对应地方。改动：

  * Storage 改用 RN 的 AsyncStorage（Plasmo 的 storage hook 在 RN 不能用）。在 RN 用 `useState` 管理任务列表，并用 `AsyncStorage` 持久化：组件 mount 时读取，变化时写入。
  * 调用 start 计时：在 RN 中没有后台脚本消息，`start` 函数会直接在 `usePomodoro` Hook 中实现逻辑，不需要 `sendToBackground`。

* **计时圆环复用：** PomodoroTimer 里的 SVG 圆环进度在 RN 需要 `react-native-svg`。若时间紧，可先用文本倒计时和进度条替代，后续再复现环形进度。

* **严格休息 UI**：同样可复用扩展 BreakPage 的 JSX，包括“breathing circle”动画。移动端可用 Animated.loop 实现。

**4.4 与桌面端逻辑的一致性**

* **共享代码/模块：** 将通用逻辑提取到 monorepo 的共享 package，例如 `packages/common`，包含 PomodoroState 定义、任务定义、以及一些纯逻辑函数（如计算下一个阶段、倒计时格式化等）。浏览器和 RN 都引用它，避免两端状态定义不一致。把 `DEFAULT_CONFIG` 等配置也移入，以保证 Web 和移动相同。

* **功能对齐：** 确保移动端 v1（无任务）和 v2（任务模式）具备与浏览器端对应的能力：**暂停/恢复**、**跳过休息**、任务增删改、历史记录等。虽然移动端 UI 不一定显示历史列表，但可以在本地保存历史（为后续统计做准备）。

* **桌面挂件/快捷方式：** React Native 要实现系统小组件（Widget）需要原生扩展。可作为后续增强：iOS 用 WidgetKit + App Extensions，Android 用 AppWidget；或 Android 采用前台常驻通知显示倒计时及操作按钮。当前阶段可先在 `usePomodoro` 中留好通知/Widget 的接口，未来接入。

**4.5 实施步骤概览：**

* **Step 1:** 在 monorepo 中配置或更新 React Native Reusables 和 NativeWind，确保可以使用 Tailwind 样式和 shadcn 组件。
* **Step 2:** 创建 PomodoroContext/usePomodoro hook：定义 PomodoroState（引入 common）和 actions，在移动端实现 start/pause 等。先实现基本倒计时，不考虑后台。
* **Step 3:** 构建 UI 屏幕：PomodoroScreen（含 Timer 和 TaskList）、SettingsScreen、BreakScreen。逐步移植浏览器端 JSX 到这些屏幕。
* **Step 4:** 将 usePomodoro hook 与 UI 连接：Timer 组件从 Context 拿当前剩余时间，TaskList 用 Context 的 start 方法启动计时。
* **Step 5:** 集成 Expo Notifications：添加 `expo-notifications`，申请权限。在 startPhase 时安排通知 X 分钟后提醒休息，休息开始时也安排提醒。测试锁屏或切后台后能收到通知。调整 strictMode：休息开始时，如果 App 在前台则导航到 BreakScreen，如果在后台，靠通知引导用户回来。
* **Step 6:** 深入测试：包括应用前后台切换情况下计时准确性、暂停恢复在后台的表现；任务列表持久化（退出 App 重进，任务仍在）。
* **Step 7:** 任务模式验证：在移动端设置中开启任务模式（或直接启用），流程与浏览器端一致。添加任务 → 开始专注 → 结束后记录。

**4.6 差异化功能的思考：**

* 充分利用系统通知和震动反馈，提高仪式感。例如专注开始/结束时震动或播放提示音。
* **桌面 Widget** 属于进阶，可在产品成熟后再做。这里 React Native Reusables 主要用于 UI 一致性，并不提供 Widget 功能。Widget 可作为未来版本（v3）规划方向。

---

## 结论

* 提供了 **单一根 `.env` + dotenv 预加载** 的统一配置方案，兼容 Turborepo、Bun、Next/Expo 与 Convex 的开发体验；必要时在 `packages/backend` 建立 `.env.local` 的符号链接作为兜底。
* 对浏览器扩展的 **架构合理性** 进行了评估，提出了在 **休息阶段“暂停不强制”** 的具体实现（改 `shouldEnforce()`、在 `pause`/`resume` 中关闭/恢复休息页）。
* 给出了 **PRD v2（任务驱动）** 的前端架构与详细实现指南（数据模型、组件、消息与后台改造、历史记录显示、分阶段落地）。
* 对移动端（Expo/React Native）实现 **v1/v2** 的差异与方案进行了评估，包括后台计时限制、严格模式替代、通知、代码复用与实施步骤；并指出 Widget 等差异化功能的方向。

上述方案可直接进入开发与迭代，建议按“先易后难”的顺序推进（先完成浏览器端 v2，再做移动端 v1/v2），过程中保持 monorepo 下的共用逻辑抽取，降低重复劳动。
