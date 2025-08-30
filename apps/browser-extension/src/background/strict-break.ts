import { Storage } from "@plasmohq/storage"
import type { PomodoroState } from "~model/pomodoro/types"
import { STORAGE_KEY } from "~model/pomodoro/types"

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
    
    // 普通网页，立即拉回休息页
    await focusBreakTab(windowId)
    console.log("[Pomodoro] 已激活非休息页标签，强制切回休息页")
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
    
    // 先检测休息页标签是否跳转到其他页面（防止用户在休息页地址栏输入网址逃逸）
    if (breakTabIdsByWindow.has(tab.windowId!) && breakTabIdsByWindow.get(tab.windowId!) === tabId) {
      if (change.url && !isBreakPage(change.url)) {
        // 休息页标签的URL变为非休息页，立刻拉回
        try {
          await chrome.tabs.update(tabId, { url: BREAK_URL })
          console.log("[Pomodoro] 检测到休息页标签跳转，已拉回休息页")
          return
        } catch (e) {
          console.warn("休息页标签跳转拦截失败:", e)
        }
      }
      return
    }
    
    if (isSystemOrExtPage(tab.url) || isBreakPage(tab.url)) return
    
    // 只在页面完全加载完成时才处理，避免加载过程中的误触发
    if (change.status === 'complete' && tab.active) {
      await focusBreakTab(tab.windowId!)
      console.log("[Pomodoro] 页面加载完成，强制切回休息页:", tab.url)
    }
  })

  // 新标签创建时的检查
  chrome.tabs.onCreated.addListener(async (tab) => {
    if (!(await shouldEnforce())) return
    if (isSystemOrExtPage(tab.url) || isBreakPage(tab.url)) return
    
    // 如果新标签是活动的，强制回到休息页
    if (tab.active) {
      await focusBreakTab(tab.windowId!)
      console.log("[Pomodoro] 新建标签被激活，强制切回休息页")
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
        await focusBreakTab(tab.windowId!)
        console.log("[Pomodoro] 捕获History导航，强制切回休息页:", url)
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
  
  // 激活休息页
  await chrome.tabs.update(tabId!, { active: true })
  
  // 记录强制拉回的时间戳（每次强制跳转都提示）
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