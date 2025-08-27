import { Storage } from "@plasmohq/storage"
import type { PomodoroState } from "~pomodoro/types"

const storage = new Storage({ area: "local" })
const STORAGE_KEY = "pomodoroState"
const BREAK_FORCED_AT = "breakLastForcedAt"

const breakTabIdsByWindow: Record<number, number> = {}
let enforcing = false
const breakUrl = chrome.runtime.getURL("tabs/break.html")

async function shouldEnforce(): Promise<boolean> {
  const s = (await storage.get<PomodoroState>(STORAGE_KEY)) as PomodoroState
  return !!(s?.config?.strictMode && (s.phase === "short" || s.phase === "long"))
}

async function nudgeForcedHint() {
  await storage.set(BREAK_FORCED_AT, Date.now())
}

async function ensureBreakTabInWindow(windowId: number, nudge = false) {
  const tabId = breakTabIdsByWindow[windowId]
  try {
    if (tabId) {
      // 检查标签是否仍然存在
      const tab = await chrome.tabs.get(tabId)
      if (tab && tab.windowId === windowId) {
        await chrome.windows.update(windowId, { focused: true })
        await chrome.tabs.update(tabId, { active: true })
        if (nudge) await nudgeForcedHint()
        return
      } else {
        // 标签不存在，从记录中删除
        delete breakTabIdsByWindow[windowId]
      }
    }
    
    // 创建新的休息标签
    const tab = await chrome.tabs.create({ windowId, url: breakUrl, active: true })
    if (tab.id) {
      breakTabIdsByWindow[windowId] = tab.id
    }
    if (nudge) await nudgeForcedHint()
  } catch (error) {
    console.error('Error ensuring break tab:', error)
    try {
      // 如果出错，尝试创建新标签
      const tab = await chrome.tabs.create({ windowId, url: breakUrl, active: true })
      if (tab.id) {
        breakTabIdsByWindow[windowId] = tab.id
      }
      if (nudge) await nudgeForcedHint()
    } catch (fallbackError) {
      console.error('Fallback tab creation failed:', fallbackError)
    }
  }
}

async function onTabActivated({ tabId, windowId }: chrome.tabs.TabActiveInfo) {
  if (!await shouldEnforce()) return
  
  const breakTabId = breakTabIdsByWindow[windowId]
  
  // 如果激活的不是休息页面，强制切回
  if (tabId !== breakTabId) {
    await ensureBreakTabInWindow(windowId, true)
  }
}

async function onWindowFocusChanged(windowId: number) {
  if (!await shouldEnforce()) return
  if (windowId === chrome.windows.WINDOW_ID_NONE) return
  await ensureBreakTabInWindow(windowId, true)
}

async function onTabRemoved(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) {
  if (!await shouldEnforce()) return
  for (const [winStr, bid] of Object.entries(breakTabIdsByWindow)) {
    if (bid === tabId) {
      delete breakTabIdsByWindow[Number(winStr)]
      const winId = removeInfo.windowId
      if (winId && winId !== chrome.windows.WINDOW_ID_NONE) {
        await ensureBreakTabInWindow(winId, true)
      }
    }
  }
}

async function onTabUpdated(tabId: number, info: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) {
  if (!await shouldEnforce()) return
  if (Object.values(breakTabIdsByWindow).includes(tabId) && info.url && info.url !== breakUrl) {
    try { await chrome.tabs.update(tabId, { url: breakUrl }) } catch {}
  }
}

export async function beginStrictBreak() {
  enforcing = true
  
  try {
    // 为所有窗口创建休息页面
    const windows = await chrome.windows.getAll({ windowTypes: ['normal'] })
    for (const window of windows) {
      if (window.id && window.id !== chrome.windows.WINDOW_ID_NONE) {
        await ensureBreakTabInWindow(window.id, false)
      }
    }
    
    // 确保最近聚焦的窗口是活跃的
    const lastFocused = await chrome.windows.getLastFocused({})
    if (lastFocused?.id && lastFocused.id !== chrome.windows.WINDOW_ID_NONE) {
      await chrome.windows.update(lastFocused.id, { focused: true })
    }
  } catch (error) {
    console.error('Failed to begin strict break:', error)
  }
}

export async function endStrictBreak() {
  enforcing = false
  const ids = Object.values(breakTabIdsByWindow)
  for (const id of ids) {
    try { await chrome.tabs.remove(id) } catch {}
  }
  for (const k of Object.keys(breakTabIdsByWindow)) delete breakTabIdsByWindow[Number(k)]
}

export function initStrictBreakKernel() {
  chrome.tabs.onActivated.addListener(onTabActivated)
  chrome.windows.onFocusChanged.addListener(onWindowFocusChanged)
  chrome.tabs.onRemoved.addListener(onTabRemoved)
  chrome.tabs.onUpdated.addListener(onTabUpdated)
}