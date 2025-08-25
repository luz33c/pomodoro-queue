import type { PlasmoContentScript } from "plasmo"

export const config: PlasmoContentScript = {
  matches: ["<all_urls>"]
}

const KEY = "pomodoroState"

function createOverlay() {
  const overlay = document.createElement("div")
  overlay.id = "pomodoro-break-overlay"
  overlay.style.position = "fixed"
  overlay.style.top = "0"
  overlay.style.left = "0"
  overlay.style.width = "100%"
  overlay.style.height = "100%"
  overlay.style.backgroundColor = "rgba(0,0,0,0.6)"
  overlay.style.zIndex = "2147483647"
  overlay.style.display = "none"
  overlay.style.pointerEvents = "auto"
  overlay.style.cursor = "not-allowed"
  overlay.innerHTML = `
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-size:22px;text-align:center;line-height:1.7;">
      ☕ 休息时间，请离开屏幕放松一下...
    </div>`
  document.documentElement.appendChild(overlay)
  return overlay
}

const overlay = createOverlay()

function setOverlayVisible(v: boolean) {
  overlay.style.display = v ? "block" : "none"
}

function isBreakPhase(phase?: string) {
  return phase === "short" || phase === "long"
}

// 初始检查
chrome.storage.local.get([KEY], (result) => {
  const state = result[KEY]
  setOverlayVisible(isBreakPhase(state?.phase))
})

// 订阅变化
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[KEY]) return
  const newState = changes[KEY].newValue
  setOverlayVisible(isBreakPhase(newState?.phase))
})
