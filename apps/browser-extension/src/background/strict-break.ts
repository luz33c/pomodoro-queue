import { Storage } from "@plasmohq/storage"
import type { PomodoroState } from "~pomodoro/types"
import { STORAGE_KEY } from "~pomodoro/types"

type Phase = "idle" | "focus" | "short" | "long"

const storage = new Storage({ area: "local" })
const BREAK_URL = chrome.runtime.getURL("tabs/break.html")

let kernelInited = false
const breakTabIdsByWindow = new Map<number, number>()

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
    
    // 如果激活的就是休息页，不需要再切换
    const tab = await chrome.tabs.get(tabId)
    if (isBreakPage(tab.url)) return
    
    await focusBreakTab(windowId)
  })

  // 窗口焦点变更 => 拉回休息页
  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return
    if (!(await shouldEnforce())) return
    await focusBreakTab(windowId)
  })

  // 页面地址/加载变化 => 如果跳向非休息页，立刻拉回
  chrome.tabs.onUpdated.addListener(async (tabId, change, tab) => {
    if (!(await shouldEnforce())) return
    if (isSystemOrExtPage(tab.url) || isBreakPage(tab.url)) return
    
    // 只在页面完全加载完成时才处理，避免加载过程中的误触发
    if (change.status === 'complete' && tab.active) {
      await focusBreakTab(tab.windowId!)
    }
  })

  // 新标签创建时的检查
  chrome.tabs.onCreated.addListener(async (tab) => {
    if (!(await shouldEnforce())) return
    if (isSystemOrExtPage(tab.url) || isBreakPage(tab.url)) return
    
    // 如果新标签是活动的，强制回到休息页
    if (tab.active) {
      await focusBreakTab(tab.windowId!)
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
    try {
      await chrome.tabs.update(recorded, { active: true })
      return
    } catch {
      breakTabIdsByWindow.delete(wid)
    }
  }

  // 查找窗口里是否已有休息页（避免重复创建）
  const tabs = await chrome.tabs.query({ windowId: wid })
  const exist = tabs.find((t) => isBreakPage(t.url))
  let tabId = exist?.id

  if (!tabId) {
    const created = await chrome.tabs.create({ url: BREAK_URL, windowId: wid, active: true })
    tabId = created.id!
  }

  breakTabIdsByWindow.set(wid, tabId!)
  
  // 激活休息页并记录强制拉回的时间戳
  await chrome.tabs.update(tabId!, { active: true })
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