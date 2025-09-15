# PomodoQ Chrome Web Store 提交 · 隐私与权限说明（可直接粘贴）

> 用于填写 Chrome 开发者后台“隐私权规范/权限理由”等输入框（均需 ≥25 字）。依据 `apps/browser-extension` 实际实现与上架文案整理。如权限变更，请同步更新。
> EN: Use this to fill the Chrome Developer Dashboard "Privacy practices / Permission justification" fields (each ≥ 25 characters). Content reflects the actual implementation in `apps/browser-extension` and listing copy. Please update when permissions change.

---

## 权限最小化建议（过审更友好）

- 建议将 `host_permissions` 从 `*://*/*` 收敛为 `http://*/*` 与 `https://*/*`（代码仅在这两类地址注入遮罩）。
  - EN: Narrow `host_permissions` from `*://*/*` to `http://*/*` and `https://*/*` since the overlay is only injected on these schemes.
- 如未在代码中调用 `chrome.sidePanel.*` API，仅使用 `side_panel.default_path`，则可移除 `"sidePanel"` 权限；若保留，请在理由中强调“不读取网页数据，仅用于展示侧边面板 UI”。
  - EN: If you do not call `chrome.sidePanel.*` and only set `side_panel.default_path`, you can remove the `"sidePanel"` permission. If you keep it, clarify it does not read page data and is only for the side panel UI.
- 使用 `chrome.tabs.create/update/remove` 并不需要 `"tabs"` 权限，但本扩展还使用 `tabs.query`、`onActivated` 等事件，因此仍需 `"tabs"` 以进行标签管理；不读取 URL/标题/历史。
  - EN: `chrome.tabs.create/update/remove` do not require the `"tabs"` permission, but this extension also uses `tabs.query` and events like `onActivated`, so `"tabs"` remains necessary for tab management; it does not read URL/title/history.
- 保持“仅请求核心功能所必需的权限”，其余功能若未来新增，建议改为可选权限再在运行时申请。
  - EN: Request only permissions strictly required for the core features. For future non‑core features, prefer optional permissions and request them at runtime.

## 单一用途说明（Single Purpose）

PomodoQ 的唯一用途是提供番茄钟计时与休息管理：用户可自定义专注/短休/长休时长；进入休息时，严格模式会打开并锁定扩展内的专属休息页，普通模式则为已打开网页注入遮罩，并可显示系统通知提醒休息。扩展不做与此无关的行为，不抓取或售卖用户数据。
EN: PomodoQ’s single purpose is Pomodoro timing and break management. Users set custom focus/short/long breaks. In strict mode, a dedicated in‑extension break page opens and is locked; in normal mode, an overlay is injected into open pages. System notifications may remind you to rest. The extension performs no unrelated behaviors and does not collect or sell user data.

参考代码：`src/background/index.ts`（计时/阶段切换）、`src/background/strict-break.ts`（严格休息/遮罩/回拉）、`src/contents/break-overlay.ts`（遮罩层）。
EN: References: `src/background/index.ts` (timing/state transitions), `src/background/strict-break.ts` (strict break/overlay/redirect), `src/contents/break-overlay.ts` (overlay).

---

## 远程代码（Remotely hosted code）

本扩展不从远程服务器下载或执行代码。所有脚本均随扩展打包；`scripting` 仅用于注入打包内的遮罩脚本（`break-overlay`），符合 MV3 禁止远程代码政策；不使用 `eval` 或动态执行外部脚本。
EN: The extension does not download or execute remotely hosted code. All scripts are packaged with the extension; `scripting` only injects the bundled overlay script (`break-overlay`), complying with MV3’s no‑remote‑code policy. No `eval` or dynamic execution of external scripts.

---

## 主机权限（host_permissions）

- 申请：`*://*/*`
  - EN: Requested: `*://*/*`
- 理由：为在“普通模式”休息阶段对任意已打开站点注入遮罩层，需要在所有站点具备注入脚本权限；遮罩仅用于暂时屏蔽交互引导休息，不读取页面内容，不收集或上传用户数据。严格模式下仅打开/聚焦扩展内页面 `tabs/break.html`，不访问第三方站点内容。
  - EN: Reason: To inject the overlay during normal‑mode breaks into any open site, script injection must be allowed across sites. The overlay only blocks interaction temporarily and does not read page content or collect/upload data. In strict mode, only the in‑extension page `tabs/break.html` is opened/focused; third‑party content is not accessed.

对应实现：`strict-break.ts` 中 `showOverlayOnAllOpenTabs()` 使用 `chrome.scripting.executeScript` 将打包脚本注入到所有已打开标签页；并在 `webNavigation`/`tabs` 事件中回拉至休息页。
EN: Implementation: `showOverlayOnAllOpenTabs()` in `strict-break.ts` uses `chrome.scripting.executeScript` to inject the bundled file into open tabs; `webNavigation`/`tabs` events redirect back to the break page during breaks.

