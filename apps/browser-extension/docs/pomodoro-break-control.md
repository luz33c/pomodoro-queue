**Pomodoro 休息（Break）控制总览**
- 目标：梳理在浏览器扩展中触发、维持与结束“休息（short/long break）”的关键状态与事件监听组合，便于排障与扩展。
- 适用范围：`apps/browser-extension`
- 参考实现：`apps/browser-extension/src/model/pomodoro/types.ts`、`apps/browser-extension/src/background`、`apps/browser-extension/src/contents/break-overlay.ts`、`apps/browser-extension/src/tabs/break.tsx`

**核心状态模型**
- **阶段枚举**：`PomodoroPhase = "idle" | "focus" | "short" | "long"`（`apps/browser-extension/src/model/pomodoro/types.ts:1`）
- **配置字段**：`PomodoroConfig`（同文件）
  - `shortMin`/`longMin`：短/长休息分钟数
  - `longEvery`：每完成 N 次专注进入一次长休
  - `strictMode`：严格休息模式（强制标签页回到休息页）
  - `enableBreakNotifications`：进入休息时是否发系统通知
- **运行时状态**：`PomodoroState`（同文件）
  - `phase`、`running`、`paused`、`startedAt`、`endsAt`
  - `cycleCount`：已完成专注次数（用于判定 long break）
  - `config`：当前生效配置
- **存储键**：`STORAGE_KEY`（状态）、`HISTORY_KEY`（历史）、`CURRENT_QUEUE_KEY`（当前队列）（同文件）

**状态流转规则（与休息相关）**
- **阶段完成 → 计算下一阶段**：`getNextStateAfterPhase(s)`（`apps/browser-extension/src/background/index.ts:158`）
  - `focus → short | long`：依据 `cycleCount + 1` 是否整除 `longEvery`
  - `short | long → focus`
  - 新阶段会设置 `startedAt/endsAt`、清空暂停累计，并维持 `running=true`
- **零分钟休息直跳**：若下一阶段为 `short/long` 且 `endsAt` 为空（0 分钟），再次调用 `getNextStateAfterPhase` 直接进入 `focus`（`index.ts` 的 alarm 与 skip 两处均处理）

**触发休息的入口**
- **定时器到期（主路径）**：`chrome.alarms.onAlarm`（`apps/browser-extension/src/background/index.ts:72` 起）
  - 忽略非当前 alarm 或已暂停情形
  - 写入刚结束阶段的历史，计算并落库下一状态
  - 依据配置切换到严格模式或普通模式（见“模式与内核”）
  - 调用 `notifyPhase(next.phase)` 在进入 `short/long` 且开关启用时发通知
- **用户显式开始休息**：`startPhase('short'|'long')`（消息 `pomodoro.start`，`apps/browser-extension/src/background/messages/pomodoro.start.ts` → `index.ts:248`）
- **跳过到休息/从休息跳过**：`pomodoro.skip`（`apps/browser-extension/src/background/messages/pomodoro.skip.ts`）
  - 记录当前阶段历史 → `getNextStateAfterPhase` → 可能触发休息
  - 若“从休息跳过”，会调用 `endStrictBreak()` 关闭休息页
- **扩展启动恢复**：`chrome.runtime.onStartup`（`apps/browser-extension/src/background/index.ts:60`）
  - 若上次处于休息阶段：根据 `strictMode` 决定强制回到休息页或仅注入遮罩

**模式与内核**
- **严格模式（strictMode=true）**
  - 进入休息时：`beginStrictBreak()`（`apps/browser-extension/src/background/index.ts` 多处调用）
  - 退出休息/进入专注或 idle：`endStrictBreak()`
  - 内核初始化：`initStrictBreakKernel()`（`apps/browser-extension/src/background/index.ts:17` 调用；内核实现于 `apps/browser-extension/src/background/strict-break.ts`）
  - 休息页：`tabs/break.html`（对应页面逻辑 `apps/browser-extension/src/tabs/break.tsx`）
- **普通模式（strictMode=false）**
  - 进入休息时：对所有已打开网页注入遮罩 `showOverlayOnAllOpenTabs()`（`apps/browser-extension/src/background/strict-break.ts:247`）
  - 退出休息/进入专注或 idle：`endStrictBreak()`（确保严格模式遗留被清理）
  - 遮罩逻辑由内容脚本 `apps/browser-extension/src/contents/break-overlay.ts` 根据存储状态显示/隐藏

**严格模式内核：事件监听组合**（`apps/browser-extension/src/background/strict-break.ts`）
- **tabs.onActivated**：激活非系统/扩展/休息页标签时，强制 `focusBreakTab(windowId)`（拦回休息页）
- **windows.onFocusChanged**：窗口切换时，强制聚焦所在窗口的休息页
- **tabs.onUpdated**：
  - 若“休息页标签”自身跳转到其他 URL，则用 `tabs.update({ url: BREAK_URL })` 拉回
  - 对活动且加载完成的普通网页，强制切回休息页
