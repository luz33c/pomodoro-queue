import { Storage } from "@plasmohq/storage"
import type { PomodoroState } from "~model/pomodoro/types"
import { STORAGE_KEY } from "~model/pomodoro/types"

type Phase = "idle" | "focus" | "short" | "long"

const storage = new Storage({ area: "local" })
const BREAK_URL = chrome.runtime.getURL("tabs/break.html")

let kernelInited = false
const breakTabIdsByWindow = new Map<number, number>()

// ---------------- 通用工具 ----------------
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 针对标签暂不可编辑的瞬时错误做短重试
const EDIT_BUSY_RE = /Tabs cannot be edited right now/i

async function updateWithRetry(tabId: number, props: chrome.tabs.UpdateProperties, retries = 3) {
  let attempt = 0
  while (attempt <= retries) {
    try {
      await chrome.tabs.update(tabId, props)
      return true
    } catch (e) {
      const msg = String((e as Error)?.message ?? e)
      if (EDIT_BUSY_RE.test(msg)) {
        await sleep(80 * (attempt + 1))
        attempt++
        continue
      }
      console.warn("tabs.update failed:", e)
      return false
    }
  }
  return false
}

async function createTabWithRetry(props: chrome.tabs.CreateProperties, retries = 3) {
  let attempt = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await chrome.tabs.create(props)
    } catch (e) {
      const msg = String((e as Error)?.message ?? e)
      if (attempt < retries && EDIT_BUSY_RE.test(msg)) {
        await sleep(80 * (attempt + 1))
        attempt++
        continue
      }
      throw e
    }
  }
}

// ---------------- 工具判定 ----------------
function isSystemOrExtPage(url?: string) {
  if (!url) return false
  return (
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("devtools://") ||
    url.startsWith(chrome.runtime.getURL(""))
  )
}

function isBreakPage(url?: string) {
  return !!url && url.startsWith(BREAK_URL)
}

async function shouldEnforce() {
  const s = (await storage.get<PomodoroState>(STORAGE_KEY)) as PomodoroState | undefined
  return Boolean(s?.config?.strictMode && (s?.phase === "short" || s?.phase === "long"))
}

// ---------------- 公开：初始化监听器（常驻） ----------------
export function initStrictBreakKernel() {
  if (kernelInited) return
  kernelInited = true

  // 标签被激活 => 立即拉回休息页
  chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
    if (!(await shouldEnforce())) return
    
    let tab: chrome.tabs.Tab
    try {
      tab = await chrome.tabs.get(tabId)
    } catch {
      return
    }
    
    if (isBreakPage(tab.url)) return           // 切到的本就是休息页，无需处理
    if (isSystemOrExtPage(tab.url)) {
      console.log("[Pomodoro] 激活的是系统/扩展页面，严格模式下允许浏览此页")
      return  // 系统页面或扩展页面，允许访问，不强制跳转
    }
    
    // Mark: break control
    // 标签激活为普通网页且严格模式+处于休息阶段 → 强制切回休息页
    try {
      await focusBreakTab(windowId)
      console.log("[Pomodoro] 已激活非休息页标签，强制切回休息页")
    } catch (e) {
      // 防止未捕获拒绝；内部已做重试
      console.warn("focusBreakTab onActivated failed:", e)
    }
  })

  // 窗口焦点变更 => 拉回休息页
  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return
    if (!(await shouldEnforce())) return
    // Mark: break control
    // 窗口焦点变更且严格模式+处于休息阶段 → 回拉至休息页
    try {
      await focusBreakTab(windowId)
    } catch (e) {
      console.warn("focusBreakTab onFocusChanged failed:", e)
    }
  })

  // 页面地址/加载变化 => 如果跳向非休息页，立刻拉回
  chrome.tabs.onUpdated.addListener(async (tabId, change, tab) => {
    if (!(await shouldEnforce())) return
    
    // 先检测休息页标签是否跳转到其他页面（防止用户在休息页地址栏输入网址逃逸）
    if (breakTabIdsByWindow.has(tab.windowId!) && breakTabIdsByWindow.get(tab.windowId!) === tabId) {
      if (change.url && !isBreakPage(change.url)) {
        // 休息页标签的URL变为非休息页，立刻拉回（带重试）
        const ok = await updateWithRetry(tabId, { url: BREAK_URL })
        if (ok) {
          console.log("[Pomodoro] 检测到休息页标签跳转，已拉回休息页")
          return
        }
        console.warn("休息页标签跳转拦截失败（重试后仍失败）")
      }
      return
    }
    
    if (isSystemOrExtPage(tab.url) || isBreakPage(tab.url)) return
    
    // 只在页面完全加载完成时才处理，避免加载过程中的误触发
    if (change.status === 'complete' && tab.active) {
      // Mark: break control
      // 活动页加载完成且为普通网页，严格模式+休息阶段 → 回拉至休息页
      try {
        await focusBreakTab(tab.windowId!)
        console.log("[Pomodoro] 页面加载完成，强制切回休息页:", tab.url)
      } catch (e) {
        console.warn("focusBreakTab onUpdated failed:", e)
      }
    }
  })

  // 新标签创建时的检查
  chrome.tabs.onCreated.addListener(async (tab) => {
    if (!(await shouldEnforce())) return
    if (isSystemOrExtPage(tab.url) || isBreakPage(tab.url)) return
    
    // Mark: break control
    // 新建标签被激活且严格模式+处于休息阶段 → 回拉至休息页
    if (tab.active) {
      try {
        await focusBreakTab(tab.windowId!)
        console.log("[Pomodoro] 新建标签被激活，强制切回休息页")
      } catch (e) {
        console.warn("focusBreakTab onCreated failed:", e)
      }
    }
  })

  // 监听 History API 导航（SPA 路由跳转等无刷新导航）
  chrome.webNavigation.onHistoryStateUpdated.addListener(async ({tabId, frameId, url}) => {
    if (frameId !== 0) return  // 只关心主框架导航
    if (!(await shouldEnforce())) return
    if (isSystemOrExtPage(url) || isBreakPage(url)) return
    
    try {
      const tab = await chrome.tabs.get(tabId)
      if (tab.active) {
        // Mark: break control
        // 捕获 SPA 路由跳转且严格模式+休息阶段 → 回拉至休息页
        try {
          await focusBreakTab(tab.windowId!)
          console.log("[Pomodoro] 捕获History导航，强制切回休息页:", url)
        } catch (e) {
          console.warn("focusBreakTab onHistoryStateUpdated failed:", e)
        }
      }
    } catch (e) {
      console.warn("onHistoryStateUpdated: 获取标签信息失败", e)
    }
  })

  // 标签关闭 => 清理本地映射（防止保存无效 id）
  chrome.tabs.onRemoved.addListener((tabId) => {
    for (const [winId, bId] of breakTabIdsByWindow) {
      if (bId === tabId) breakTabIdsByWindow.delete(winId)
    }
  })
}