---

## 各权限使用理由（逐项粘贴）

### storage
- 用途：保存本地配置与运行时状态（阶段、开始/结束时间、暂停状态、队列 ID）以及本地历史（专注/休息时间与时长）。数据仅存储在 `chrome.storage.local`，不上传服务器，用户可清除。
- 代码：`background/index.ts` 使用 `@plasmohq/storage` 读写 `STORAGE_KEY`、`CURRENT_QUEUE_KEY`、`HISTORY_KEY`。
EN: Purpose: Store local configuration and runtime state (phase, start/end time, pause status, queue ID) and local history (focus/break timelines). Data is stored only in `chrome.storage.local`, never uploaded; users can clear it. Code: `background/index.ts` with `@plasmohq/storage` for `STORAGE_KEY`, `CURRENT_QUEUE_KEY`, `HISTORY_KEY`.

### sidePanel
- 用途：在浏览器侧边面板提供番茄钟操作界面（开始/暂停/跳过/查看状态），不打断当前页面；不读取网页内容。
- 代码：`manifest.side_panel.default_path` 指向 `sidepanel.html`，对应 `src/sidepanel.tsx`。
EN: Purpose: Provide a Pomodoro UI in the browser side panel (start/pause/skip/view status) without interrupting the current page; no page data is read. Code: `manifest.side_panel.default_path` → `sidepanel.html` (see `src/sidepanel.tsx`). If the `chrome.sidePanel.*` API is not used, the `"sidePanel"` permission can be removed.

### alarms
- 用途：为每个专注/休息阶段创建结束闹钟，到点后切换下一阶段并记录历史，保证后台也能可靠触发。
- 代码：`background/index.ts` 中 `schedulePhaseEndAlarm` 与 `chrome.alarms.onAlarm`。
EN: Purpose: Create end alarms for each phase, switch to the next phase and record history at the exact time, even in the background. Code: `schedulePhaseEndAlarm` and `chrome.alarms.onAlarm` in `background/index.ts`.

### notifications
- 用途：进入短休或长休时发送系统通知，提醒用户离屏/伸展/喝水；仅在用户开启“休息提醒”时发送。
- 代码：`background/index.ts` 的 `notifyPhase()`。
EN: Purpose: Send system notifications when a short/long break starts to remind users to step away/stretch/hydrate; sent only when the “break notifications” toggle is enabled. Code: `notifyPhase()` in `background/index.ts`.

### scripting
- 用途：在“普通模式”休息阶段向已打开网页注入随扩展打包的遮罩脚本，温和阻止继续操作并提示休息；不执行远程代码。
- 代码：`strict-break.ts` 的 `showOverlayOnAllOpenTabs()` 调用 `chrome.scripting.executeScript` 注入 `content_scripts` 中声明的打包文件。
EN: Purpose: During normal‑mode breaks, inject the bundled overlay script into open pages to gently block interaction and prompt rest; no remote code execution. Code: `showOverlayOnAllOpenTabs()` in `strict-break.ts` calls `chrome.scripting.executeScript` to inject the file declared in `content_scripts`.

### tabs
- 用途：在严格休息时创建/聚焦扩展内休息页标签，防止继续浏览；在退出休息或停止计时后关闭休息页。不会读取页面内容或浏览历史。
- 代码：`strict-break.ts` 使用 `chrome.tabs.create/update/get/query/remove`；`background/index.ts` 在阶段切换时调用严格休息逻辑。
EN: Purpose: In strict breaks, create/focus the in‑extension break tab to prevent further browsing and close it when stopping/leaving break. It does not read page content or history. Code: `chrome.tabs.create/update/get/query/remove` in `strict-break.ts`; strict‑break flow called from `background/index.ts`.

### webNavigation
- 用途：在严格休息期间监听 SPA 无刷新路由变化（`onHistoryStateUpdated`）；若活动页内发生跳转，立即回拉到休息页，防止绕过休息限制。仅用于判断是否回拉，不读取页面内容。
- 代码：`strict-break.ts` 中 `chrome.webNavigation.onHistoryStateUpdated`。
EN: Purpose: During strict breaks, listen for SPA history changes (`onHistoryStateUpdated`); if navigation occurs in the active page, redirect back to the break page to prevent bypass. Used only to decide on redirection; no page content is read. Code: `chrome.webNavigation.onHistoryStateUpdated` in `strict-break.ts`.

