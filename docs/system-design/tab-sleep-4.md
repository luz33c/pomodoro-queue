# 严格休息模式（方案 4：标签页管控）完整落地方案（含 UX 优化与资源清理）

> 目标：在 **短休/长休** 阶段，**强制**将用户留在扩展的“休息页”，用户切换标签/窗口会被**立即拉回**；休息结束彻底**清理资源**。并在被强制拉回时在休息页给出**短暂提示**，避免困惑。

---

## 可行性结论（基于 `main` 分支）

* 通过 **Tabs API** 与 **Windows API** 在后台（MV3 Service Worker）监听 `tabs.onActivated` 和 `windows.onFocusChanged`，可实时感知用户切换标签/窗口并激活（或创建）我们的休息页标签。该能力受 **Chrome 官方扩展 API** 支持：

  * Tabs API：创建与激活标签、监听标签激活等（`tabs.create`、`tabs.update({ active: true })`、`tabs.onActivated`）。([Chrome for Developers][1], [MDN Web Docs][2])
  * Windows API：聚焦窗口与监听窗口焦点切换（`windows.update({ focused: true })`、`windows.onFocusChanged`）。([Chrome for Developers][3], [MDN Web Docs][4])
  * 实务上，跨窗口聚焦常用组合：`windows.update({ focused: true })` 后 `tabs.update({ active: true })`。([Stack Overflow][5])
* 方案不依赖内容脚本注入，**覆盖率高**（包括内容脚本受限站点）；只需在扩展内提供一个 **`tabs/break.html`（或 TSX）休息页面**，通过 `chrome.runtime.getURL` 打开即可。([Stack Overflow][6])
* 权限方面：建议在 manifest 增加 `"tabs"` 权限以便稳定使用相关事件与能力（大部分基础操作无需权限，但监听与后续扩展往往会用到）。([Chrome for Developers][1])

---

## 方案架构与数据流

```
┌──────────────┐        ┌────────────────────────┐
│ Pomodoro 计时 │ 触发   │ 背景 SW：阶段切换处理     │
│ (alarms)     ├──────▶ │ - 休息开始：beginStrict() │
└──────────────┘        │ - 休息结束：endStrict()   │
                        └─────────┬───────────────┘
                                  │ 监听
             ┌────────────────────┼─────────────────────┐
             │                    │                     │
   tabs.onActivated      windows.onFocusChanged   tabs.onRemoved/onUpdated
     (切标签)                   (切窗口)               (关/改休息页)
             │                    │                     │
             ▼                    ▼                     ▼
      强制激活休息页        该窗口新建休息页         纠正或重建休息页
             │
             └── 更新 storage：`breakLastForcedAt = now` → 休息页显示短暂提示
```

---

## 修改清单（文件路径与要点）

> 目录以 `apps/browser-extension` 为根（Plasmo 项目）。

1. **Manifest 权限**：在 `apps/browser-extension/package.json` 的 `manifest.permissions` 增加 `"tabs"`。
2. **类型与默认配置**：`src/pomodoro/types.ts`

   * 在 `PomodoroConfig` 增加 `strictMode: boolean`（默认 `false`）。
3. **设置 UI**：`src/components/PomodoroSettings.tsx`

   * 增加“严格休息模式”开关（复选/开关），持久化到 `config.strictMode`。
4. **后台严格模式内核**（新增文件）：`src/background/strict-break.ts`

   * 封装：开启/结束严格模式、事件监听器、强制切回、跨窗口创建、清理。
5. **后台整合**：`src/background/index.ts`

   * 在阶段切换（闹钟/跳过/停止）时调用 `beginStrictBreak()` 或 `endStrictBreak()`；
   * `runtime.onStartup` 启动时根据存储里的 `phase + strictMode` 做一次“自愈”检查（如果启动即处于休息+严格模式，重新启用管控）。
6. **休息页面**（新增）：

   * `src/tabs/break.html`（或 `src/tabs/break.tsx`）：显示“休息中…”；
   * **UX 优化**：监听 `breakLastForcedAt`（storage），在被强制拉回后显示**短暂提示**（如 1.5s 顶部条/Toast）。

