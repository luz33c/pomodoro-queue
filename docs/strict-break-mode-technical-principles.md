# 严格休息模式实现原理与技术文档

## 概述

严格休息模式是番茄钟应用的核心功能之一，通过浏览器扩展的标签页管控技术，在用户休息期间强制其停留在专属休息页面，从而确保休息质量和专注度的提升。

## 核心设计理念

### 1. 双模式休息系统

应用提供两种休息模式供用户选择：

- **普通模式**：在当前浏览页面上覆盖遮罩层，提醒用户休息
- **严格模式**：打开专属休息页面，禁止浏览其他内容

这种设计满足了不同用户的使用习惯和专注需求。

### 2. 渐进式用户体验

- 用户可以从普通模式开始使用
- 当需要更强的自控力时，可选择启用严格模式
- 模式切换实时生效，无需重启应用

## 技术架构

### 1. 整体架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   用户界面层     │    │   状态管理层     │    │   执行控制层     │
│                │    │                │    │                │
│ PomodoroTimer   │◄──►│ Storage API     │◄──►│ Background SW   │
│ Settings Modal  │    │ State Sync      │    │ Event Listeners │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                ▲
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   内容脚本层     │    │   休息页面层     │    │   权限系统层     │
│                │    │                │    │                │
│ Break Overlay   │    │ Break Tab Page  │    │ Tabs API        │
│ Conditional     │    │ Timer Display   │    │ Windows API     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2. 核心组件说明

#### 2.1 状态管理（Storage Layer）

使用 Plasmo Storage API 进行统一状态管理：

```typescript
// 核心状态结构
interface PomodoroState {
  phase: 'idle' | 'focus' | 'short' | 'long'
  running: boolean
  config: {
    strictMode: boolean  // 严格模式开关
    // ... 其他配置
  }
  // ... 其他状态
}
```

**特点**：
- 跨组件状态同步
- 实时变化监听
- 持久化存储

#### 2.2 标签页管控核心（strict-break.ts）

这是严格模式的核心实现，负责：

```typescript
// 核心数据结构
const breakTabIdsByWindow: Record<number, number> = {}  // 窗口-标签映射
const breakUrl = chrome.runtime.getURL("tabs/break.html")  // 休息页面URL

// 核心判断逻辑
async function shouldEnforce(): Promise<boolean> {
  const state = await storage.get<PomodoroState>(STORAGE_KEY)
  return !!(state?.config?.strictMode && (state.phase === 'short' || state.phase === 'long'))
}
```

**工作原理**：
1. 维护每个窗口的休息标签页映射关系
2. 实时检查是否应该执行严格模式
3. 监听用户的标签页切换行为
4. 强制将用户拉回休息页面

#### 2.3 事件监听系统

使用 Chrome Extension API 的多个监听器：

```typescript
export function initStrictBreakKernel() {
  chrome.tabs.onActivated.addListener(onTabActivated)      // 标签切换
  chrome.windows.onFocusChanged.addListener(onWindowFocusChanged)  // 窗口焦点
  chrome.tabs.onRemoved.addListener(onTabRemoved)          // 标签关闭
  chrome.tabs.onUpdated.addListener(onTabUpdated)          // 标签更新
}
```

**设计策略**：
- **常驻监听**：避免动态注册/取消导致的事件遗漏
- **条件执行**：在监听器内部进行早期退出判断
- **多重保障**：多个监听器确保各种边界情况被覆盖

## 关键技术实现

### 1. 标签页强制切换机制

#### 1.1 核心算法

```typescript
async function onTabActivated({ tabId, windowId }: chrome.tabs.TabActiveInfo) {
  // 第一步：检查是否应该执行严格模式
  if (!await shouldEnforce()) return
  
  // 第二步：获取当前窗口的休息标签ID
  const breakTabId = breakTabIdsByWindow[windowId]
  
  // 第三步：如果激活的不是休息页面，强制切回
  if (tabId !== breakTabId) {
    await ensureBreakTabInWindow(windowId, true)  // true 表示显示被拉回提示
  }
}
```

#### 1.2 多窗口支持策略

```typescript
async function beginStrictBreak() {
  // 获取所有正常窗口
  const windows = await chrome.windows.getAll({ windowTypes: ['normal'] })
  
  // 为每个窗口创建休息页面
  for (const window of windows) {
    if (window.id && window.id !== chrome.windows.WINDOW_ID_NONE) {
      await ensureBreakTabInWindow(window.id, false)
    }
  }
}
```

