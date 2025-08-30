## 严格休息模式在“已有标签内继续浏览”未被立即拉回的问题排查与修复建议

### 背景
在严格模式下（短休/长休），期望用户一旦切换或在任何普通网页标签内继续浏览，都会被立即拉回扩展页 `tabs/break.html`，且只创建/复用一个休息页标签；扩展/系统页面（如 `chrome://`、`devtools://`）不受限制。

### 现象复现
- 新建浏览器标签页时，会被立刻拉回 `tabs/break.html`（符合预期）。
- 但在“已存在且当前已激活”的普通网页标签内继续浏览（例如点击站内链接、触发前端路由、发起请求等）时，并不会被拉回休息页；只有在该页强制刷新后才会被拉回。

### 根因定位
结合当前后台内核实现（`apps/browser-extension/src/background/strict-break.ts`）：

- 已注册以下事件：
  - `chrome.tabs.onActivated`：切换标签时拉回休息页（覆盖“切到其它标签”的场景）。
  - `chrome.windows.onFocusChanged`：窗口切换时拉回休息页（覆盖“切到其它窗口”的场景）。
  - `chrome.tabs.onCreated`：新建标签时（若为活动标签）拉回休息页（覆盖“新建标签”的场景）。
  - `chrome.tabs.onUpdated`：仅在 `change.status === "complete"` 且该标签为活动时才拉回休息页。

- 关键问题在于对“已有活动标签内继续浏览”的覆盖不足：
  - 大量站点为 SPA/前端路由，使用 History API（`pushState`/`replaceState`）进行同文档导航；这类路由切换通常不会触发 `tabs.onUpdated` 的 `status=complete`，因此被当前逻辑遗漏。
  - 即使发生 URL 变化，`tabs.onUpdated` 的 `changeInfo.url` 才是更可靠的信号，而当前实现只判断了 `change.status`，没有处理 `change.url`。
  - 另外，当前 `onUpdated` 在遇到 `isBreakPage(tab.url)` 时直接 `return`，未判断 `changeInfo.url`。当用户在休息页地址栏输入新网址时，可能出现“未被立即纠正”的窗口期。

参考代码片段（节选，仅用于说明定位点）：
```37:65:apps/browser-extension/src/background/strict-break.ts
  // 页面地址/加载变化 => 如果跳向非休息页，立刻拉回
  chrome.tabs.onUpdated.addListener(async (tabId, change, tab) => {
    if (!(await shouldEnforce())) return
    if (isSystemOrExtPage(tab.url) || isBreakPage(tab.url)) return
    // 只在页面完全加载完成时才处理，避免加载过程中的误触发
    if (change.status === 'complete' && tab.active) {
      await focusBreakTab(tab.windowId!)
    }
  })
```

### 修复方案
为覆盖“已有活动标签内继续浏览”的情形，建议按优先级采用以下改进：

#### 方案 A（最小改动）：补全 `tabs.onUpdated`
- 在 `onUpdated` 中同时处理 `changeInfo.url`（无论是否 `status=complete`）。
- 条件建议：`if (tab.active && change.url && !isBreakPage(change.url) && !isSystemOrExtPage(change.url)) focusBreakTab(tab.windowId)`。
- 同时补充对休息页被导航的兜底：若 `tabId` 是已记录的休息页且 `change.url !== BREAK_URL`，立即 `tabs.update({ url: BREAK_URL })` 纠正。

这样可以覆盖：
- SPA 前端路由的同文档导航（只改 URL，不发生完整加载完成事件）。
- 用户试图将休息页导航到其它网址的场景。

#### 方案 B（推荐增强）：引入 Web Navigation 事件
`tabs.onUpdated` 并不保证覆盖所有导航场景，尤其是同文档导航。引入 `chrome.webNavigation` 可更稳健：

- 在后台注册：
  - `chrome.webNavigation.onCommitted`（新导航提交）
  - `chrome.webNavigation.onHistoryStateUpdated`（History API 引发的同文档导航，SPA 常见）
  - 可选 `chrome.webNavigation.onCompleted`（确保完整加载时也兜底）

- 处理要点：
  - 仅处理 `details.frameId === 0`（顶层帧）。
  - 判断 `shouldEnforce()`、排除扩展/系统页与 `break.html` 后，对 `details.tabId` 所在窗口调用 `focusBreakTab(windowId)`。
  - 需要在清单中增加权限：`"permissions": ["webNavigation"]`，并保证已有 `host_permissions`（当前产物已包含 `"*://*/*"`）。

优点：
- 对 SPA 路由/同文档导航具有更高覆盖率与及时性，不依赖 `status`。

#### 方案 C：完善休息页的防逃逸逻辑
- 在 `tabs.onUpdated`（或结合 `webNavigation`）中，若侦测到“本窗口的休息页标签” URL 被改为非 `BREAK_URL`，立即改回 `BREAK_URL` 并再次激活；同时写入 `breakLastForcedAt` 以在休息页做 1.5s 短提示（项目中已实现）。

### 权限与配置建议
- 清单（`apps/browser-extension/package.json` → `manifest`）中补充：
```json
{
  "permissions": [
    "alarms", "storage", "notifications", "tabs", "windows", "scripting", "webNavigation"
  ]
}
```
- 保留/确认：`host_permissions` 覆盖目标站点（当前产物已包含 `"*://*/*"`）。

### 验收清单
- 进入短休/长休且严格模式开启：所有前台窗口创建并激活唯一休息页标签。
- 切换到其它标签：立即被拉回休息页，并出现 1.5s 顶部提示。
- 在已激活的普通网页标签内进行：
  - 切换站内路由（SPA）、仅 URL 变化：立即被拉回休息页。
  - 触发网络请求不导致误触发，但任意导航行为都会被拦回。
- 在休息页地址栏输入其它网址：立即被纠正回 `break.html`。
- 新建标签：立即被拉回休息页。
- 切换到其它窗口：该窗口自动创建/激活休息页。
- 休息结束/停止：关闭所有休息页且停止强制。
- 浏览器重启：若仍处于休息+严格模式，自动恢复强制。

### 风险与注意事项
- 事件可能高频触发，建议在 `focusBreakTab` 内部做轻量防抖/去重（如同一窗口 200ms 内只执行一次）。
- 注意仅处理顶层帧（`frameId === 0`），避免子帧广告等噪声。
- 保持对扩展页/系统页的豁免（`chrome://`、`edge://`、`devtools://`、扩展自身 URL 前缀）。
- 如用户未允许扩展在隐身窗口运行，隐身窗口不会被强制，可在 UI 说明中提示如何启用。

### 结论
问题根因是对“同文档导航（SPA 路由）”未覆盖：当前仅在 `tabs.onUpdated` 的 `status=complete` 时处理，导致用户在已激活标签内继续浏览不会被立即拉回。按上文任一方案修复后，可满足“休息时间一到即强制，且在休息期间无论如何都被立即拉回扩展休息页”的目标。

—— @Web