---

## 关键代码（可直接粘贴）

### 1) Manifest 权限（`package.json` 片段）

```json
{
  "manifest": {
    "permissions": ["alarms", "storage", "notifications", "tabs"]
  }
}
```

> 说明：Tabs API 多数基础能力不强制要求 `"tabs"`，但为稳定监听/操作标签并减少后续踩坑，**建议显式声明**（官方文档对权限有说明）。([Chrome for Developers][1])

---

### 2) 类型与默认值（`src/pomodoro/types.ts`）

```ts
export type PomodoroConfig = {
  focusMin: number
  shortMin: number
  longMin: number
  longEvery: number
  strictMode: boolean          // 新增：严格休息模式
}

export const DEFAULT_CONFIG: PomodoroConfig = {
  focusMin: 25,
  shortMin: 5,
  longMin: 20,
  longEvery: 4,
  strictMode: false
}
```

> 若已有存量用户数据，读取时记得用 `DEFAULT_CONFIG` 合并，兜底 `strictMode`。

---

### 3) 设置 UI（`src/components/PomodoroSettings.tsx`，节选）

```tsx
// 在表单底部新增严格模式开关
<div className="mt-3 flex items-center gap-2">
  <input
    id="strict"
    type="checkbox"
    checked={form.strictMode ?? false}
    onChange={(e) => setForm((p) => ({ ...p, strictMode: e.target.checked }))}
  />
  <label htmlFor="strict" className="text-sm text-muted-foreground">
    严格休息模式（休息期间禁止浏览其他标签页）
  </label>
</div>
```

---

### 4) 严格模式内核（新增 `src/background/strict-break.ts`）

> 该模块**常驻注册**事件监听，按“当前是否处于休息且 strictMode=true”来**早退**，避免重复添加/移除监听引发遗漏。
> 同时提供 `beginStrictBreak()` / `endStrictBreak()` 以**集中创建/清理休息页**。