**优势**：
- 支持多显示器工作环境
- 每个窗口独立管理休息标签
- 避免窗口间干扰

### 2. 休息页面实现（break.tsx）

#### 2.1 技术选型

选择 TSX 而非静态 HTML 的原因：

- **Plasmo 框架兼容性**：TSX 是 Plasmo 的标准页面格式
- **动态功能需求**：需要实时倒计时、状态监听等交互
- **样式管理**：支持 CSS 模块化和 Tailwind 集成

#### 2.2 核心功能实现

```typescript
function BreakPage() {
  const [timeLeft, setTimeLeft] = useState("--:--")
  const [showHint, setShowHint] = useState(false)

  // 倒计时更新逻辑
  const updateTimer = async () => {
    const state = await storage.get(STORAGE_KEY)
    if (state?.endsAt && (state.phase === 'short' || state.phase === 'long')) {
      const remaining = state.endsAt - Date.now()
      setTimeLeft(formatTime(Math.max(0, remaining)))
    }
  }

  // 被拉回提示逻辑
  const flashHint = () => {
    setShowHint(true)
    setTimeout(() => setShowHint(false), 2000)
  }
}
```

**特色功能**：
- 实时倒计时显示
- 被强制拉回时的友好提示
- 呼吸动画帮助放松
- 休息建议指导

### 3. 遮罩层智能控制（break-overlay.ts）

#### 3.1 条件显示逻辑

```typescript
function shouldShowOverlay(state?: PomodoroState): boolean {
  // 只有在非严格模式且处于休息阶段时才显示遮罩层
  return !!(state && isBreakPhase(state.phase) && !state.config?.strictMode)
}
```

#### 3.2 工作机制

```
用户状态变化
       ↓
检查是否为休息阶段
       ↓
检查严格模式设置
       ↓
普通模式 → 显示遮罩层
严格模式 → 跳过遮罩，由标签管控处理
```

这种设计确保了两种模式的互斥性和用户体验的一致性。

## 状态同步机制

### 1. 生命周期管理

严格模式的完整生命周期：

```
开始休息 → beginStrictBreak()
    ↓
创建所有窗口的休息页面
    ↓
启动事件监听 (常驻)
    ↓
用户切换标签 → 立即拉回 + 显示提示
    ↓
休息结束 → endStrictBreak()
    ↓
关闭所有休息页面 + 清理状态
```

### 2. 状态切换触发点

系统在以下时机检查并调整严格模式状态：

1. **阶段自动切换**（闹钟触发）
2. **用户手动跳过**
3. **用户停止番茄钟**
4. **配置设置更改**
5. **浏览器/扩展重启**（自愈机制）

```typescript
// 统一的状态切换处理
if (nextState.config?.strictMode && (nextState.phase === 'short' || nextState.phase === 'long')) {
  await beginStrictBreak()
} else {
  await endStrictBreak()
}
```

## 错误处理与容错机制

### 1. 标签页状态异常处理

```typescript
async function ensureBreakTabInWindow(windowId: number, nudge = false) {
  const tabId = breakTabIdsByWindow[windowId]
  try {
    if (tabId) {
      // 检查标签是否仍然存在
      const tab = await chrome.tabs.get(tabId)
      if (tab && tab.windowId === windowId) {
        // 标签存在，激活它
        await chrome.tabs.update(tabId, { active: true })
      } else {
        // 标签已不存在，清理记录并重新创建
        delete breakTabIdsByWindow[windowId]
        throw new Error('Tab no longer exists')
      }
    }
  } catch (error) {
    // 创建新的休息标签
    const tab = await chrome.tabs.create({ windowId, url: breakUrl, active: true })
    if (tab.id) {
      breakTabIdsByWindow[windowId] = tab.id
    }
  }
}
```

### 2. 权限降级策略

当扩展缺少必要权限时：

1. **优雅降级**：自动回退到普通模式
2. **用户提示**：在设置界面提示权限需求
3. **功能保障**：核心计时功能不受影响

### 3. 浏览器重启自愈