### windows（manifest 已声明）
- 用途：在严格休息期间跟踪窗口焦点变更并在所有窗口聚焦休息页，确保跨窗口也能执行休息约束。
- 代码：`strict-break.ts` 的 `chrome.windows.onFocusChanged`、`chrome.windows.getAll()`。
EN: Purpose: Track window focus changes during strict breaks and focus the break page across all windows to ensure enforcement. Code: `chrome.windows.onFocusChanged` and `chrome.windows.getAll()` in `strict-break.ts`.

---

## 数据使用与合规声明

- 不收集、出售或共享用户的个人数据；不向第三方传输浏览数据。
  - EN: No collection, sale, or sharing of personal data; no transmission of browsing data to third parties.
- 仅在本地保存计时配置、阶段状态与本地历史，用户可随时清除。
  - EN: Only local storage of timing configuration, state, and local history; users can clear at any time.
- 不使用远程代码；不申请与功能无关的权限；权限仅用于番茄钟与休息控制。
  - EN: No remotely hosted code; no permissions unrelated to core features; permissions are used solely for Pomodoro and break control.
- 确认数据使用情况符合 Chrome 开发者计划政策。
  - EN: Data usage complies with the Chrome Developer Program Policies.

### CSP 与安全实践

- 符合 MV3 内容安全策略（CSP）；不使用 `eval` 或动态执行远程脚本。
  - EN: Compliant with MV3 Content Security Policy; no `eval` or dynamic execution of remote scripts.
- 仅注入随扩展打包的脚本文件。
  - EN: Only inject scripts bundled with the extension.

---

## 可直接粘贴的中文字段（≥25 字）

- 单一用途：本扩展仅用于番茄钟计时与休息管理；休息时锁定扩展内休息页或为当前网页加遮罩，并可显示系统通知，除此之外不做与该目的无关的行为。
  - EN: Single purpose: This extension is only for Pomodoro timing and break management; during breaks it locks an in‑extension break page or adds an overlay, and may show system notifications. It does nothing unrelated to this purpose.
- 远程代码：不使用远程代码。所有脚本均随扩展打包，`scripting` 仅注入本地打包文件，符合 MV3 政策。
  - EN: Remotely hosted code: Not used. All scripts are bundled; `scripting` injects only local bundled files, compliant with MV3.
- 主机权限：为在休息阶段向任意站点注入遮罩提示休息，需要 `*://*/*`；不读取或上传页面内容，仅用于临时休息控制。
  - EN: Host permissions: Required to inject the overlay during breaks across sites (`*://*/*`). No page content is read or uploaded; used only for temporary break control.
- storage：用于在本地保存计时配置、阶段状态与历史记录；仅存储在 `chrome.storage.local`，不上传服务器。
  - EN: storage: Stores configuration, state, and history locally in `chrome.storage.local`; not uploaded to any server.
- sidePanel：在侧边面板提供番茄钟操作界面，便于不打断当前页面的快速操作。
  - EN: sidePanel: Provides a side‑panel Pomodoro UI for quick actions without interrupting the current page.
- alarms：为专注/休息阶段创建定时并到点切换，确保后台也准确触发。
  - EN: alarms: Creates timers for focus/break phases and switches on time, reliable even in the background.
- notifications：短休/长休开始时发送系统通知，提醒离屏与放松，仅在用户开启时生效。
  - EN: notifications: Sends system notifications at the start of short/long breaks to prompt recovery; only if enabled by the user.
- scripting：在普通模式休息时注入随扩展打包的遮罩脚本，暂时阻止交互，引导休息；不执行远程代码。
  - EN: scripting: Injects the bundled overlay script during normal‑mode breaks to temporarily block interaction; no remote code.
- tabs：严格休息期间创建/聚焦休息页并在结束后关闭；不读取页面内容或浏览历史。
  - EN: tabs: Creates/focuses the break tab during strict breaks and closes it after; does not read page content or history.
- webNavigation：在严格休息期间监听无刷新导航并回拉至休息页，防止绕过限制。
  - EN: webNavigation: Monitors SPA navigation during strict breaks and redirects back to the break page to prevent bypass.
- windows：在多窗口场景下将休息页聚焦到前台，确保跨窗口生效。
  - EN: windows: Brings the break page to the foreground across windows to ensure enforcement.

---

## 参照/证据
- `apps/browser-extension/build/chrome-mv3-prod/manifest.json`
- `apps/browser-extension/src/background/index.ts`
- `apps/browser-extension/src/background/strict-break.ts`
- `apps/browser-extension/src/contents/break-overlay.ts`
- `docs/PomodoQ 应用商店上架文案.md`
EN: References/Evidence
- `apps/browser-extension/build/chrome-mv3-prod/manifest.json`
- `apps/browser-extension/src/background/index.ts`
- `apps/browser-extension/src/background/strict-break.ts`
- `apps/browser-extension/src/contents/break-overlay.ts`
- `docs/PomodoQ 应用商店上架文案.md`