```ts
// src/background/strict-break.ts
import { Storage } from "@plasmohq/storage"
import type { PomodoroState } from "~pomodoro/types"

const storage = new Storage({ area: "local" })
const STORAGE_KEY = "pomodoroState"
const BREAK_FORCED_AT = "breakLastForcedAt"

const breakTabIdsByWindow: Record<number, number> = {}   // 每个窗口的休息tab
let enforcing = false                                     // 是否处于严格管控中
const breakUrl = chrome.runtime.getURL("tabs/break.html")

// 判断是否应当强制：strict+休息阶段
async function shouldEnforce(): Promise<boolean> {
  const s = (await storage.get<PomodoroState>(STORAGE_KEY)) as PomodoroState
  return !!(s?.config?.strictMode && (s.phase === "short" || s.phase === "long"))
}

// —— UX：被强制拉回时，通知休息页做短暂提示（通过 storage 变更）
async function nudgeForcedHint() {
  await storage.set(BREAK_FORCED_AT, Date.now())
}

// 打开/激活 当前窗口 的休息页tab
async function ensureBreakTabInWindow(windowId: number, nudge = false) {
  const tabId = breakTabIdsByWindow[windowId]
  try {
    if (tabId) {
      await chrome.windows.update(windowId, { focused: true }) // bring to front
      await chrome.tabs.update(tabId, { active: true })        // activate tab
    } else {
      const tab = await chrome.tabs.create({ windowId, url: breakUrl, active: true })
      breakTabIdsByWindow[windowId] = tab.id!
    }
    if (nudge) await nudgeForcedHint()
  } catch {
    // 若失败（标签不存在/窗口关闭），重建
    const tab = await chrome.tabs.create({ windowId, url: breakUrl, active: true })
    breakTabIdsByWindow[windowId] = tab.id!
    if (nudge) await nudgeForcedHint()
  }
}

// 监听：切换标签
async function onTabActivated({ tabId, windowId }: chrome.tabs.TabActiveInfo) {
  if (!await shouldEnforce()) return
  const breakTabId = breakTabIdsByWindow[windowId]
  if (breakTabId && tabId !== breakTabId) {
    await ensureBreakTabInWindow(windowId, true)  // 被强制拉回 → 显示提示
  } else if (!breakTabId) {
    await ensureBreakTabInWindow(windowId, true)
  }
}

// 监听：切换窗口
async function onWindowFocusChanged(windowId: number) {
  if (!await shouldEnforce()) return
  if (windowId === chrome.windows.WINDOW_ID_NONE) return // 切到其他应用
  await ensureBreakTabInWindow(windowId, true)
}

// 监听：休息页被关闭
async function onTabRemoved(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) {
  if (!await shouldEnforce()) return
  for (const [winStr, bid] of Object.entries(breakTabIdsByWindow)) {
    if (bid === tabId) {
      delete breakTabIdsByWindow[Number(winStr)]
      const winId = removeInfo.windowId
      if (winId && winId !== chrome.windows.WINDOW_ID_NONE) {
        await ensureBreakTabInWindow(winId, true) // 立刻重建
      }
    }
  }
}

// 可选：防止在休息页乱跳（将其拉回）
async function onTabUpdated(tabId: number, info: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) {
  if (!await shouldEnforce()) return
  if (Object.values(breakTabIdsByWindow).includes(tabId) && info.url && info.url !== breakUrl) {
    try { await chrome.tabs.update(tabId, { url: breakUrl }) } catch {}
  }
}

// —— 对外：休息开始/结束
export async function beginStrictBreak() {
  enforcing = true
  // 在当前前台窗口创建一个休息页
  const win = await chrome.windows.getLastFocused({})
  if (win?.id && win.id !== chrome.windows.WINDOW_ID_NONE) {
    await ensureBreakTabInWindow(win.id, false) // 初次打开不提示
  }
}

export async function endStrictBreak() {
  enforcing = false
  // 关闭所有休息页
  const ids = Object.values(breakTabIdsByWindow)
  for (const id of ids) {
    try { await chrome.tabs.remove(id) } catch {}
  }
  for (const k of Object.keys(breakTabIdsByWindow)) delete breakTabIdsByWindow[Number(k)]
}

// —— 初始化：注册一次，全生命周期可用（监听函数内做shouldEnforce早退）
export function initStrictBreakKernel() {
  chrome.tabs.onActivated.addListener(onTabActivated)
  chrome.windows.onFocusChanged.addListener(onWindowFocusChanged)
  chrome.tabs.onRemoved.addListener(onTabRemoved)
  chrome.tabs.onUpdated.addListener(onTabUpdated)
}
```

> 说明：监听器**常驻**注册，内部每次先 `shouldEnforce()` 决定是否动作；可避免“动态增删监听器导致错过瞬时事件”的隐患；资源清理集中于关闭休息标签与清空索引。

---

### 5) 背景整合（`src/background/index.ts` 增量/挂钩点）

> 在 **阶段切换**（闹钟触发）与 **手动跳过/停止** 后，调用 `beginStrictBreak` / `endStrictBreak`。同时在扩展启动时 `runtime.onStartup` 做一次自愈。

```ts
// 顶部：引入
import { beginStrictBreak, endStrictBreak, initStrictBreakKernel } from "./strict-break"
import type { PomodoroState } from "~pomodoro/types"
import { Storage } from "@plasmohq/storage"

const storage = new Storage({ area: "local" })
const STORAGE_KEY = "pomodoroState"

// 初始化一次严格模式内核监听（常驻）
initStrictBreakKernel()

// 扩展启动后，如发现正处于休息且strictMode=true → 重新启用
chrome.runtime.onStartup.addListener(async () => {
  const s = (await storage.get<PomodoroState>(STORAGE_KEY)) as PomodoroState
  if (s?.config?.strictMode && (s.phase === "short" || s.phase === "long")) {
    await beginStrictBreak()
  } else {
    await endStrictBreak()
  }
})

// —— 阶段切换（闹钟里）：写入next后新增以下逻辑 ——
// 假设已有：await storage.set(STORAGE_KEY, next)
// ...
if (next.config?.strictMode && (next.phase === "short" || next.phase === "long")) {
  await beginStrictBreak()
} else {
  // 离开休息（含停止）或 strictMode=false
  await endStrictBreak()
}

// —— 手动跳过阶段（skip）处理完成后也调用同样的判断 ——
// —— 停止 stopAll() 后同理调用 endStrictBreak() ——

// （可选）在配置更新 applyConfig(...) 结束时：
// 若正在休息：strict false->true => begin；true->false => end
```

