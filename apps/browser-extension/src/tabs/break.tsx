import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import type { PomodoroState } from "~model/pomodoro/types"

import "./style.css"

const storage = new Storage({ area: "local" })
const BREAK_FORCED_AT = "breakLastForcedAt"
const STORAGE_KEY = "pomodoroState"

function formatTime(ms: number): string {
  if (ms <= 0) return "00:00"
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function BreakPage() {
  const [timeLeft, setTimeLeft] = useState("--:--")
  const [showHint, setShowHint] = useState(false)

  // 更新倒计时
  const updateTimer = async () => {
    try {
      const state = await storage.get<PomodoroState>(STORAGE_KEY)
      if (state?.endsAt && (state.phase === 'short' || state.phase === 'long')) {
        const remaining = state.endsAt - Date.now()
        setTimeLeft(formatTime(Math.max(0, remaining)))
      }
    } catch (error) {
      console.error("Failed to update timer:", error)
    }
  }

  // 显示被强制拉回的提示
  const flashHint = () => {
    setShowHint(true)
    setTimeout(() => setShowHint(false), 2000)
  }

  useEffect(() => {
    // 初始更新
    updateTimer()
    
    // 定时更新倒计时
    const interval = setInterval(updateTimer, 1000)

    // 监听存储变化
    const handleStorageChange = (changes: Record<string, any>) => {
      if (changes[BREAK_FORCED_AT]) {
        flashHint()
      }
      if (changes[STORAGE_KEY]) {
        updateTimer()
      }
    }

    storage.watch({
      [BREAK_FORCED_AT]: handleStorageChange,
      [STORAGE_KEY]: handleStorageChange
    })

    return () => {
      clearInterval(interval)
      // Plasmo 会自动清理 storage watch
    }
  }, [])

  return (
    <div className="break-container">
      <div className={`break-hint ${showHint ? 'show' : ''}`}>
        已为你切回休息页面，专注休息
      </div>
      
      <div className="break-content">
        <div className="break-emoji">☕</div>
        <div className="break-msg">休息时间到了</div>
        <div className="breathing-circle"></div>
        <div className="break-timer">{timeLeft}</div>
        <div className="break-tips">
          离开屏幕，让眼睛休息<br />
          做些伸展运动或深呼吸<br />
          喝杯水，保持水分充足
        </div>
      </div>
    </div>
  )
}

export default BreakPage