```typescript
chrome.runtime.onStartup.addListener(async () => {
  const state = await storage.get<PomodoroState>(STORAGE_KEY)
  if (state?.config?.strictMode && (state.phase === 'short' || state.phase === 'long')) {
    await beginStrictBreak()  // 恢复严格模式
  } else {
    await endStrictBreak()    // 确保清理状态
  }
})
```

## 性能优化策略

### 1. 事件监听优化

- **常驻注册**：避免频繁的监听器注册/取消
- **早期退出**：在监听器入口处进行条件检查
- **异步处理**：所有监听器使用 async/await 避免阻塞

### 2. 存储访问优化

- **缓存策略**：避免重复的 storage 读取
- **批量更新**：相关状态变化合并处理
- **监听器复用**：使用统一的 storage 监听器

### 3. 内存管理

```typescript
// 清理策略
export async function endStrictBreak() {
  enforcing = false
  
  // 关闭所有休息页面
  const ids = Object.values(breakTabIdsByWindow)
  for (const id of ids) {
    try { await chrome.tabs.remove(id) } catch {}
  }
  
  // 清空映射关系
  for (const k of Object.keys(breakTabIdsByWindow)) {
    delete breakTabIdsByWindow[Number(k)]
  }
}
```

## 安全性考虑

### 1. 权限最小化原则

仅申请必要的扩展权限：

```json
{
  "permissions": [
    "alarms",     // 定时器功能
    "storage",    // 状态持久化
    "notifications", // 通知提醒
    "tabs",       // 标签页操作
    "windows"     // 窗口操作
  ]
}
```

### 2. 数据隔离

- 使用扩展专属的存储空间
- 不访问用户的浏览数据
- 不向外部服务发送数据

### 3. 用户控制

- 用户可随时关闭严格模式
- 提供明确的功能说明
- 支持快速停止/跳过功能

## 扩展性设计

### 1. 模块化架构

```
src/background/
├── index.ts           // 主控制器
├── strict-break.ts    // 严格模式核心
└── messages/          // 消息处理器
    ├── pomodoro.start.ts
    ├── pomodoro.stop.ts
    └── ...
```

### 2. 配置系统扩展

```typescript
export type PomodoroConfig = {
  focusMin: number
  shortMin: number
  longMin: number
  longEvery: number
  strictMode: boolean    // 当前功能
  // 未来可扩展：
  // strictModeLevel?: 'normal' | 'enhanced' | 'extreme'
  // customBreakUrl?: string
  // breakSoundEnabled?: boolean
}
```

### 3. 国际化支持

- 分离 UI 文本和逻辑代码
- 支持多语言休息页面
- 配置化的提示信息

## 测试策略

### 1. 功能测试

- **基础功能**：模式切换、标签管控、倒计时显示
- **边界情况**：多窗口、标签关闭、权限缺失
- **用户体验**：提示显示、交互响应、性能表现

### 2. 兼容性测试

- **浏览器版本**：Chrome、Edge 不同版本
- **系统环境**：Windows、macOS、Linux
- **屏幕配置**：单屏、多屏、不同分辨率

### 3. 性能测试

- **内存占用**：长时间运行的内存表现
- **CPU 使用**：事件监听的性能影响
- **启动时间**：扩展加载和初始化耗时

## 用户反馈与迭代

### 1. 收集反馈渠道

- 扩展商店评价
- GitHub Issues
- 用户调研

### 2. 常见优化方向

- **自定义休息内容**：支持用户设置休息页面内容
- **统计分析**：提供休息质量分析
- **智能提醒**：基于用户行为的个性化提醒

## 总结

严格休息模式的实现充分利用了浏览器扩展的技术能力，通过精心设计的架构和算法，实现了对用户浏览行为的有效管控。整个系统具备良好的扩展性、稳定性和用户体验，为番茄工作法的实践提供了强有力的技术支撑。

关键成功因素：

1. **技术选型恰当**：充分利用 Plasmo 框架和 Chrome Extension API
2. **架构设计合理**：模块化、可扩展的系统架构
3. **用户体验优先**：渐进式功能、友好提示、优雅降级
4. **错误处理完善**：多重保障、自动恢复、容错机制
5. **性能考虑周全**：资源管理、内存控制、响应优化

这套实现方案不仅解决了当前的功能需求，也为未来的功能扩展和优化奠定了坚实的技术基础。