> **关键**：**所有分支**（闹钟推进/手动跳过/终止/配置切换）都要覆盖调用；**`onStartup`** 自愈可防止 SW 重载后状态丢失。

---

### 6) 休息页面（`src/tabs/break.html`，含 UX 提示）

> 简单静态页足够；为了“被拉回时的**短暂提示**”，我们让后台在每次强制切回后写入 `breakLastForcedAt = Date.now()`，休息页监听 **storage 变化**，若该键更新则显示 1.5s 顶部提示条。

```html
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>休息时间</title>
<style>
  html,body{height:100%;margin:0}
  body{display:flex;align-items:center;justify-content:center;background:#111;color:#fff;font-family:ui-sans-serif,system-ui}
  .msg{font-size:22px;line-height:1.7;text-align:center;opacity:.94}
  .hint{position:fixed;top:12px;left:50%;transform:translateX(-50%);
        background:#0ea5e9;color:#fff;padding:8px 14px;border-radius:999px;
        font-size:12px;letter-spacing:.2px;box-shadow:0 4px 14px rgba(14,165,233,.35);
        opacity:0;pointer-events:none;transition:opacity .2s ease}
  .hint.show{opacity:1}
</style>
</head>
<body>
  <div class="hint" id="hint">已为你切回休息页（防分心）</div>
  <div class="msg">☕ 休息中，请离开屏幕放松一下…</div>

<script>
  const KEY = "breakLastForcedAt"
  const hint = document.getElementById("hint")
  let timer = null

  function flashHint(){
    if(!hint) return
    hint.classList.add("show")
    clearTimeout(timer)
    timer = setTimeout(()=>hint.classList.remove("show"), 1500)
  }

  // 初次进入不提示；仅在被强制拉回时（后台写入 KEY）提示
  chrome.storage.onChanged.addListener((changes, area)=>{
    if(area === "local" && changes[KEY]){
      flashHint()
    }
  })

  window.addEventListener("beforeunload", ()=> clearTimeout(timer))
</script>
</body>
</html>
```

> **无侵入且可见**：用户若尝试切到其它标签，会被拉回此页，并在顶部看到“已为你切回休息页（防分心）”短提示，消除困惑。

---

## 资源清理策略（覆盖“所有分支与边界”）

**核心准则**：**监听器常驻**（`initStrictBreakKernel` 仅注册一次），**逻辑早退**由 `shouldEnforce()` 决定是否动作；需要清理的是 **休息页标签** 与 **瞬时计时器**。

1. **休息结束（闹钟推进到 focus）**

   * 在阶段切换处理里已调用 `endStrictBreak()`：关闭全部休息标签、清空索引。

2. **用户手动停止（stopAll）**

   * stop 完成后调用 `endStrictBreak()`。

3. **用户跳过阶段（skip）**

   * 写入 `next` 后按同一判断：若离开休息→ `endStrictBreak()`；若进入休息且 strict=true→ `beginStrictBreak()`。

4. **配置切换**

   * 正处于休息：`strictMode` `false→true` 立刻 `beginStrictBreak()`；`true→false` 立刻 `endStrictBreak()`。

5. **用户关闭/导航休息页**

   * 由 `tabs.onRemoved` / `tabs.onUpdated` 负责“**纠正/重建**”。

6. **浏览器重启 / SW 复活（MV3）**

   * `runtime.onStartup` 读取存储：若处于休息+strict，自动 `beginStrictBreak()`；否则 `endStrictBreak()`，防止残留索引。

7. **休息页脚本中的短提示**

   * 仅用 `setTimeout` 做 1.5s 隐藏；`beforeunload` 清除定时器，**无泄漏**风险。

> 监听器常驻的设计**更稳健**：避免在“切换到休息”的瞬时窗口还未注册监听就错过事件。真正需要清理的是“打开的休息标签”与“短提示定时器”，我们已在 `endStrictBreak()` 与 `beforeunload` 中严格清理。