// ---------------- 严格模式：打开/聚焦 休息页 ----------------
async function focusBreakTab(windowId?: number) {
  const wid = windowId ?? (await chrome.windows.getCurrent()).id!

  // 如果我们记录的休息页还在，直接聚焦
  const recorded = breakTabIdsByWindow.get(wid)
  if (recorded) {
    const ok = await updateWithRetry(recorded, { active: true })
    if (ok) return
    breakTabIdsByWindow.delete(wid)
  }

  // 查找窗口里是否已有休息页（避免重复创建）
  const tabs = await chrome.tabs.query({ windowId: wid })
  const exist = tabs.find((t) => isBreakPage(t.url))
  let tabId = exist?.id

  if (!tabId) {
    // Mark: break control
    // 严格模式进入休息且不存在休息页 → 创建并激活 Break 页面
    const created = await createTabWithRetry({ url: BREAK_URL, windowId: wid, active: true })
    tabId = created.id!
  }

  breakTabIdsByWindow.set(wid, tabId!)
  
  // Mark: break control
  // 存在休息页时将其激活到前台
  await updateWithRetry(tabId!, { active: true })
  
  // Mark: break control
  // 每次强制回拉时写入时间戳，供 Break 页面提示
  await storage.set("breakLastForcedAt", Date.now())
}

// ---------------- 公开：进入/退出 严格休息 ----------------
export async function beginStrictBreak() {
  if (!(await shouldEnforce())) return
  const windows = await chrome.windows.getAll()
  for (const w of windows) {
    if (w.id != null) await focusBreakTab(w.id)
  }
}

export async function endStrictBreak() {
  // 关闭所有休息页（用户自己开的同名页也会被关掉；如不希望，改为仅关闭映射中的）
  const tabs = await chrome.tabs.query({})
  const toClose = tabs.filter((t) => isBreakPage(t.url)).map((t) => t.id!).filter(Boolean)
  if (toClose.length) await chrome.tabs.remove(toClose as number[])
  breakTabIdsByWindow.clear()
}

// ---------------- 普通模式：对已打开页面注入遮罩 ----------------
export async function showOverlayOnAllOpenTabs() {
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] })
  for (const t of tabs) {
    if (!t.id) continue
    try {
      // 从manifest获取content script文件名
      const manifest = chrome.runtime.getManifest()
      const overlayScript = manifest.content_scripts?.find(cs => 
        cs.matches?.includes('<all_urls>')
      )?.js?.[0]
      
      if (overlayScript) {
        await chrome.scripting.executeScript({
          target: { tabId: t.id },
          files: [overlayScript]
        })
      }
    } catch (e) {
      console.warn("Inject overlay failed for tab", t.id, e)
    }
  }
}
