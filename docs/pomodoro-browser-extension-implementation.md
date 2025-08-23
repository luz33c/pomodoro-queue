# 番茄钟浏览器插件实现记录（V1 自由队列）

本文档汇总需求要点、技术方案、实现细节与关键代码位置，作为后续开发与交接的存档。PRD 参考见 `docs/system-design/番茄钟效率助手_prd_v_1_（自由队列_最终版）.md`。

## 1. 背景与目标
- 在 Plasmo 浏览器插件中实现番茄钟（自由队列）：专注 → 休息 → 专注，无限循环，直到手动终止。
- 关闭 popup 仍运行，打开即实时、流畅显示。
- 使用 shadcn/ui；状态持久化与跨上下文同步使用 Plasmo Storage（useStorage）。

## 2. 关键需求摘录
- 点击“开始”应先进入规则向导（设置专注/短休/长休/长休间隔），确认后生成并开始第一段专注。
- 运行中自动衔接下一段（短休或长休），无限循环。
- 支持暂停/继续/终止/跳过；阶段切换推送系统通知。
- 状态持久化，popup 关闭后计时不中断；打开后时间显示流畅。

## 3. 技术方案概述
- MV3 背景 Service Worker + chrome.alarms：不使用 setInterval，避免 SW 休眠问题；使用 `when: endsAt` 唤醒推进阶段。
- Storage 选用 Plasmo `@plasmohq/storage` 的 `local` 区域作为单一真相源；popup 使用 `useStorage` 订阅该键实现跨上下文同步。
- UI 端实时显示：基于 `endsAt - Date.now()` 用 `requestAnimationFrame` 渲染 mm:ss 与进度环，保证流畅与准确。
- 交互通信：使用 `@plasmohq/messaging` 实现 popup → background 的命令调用（start/pause/resume/stop/skip/updateConfig）。

## 4. 状态模型
存储键：`pomodoroState`
```ts
phase: 'idle' | 'focus' | 'short' | 'long'
running: boolean
cycleCount: number
startedAt?: number
endsAt?: number
paused: boolean
pausedAt?: number
pauseAccumMs: number
config: { focusMin, shortMin, longMin, longEvery }
```
说明：
- `endsAt` 为当前阶段结束时间戳（ms）；暂停恢复通过“推迟 endsAt”实现无损衔接。
- `cycleCount` 用于决定长休间隔（`cycleCount % longEvery === 0` 进入长休）。

## 5. 目录与关键文件
- 背景与消息
  - `apps/browser-extension/src/background/index.ts`
  - `apps/browser-extension/src/background/messages/pomodoro.*.ts`
- 类型与默认配置
  - `apps/browser-extension/src/pomodoro/types.ts`
- Hook
  - `apps/browser-extension/src/hooks/usePomodoro.ts`
- 组件
  - `apps/browser-extension/src/components/PomodoroTimer.tsx`
  - `apps/browser-extension/src/components/PomodoroSettings.tsx`
- popup 集成
  - `apps/browser-extension/src/popup.tsx`

## 6. 关键交互与实现
### 6.1 开始 → 规则向导
- 在 `PomodoroTimer` 中，空闲态点击“开始”不再直接启动，而是 `setOpen(true)` 打开 `PomodoroSettings`。
- `PomodoroSettings` 校验：
  - `focusMin ≥ 1`、`shortMin ≥ 0`、`longMin ≥ 0`、`longEvery ≥ 2`。
  - 通过后依次调用 `updateConfig(form)` → `start('focus')`，并关闭弹窗。

### 6.2 阶段调度与切换
- 背景在 `start/skip/resume` 时创建 `chrome.alarms.create('pomodoro-phase-end', { when: endsAt })`。
- `onAlarm`：依据 `getNextStateAfterPhase` 切到下一阶段，更新状态并重新排程 alarm，同时使用 `chrome.notifications.create` 发送提示。

### 6.3 实时显示
- `usePomodoro` 使用 `Storage({ area: 'local' })` 的实例与 `useStorage({ key, instance })` 保持与背景一致的存储区域。
- UI 用 `requestAnimationFrame` 每帧计算剩余时间与进度，确保 popup 重开后依然连贯。

## 7. Manifest 与依赖
- `apps/browser-extension/package.json`：
  - `manifest.permissions`: `['alarms', 'storage', 'notifications']`
- 依赖：`@plasmohq/storage`、`@plasmohq/messaging`、`lucide-react`、shadcn/ui 所需组件依赖。

## 8. 关键代码片段
- 背景：排程与切换逻辑（简化）
```ts
await chrome.alarms.clear('pomodoro-phase-end')
if (state.running && !state.paused && state.endsAt) {
  await chrome.alarms.create('pomodoro-phase-end', { when: state.endsAt })
}
```
- Hook：与 local 区域对齐
```ts
const localStorageInstance = new Storage({ area: 'local' })
const [state] = useStorage({ key: STORAGE_KEY, instance: localStorageInstance, initialValue })
```
- UI：空闲态开始→打开向导
```tsx
{!running && (
  <Button onClick={() => setOpen(true)}>开始</Button>
)}
```

## 9. 已知限制与后续方向
- 历史记录与统计当前未实现，可按 PRD §11 拆分 HistoryList 与埋点。
- 可添加快捷键（commands + runtime.onCommand）、声音提醒开关、通知上的交互按钮。

## 10. 验收清单（对应 PRD §16 的覆盖）
- 一键开始：点击“开始”→ 规则向导 → 生成并开始第一段专注。
- 无限循环：按 `longEvery` 在对应 work 后进入长休，持续循环。
- 暂停/继续/终止/跳过：按钮生效，状态与计时正确。
- 关闭 popup 后仍运行；重开显示流畅。

## 11. 变更记录（要点）
- 修复 popup 与背景使用不同存储区域（sync vs local）导致 UI 不更新的问题。
- 将“开始”行为改为先打开规则向导，符合 PRD“自由队列”的首要流程。
- 在设置弹窗中加入字段校验与 a11y 属性（`aria-invalid`）。