---

## 验收清单（建议逐项自测）

* [ ] 进入短休/长休且 strict=true：在当前窗口打开 `break.html` 并激活；
* [ ] 切换到其它标签：**立刻被拉回**休息标签，并在顶部看到 **1.5s 提示**；
* [ ] 切换到另一窗口：该窗口**自动新建**休息页并激活，显示提示；
* [ ] 关闭休息页标签：**立即重建**并激活；
* [ ] 在休息标签的地址栏手动输入其它网址：**被拉回**休息页；
* [ ] 休息结束（自动推进或 skip）：所有休息标签被关闭，不再强制；
* [ ] 停止计时：同上关闭与清理；
* [ ] 配置中关闭 strict：若正处于休息，立即解除强制并关闭休息标签；
* [ ] 浏览器重启后（若此时仍处于休息+strict），自动恢复强制；
* [ ] 隐身窗口（若未允许运行扩展）：不会强制（可在说明中提示如何启用）。

---

## 可能的权衡与扩展

* **用户体验**：严格模式**非常强硬**。已通过“短提示”缓和困惑；可在设置里补充说明“提前结束休息请使用扩展按钮**跳过/停止**”。
* **多窗口与多显示器**：当前策略为“每个聚焦窗口创建一个休息标签”，实现足够严格；也可选择**仅在当前窗口强制**（降低打扰），按需改。
* **与内容脚本遮罩并存**：严格模式下遮罩基本无机会显示；共存不冲突，必要时也可在 strict 下禁用遮罩注入以省资源。
* **权限**：建议保留 `"tabs"`，官方文档对 Tabs 权限说明见此。([Chrome for Developers][1])

---

## 附：常用 API 资料（便于团队参考）

* **Tabs API 总览与权限**（Chrome Dev）：`tabs.create / tabs.update / tabs.onActivated` 等。([Chrome for Developers][1])
* **Windows API**（Chrome Dev）：`windows.update({ focused:true }) / windows.onFocusChanged`。([Chrome for Developers][3])
* **onActivated / onFocusChanged**（MDN WebExtensions 文档）：事件语义与示例。([MDN Web Docs][2])
* **跨窗口拉焦点实践**（StackOverflow）：`windows.update` + `tabs.update` 组合。([Stack Overflow][5])
* **在标签打开扩展内页面**：`chrome.runtime.getURL` + `tabs.create`。([Stack Overflow][6], [MDN Web Docs][7])

---

### 结语

以上方案在你的 `main` 分支基础上**最小侵入**集成：

* 一处 manifest 权限；
* 一处类型/默认值；
* 一处设置 UI；
* 一个后台内核文件（`strict-break.ts`）+ 少量挂钩；
* 一个休息页（`tabs/break.html`）+ 简洁的 UX 提示。

按此实施即可达到“**休息时无法继续使用浏览器**”的严格目标，并且在各分支路径都做到了**资源清理**与**用户感知**（短提示）。如果需要，我也可以把以上改动整理成**完整 PR Diff**（逐文件补丁）供你直接套用。

[1]: https://developer.chrome.com/docs/extensions/reference/api/tabs?utm_source=chatgpt.com "chrome.tabs | API | Chrome for Developers"
[2]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/onActivated?utm_source=chatgpt.com "tabs.onActivated - Mozilla | MDN"
[3]: https://developer.chrome.com/docs/extensions/reference/api/windows?utm_source=chatgpt.com "chrome.windows | API | Chrome for Developers"
[4]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/windows/onFocusChanged?utm_source=chatgpt.com "windows.onFocusChanged - Mozilla | MDN"
[5]: https://stackoverflow.com/questions/22286495/change-active-window-chrome-tabs?utm_source=chatgpt.com "Change Active Window (chrome.tabs) - Stack Overflow"
[6]: https://stackoverflow.com/questions/9576615/open-chrome-extension-in-a-new-tab?utm_source=chatgpt.com "Open chrome extension in a new tab - Stack Overflow"
[7]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/create?utm_source=chatgpt.com "tabs.create () - MDN Web Docs"
