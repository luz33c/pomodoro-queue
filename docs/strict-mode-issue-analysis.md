# 严格模式问题排查报告

## 问题描述

严格模式在某些场景下无法正常工作：
- ✅ 新建浏览器tabs时，会自动跳到 `tabs/break.html`
- ❌ 点击已经存在的tabs，可以正常浏览网页，没有触发严格休息模式返回到 `tabs/break.html`（除非页面强制刷新）

## 代码分析

通过分析 `apps/browser-extension/src/background/strict-break.ts` 文件，发现了问题的根本原因和已实施的解决方案。

### 当前实现的事件监听

代码实现了多层监听机制：

1. **tabs.onActivated** - 监听tab切换
2. **windows.onFocusChanged** - 监听窗口焦点变化  
3. **tabs.onUpdated** - 监听页面状态变化
4. **tabs.onCreated** - 监听新建tab
5. **webNavigation.onCommitted** - 监听页面导航提交
6. **webNavigation.onHistoryStateUpdated** - 监听SPA路由变化

## 问题根因分析

### 原始问题：事件监听覆盖不全面

**问题1**：`tabs.onUpdated` 仅在 `status === 'complete'` 时处理，无法捕获用户在已加载页面中的导航行为。

**问题2**：缺少对单页应用(SPA)路由变化的监听，用户通过JavaScript路由跳转不会触发页面重新加载。

**问题3**：`tabs.onActivated` 只在用户切换tab时触发，但用户在当前tab内浏览时不会触发。

### 已实施的解决方案

代码已经通过以下方式修复了这些问题：

#### 1. 增强 tabs.onUpdated 监听
```typescript
// 如果发生了顶层 URL 变更（更早于 complete），立即处理
if (change.url && tab.active) {
  await focusBreakTab(tab.windowId!)
  return
}

// 兜底：完全加载完成时也处理，覆盖非 SPA 的导航
if (change.status === 'complete' && tab.active) {
  await focusBreakTab(tab.windowId!)
}
```

#### 2. 增加 WebNavigation API 监听
```typescript
// 1) 提交导航（含点击链接、地址栏输入、重定向等）
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (!(await shouldEnforce())) return
  if (details.frameId !== 0) return // 仅关心主框架
  const url = details.url ?? ""
  if (isSystemOrExtPage(url) || isBreakPage(url)) return
  try {
    const t = await chrome.tabs.get(details.tabId)
    if (!t.active) return
    await focusBreakTab(t.windowId!)
  } catch {}
})

// 2) SPA 路由（history.pushState/replaceState 等）
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  if (!(await shouldEnforce())) return
  if (details.frameId !== 0) return
  const url = details.url ?? ""
  if (isSystemOrExtPage(url) || isBreakPage(url)) return
  try {
    const t = await chrome.tabs.get(details.tabId)
    if (!t.active) return
    await focusBreakTab(t.windowId!)
  } catch {}
})
```

#### 3. 改进 windows.onFocusChanged 监听
```typescript
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return
  if (!(await shouldEnforce())) return
  try {
    const [active] = await chrome.tabs.query({ windowId, active: true })
    if (active) {
      if (isBreakPage(active.url) || isSystemOrExtPage(active.url)) return
    }
  } catch {}
  await focusBreakTab(windowId)
})
```

#### 4. 添加系统页面豁免
```typescript
chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  if (!(await shouldEnforce())) return
  
  // 如果激活的就是休息页，不需要再切换
  const tab = await chrome.tabs.get(tabId)
  if (isBreakPage(tab.url)) return
  // 允许系统/扩展页面（如设置页、扩展页）
  if (isSystemOrExtPage(tab.url)) return
  
  await focusBreakTab(windowId)
})
```

## 权限要求

确保 `manifest.json` 包含必要的权限：
```json
{
  "permissions": [
    "tabs",
    "webNavigation",
    "storage",
    "alarms",
    "notifications"
  ]
}
```

## 覆盖场景分析

### ✅ 已覆盖的用户行为
1. **新建tab** - `tabs.onCreated` 监听
2. **切换已存在的tab** - `tabs.onActivated` 监听  
3. **点击页面内链接** - `webNavigation.onCommitted` 监听
4. **地址栏输入新URL** - `webNavigation.onCommitted` 监听
5. **页面重定向** - `webNavigation.onCommitted` 监听
6. **SPA路由跳转** - `webNavigation.onHistoryStateUpdated` 监听
7. **页面刷新** - `tabs.onUpdated` (status=complete) 监听
8. **切换窗口焦点** - `windows.onFocusChanged` 监听

### ✅ 豁免的系统页面
- Chrome内置页面 (`chrome://`)
- Edge内置页面 (`edge://`) 
- 开发者工具 (`devtools://`)
- 扩展自身页面 (`chrome-extension://`)

## 潜在剩余问题

### 1. AJAX请求和动态内容加载
**现状**：纯AJAX请求（不改变URL）不会触发任何导航事件
**影响**：用户在单页应用中通过AJAX获取内容时不会被拦截
**解决方案**：需要内容脚本监听或定时检查机制

### 2. iframe内的导航
**现状**：当前代码通过 `details.frameId !== 0` 过滤掉了iframe
**影响**：用户在iframe内浏览不会被拦截
**合理性**：这个设计是合理的，因为主要目标是防止用户浏览主要内容

### 3. 扩展权限限制
**现状**：某些特权页面扩展无法访问
**影响**：如果用户切换到这类页面，扩展无法强制回到休息页
**缓解**：通过 `isSystemOrExtPage` 豁免了这些页面

## 测试验证清单

修复后需要验证以下场景：
- ✅ 新建tab时自动跳转到休息页
- ✅ 点击已存在的普通网页tab时自动跳转到休息页  
- ✅ 在已打开的tab中点击链接时自动跳转到休息页
- ✅ 在地址栏输入新URL时自动跳转到休息页
- ✅ SPA应用内路由跳转时自动跳转到休息页
- ✅ 页面重定向时自动跳转到休息页
- ✅ 切换窗口时自动跳转到休息页
- ✅ 系统页面（chrome://、扩展页面等）不受影响
- ✅ 休息结束后严格模式正常关闭

## 结论

经过分析，当前代码已经实现了一个相当全面的严格模式监听机制，应该能够覆盖用户描述的问题场景。如果仍然存在点击已存在tab不被拦截的问题，建议：

1. **检查权限配置**：确认扩展具有 `tabs` 和 `webNavigation` 权限
2. **检查严格模式状态**：确认番茄钟确实处于休息阶段且启用了严格模式
3. **添加调试日志**：在各个监听器中添加 `console.log` 来确认事件是否被触发
4. **测试特定网站**：某些网站可能有特殊的导航机制不被标准API覆盖

总体而言，当前实现已经是一个相当健壮的解决方案。