- **tabs.onCreated**：新建且立即激活的普通标签，强制切回休息页
- **webNavigation.onHistoryStateUpdated**：捕获 SPA 路由跳转（无刷新）后，若标签为活动且为普通页面，强制切回休息页
- **tabs.onRemoved**：清理窗口→休息页标签的映射缓存
- 关键策略：
  - 允许系统页与扩展页（`chrome://`,`edge://`,`devtools://`, 扩展自身 URL）
  - `update/create` 操作内置短重试，规避 “Tabs cannot be edited right now” 瞬时错误
  - 多窗口：为每个窗口维护独立的休息页标签映射 `breakTabIdsByWindow`

**普通模式：遮罩内容脚本**（`apps/browser-extension/src/contents/break-overlay.ts`）
- **显示判定**：`state.phase ∈ {short,long}` 且 `!state.config.strictMode` → 显示遮罩
- **订阅状态**：
  - 启动时读取 `STORAGE_KEY` 初始化可见性
  - `storage.watch(STORAGE_KEY)` 实时切换遮罩
- **交互阻断**：
  - 覆盖全屏、最高层级、禁用滚动和选择
  - 捕获并阻止鼠标、滚轮、触摸、键盘等事件
- **可访问性**：
  - 遮罩元素 `role="dialog"`、`aria-label` 来源于 i18n `breakOverlayMessage`
  - 设置 `tabIndex=-1` 并在显示时聚焦遮罩，键盘可预期地被挡住

**系统通知（可选）**
- 进入 `short/long` 时，若 `enableBreakNotifications=true`，调用 `chrome.notifications.create` 发送通知（`apps/browser-extension/src/background/index.ts:206` 起）
- 图标路径从扩展清单解析并通过 `runtime.getURL` 生成，避免 dev/prod 差异

**配置变更对休息的影响**（`apps/browser-extension/src/background/index.ts:371`）
- 动态应用新配置；若当前运行中，会以“保持剩余时长不变”的方式重新计算 `endsAt`
- 在休息阶段切换 `strictMode`：
  - `false → true`：开启严格模式并拉回休息页
  - `true → false`：注入遮罩并关闭严格模式残留

**结束路径与清理**
- **自然结束/跳过**：统一经 `getNextStateAfterPhase` 计算并落库下一阶段；从休息进入专注会调用 `endStrictBreak()`
- **停止**：`pomodoro.stop` → `stopAll()` 重置状态、清空 alarm、结束严格模式、清理当前队列（`apps/browser-extension/src/background/messages/pomodoro.stop.ts`、`index.ts:302` 起）
- **休息页自闭**：`tabs/break.tsx` 发现 `!running || phase ∉ {short,long}` 时 1s 后 `window.close()`

**典型时序（文字版）**
- 专注到期（alarm）→ 写历史 → `getNextStateAfterPhase` → `phase=short|long` →
  - `strictMode=true`：`beginStrictBreak()` + 可选通知
  - `strictMode=false`：`showOverlayOnAllOpenTabs()` + 可选通知
- 休息到期（alarm）→ 写历史 → `phase=focus` → `endStrictBreak()` → 继续专注
- 用户点击“跳过”在休息中 → 直接 `phase=focus` → `endStrictBreak()`

**边界与容错**
- 0 分钟休息：直接二次流转到 `focus`，不会短暂进入休息
- 标签页编辑瞬时失败：`strict-break.ts` 内所有更新/创建均带指数退避重试
- 系统/扩展页白名单：严格模式下允许查看，无强制跳转

**相关消息与入口（供联调）**
- `pomodoro.start`（可携带 `phase`）→ `startPhase`
- `pomodoro.pause` / `pomodoro.resume`
- `pomodoro.stop` → `stopAll`
- `pomodoro.skip` → 跳过当前阶段（含从休息到专注）
- `pomodoro.config.update` → `applyConfig`
- `break.close` → 关闭严格模式休息页（`apps/browser-extension/src/background/messages/break.close.ts`）

**源码定位速查**
- 状态与常量：`apps/browser-extension/src/model/pomodoro/types.ts`
- 阶段流转/定时器/通知：`apps/browser-extension/src/background/index.ts`
- 严格模式内核：`apps/browser-extension/src/background/strict-break.ts`
- 消息处理：`apps/browser-extension/src/background/messages/*.ts`
- 普通模式遮罩：`apps/browser-extension/src/contents/break-overlay.ts`
- 休息页：`apps/browser-extension/src/tabs/break.tsx`

