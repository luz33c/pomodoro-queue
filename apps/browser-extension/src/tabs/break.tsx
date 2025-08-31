import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import { usePomodoro } from "~hooks/pomodoro/usePomodoro"
import type { PomodoroState } from "~model/pomodoro/types"

import "./style.css"

const storage = new Storage({ area: "local" })
const BREAK_FORCED_AT = "breakLastForcedAt"

function BreakPage() {
  const { state, mmss, pause, resume, skip } = usePomodoro()
  const [showHint, setShowHint] = useState(false)
  
  // 检查是否应该关闭页面
  const shouldClose = !state?.running || (state?.phase !== 'short' && state?.phase !== 'long')
  
  useEffect(() => {
    if (shouldClose) {
      // 延迟关闭，给用户时间看到状态变化
      const timer = setTimeout(() => {
        window.close()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [shouldClose])

  // 显示被强制拉回的提示
  const flashHint = () => {
    setShowHint(true)
    setTimeout(() => setShowHint(false), 2000)
  }

  useEffect(() => {
    // 监听被强制拉回的提示
    const handleStorageChange = (changes: Record<string, any>) => {
      if (changes[BREAK_FORCED_AT]) {
        flashHint()
      }
    }

    storage.watch({
      [BREAK_FORCED_AT]: handleStorageChange
    })

    // Plasmo 会自动清理 storage watch
  }, [])
  
  const handlePause = async () => {
    await pause()
  }
  
  const handleResume = async () => {
    await resume()
  }
  
  const handleSkip = async () => {
    await skip()
  }

  const running = state?.running
  const paused = Boolean(state?.paused)
  const phase = state?.phase
  
  return (
    <div className="break-container">
      <div className={`break-hint ${showHint ? 'show' : ''}`}>
        已为你切回休息页面，专注休息
      </div>
      
      <div className="break-content">
        <div className="break-emoji">☕</div>
        <div className="break-msg">休息时间到了</div>
        <div className="breathing-circle"></div>
        <div className="break-timer">{mmss}</div>
        <div className="break-tips">
          离开屏幕，让眼睛休息<br />
          做些伸展运动或深呼吸<br />
          喝杯水，保持水分充足
        </div>
        
        {/* 低调的暂停控制按钮 */}
        {running && (phase === 'short' || phase === 'long') && (
          <div className="break-controls">
            {!paused ? (
              <button 
                className="break-control-btn break-pause-btn" 
                onClick={handlePause}
                title="暂停计时"
              >
                ⏸
              </button>
            ) : (
              <button 
                className="break-control-btn break-resume-btn" 
                onClick={handleResume}
                title="继续计时"
              >
                ▶
              </button>
            )}
            <button 
              className="break-control-btn break-skip-btn" 
              onClick={handleSkip}
              title="跳过休息"
            >
              ⏭
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default BreakPage