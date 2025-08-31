import { useEffect, useMemo, useRef, useState } from "react"
import { useStorage } from "@plasmohq/storage/hook"
import { Storage } from "@plasmohq/storage"
import { sendToBackground } from "@plasmohq/messaging"
import type { PomodoroConfig, PomodoroPhase, PomodoroState } from "~model/pomodoro/types"
import { DEFAULT_CONFIG, STORAGE_KEY } from "~model/pomodoro/types"

/**
 * usePomodoro Hook - 番茄时钟核心状态管理
 * 
 * 这是前端UI与后台脚本交互的主要接口，负责：
 * 1. 从本地存储读取番茄时钟状态
 * 2. 计算剩余时间和进度
 * 3. 提供操作方法（开始、暂停、恢复、停止、跳过、配置更新）
 * 4. 管理UI刷新频率（运行时使用RAF高频刷新，其他时候1秒刷新）
 */

// 使用与后台脚本相同的存储区域（local）
const localStorageInstance = new Storage({ area: "local" })

export function usePomodoro() {
  // 从本地存储订阅番茄时钟状态，与后台脚本共享同一存储
  const [state] = useStorage<PomodoroState>(
    {
      key: STORAGE_KEY,
      instance: localStorageInstance
    },
    // 存储为空时的默认值
    {
      phase: "idle",         // 当前阶段：空闲
      running: false,        // 是否正在运行
      cycleCount: 0,         // 已完成的专注周期数
      paused: false,         // 是否暂停
      pauseAccumMs: 0,       // 累积暂停时长（毫秒）
      config: DEFAULT_CONFIG // 默认配置
    } satisfies PomodoroState
  )

  // 当前时间戳状态，用于计算剩余时间
  const [now, setNow] = useState(() => Date.now())
  // requestAnimationFrame的引用，用于高频刷新
  const frameRef = useRef<number | null>(null)
  // setInterval的引用，用于低频刷新
  const tickRef = useRef<number | null>(null)

  // 时间刷新机制：根据运行状态选择不同的刷新频率
  useEffect(() => {
    const tick = () => setNow(Date.now())
    
    // 高频刷新：使用requestAnimationFrame，约60fps
    const startRaf = () => {
      const loop = () => {
        tick()
        frameRef.current = requestAnimationFrame(loop)
      }
      frameRef.current = requestAnimationFrame(loop)
    }
    
    // 低频刷新：使用setInterval，每秒一次
    const startInterval = () => {
      tickRef.current = window.setInterval(tick, 1000)
    }

    // 运行且未暂停时使用RAF进行高频刷新，保证倒计时的流畅性
    // 其他情况使用1秒间隔刷新，节省性能
    if (state?.running && !state.paused) startRaf()
    else startInterval()

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [state?.running, state?.paused])

  // 计算剩余时间（毫秒）
  const remainMs = useMemo(() => {
    // 如果没有运行或没有结束时间，返回0
    if (!state?.running || !state?.endsAt) return 0
    
    // 如果已暂停，计算暂停时的剩余时间（不随时间变化）
    if (state.paused) return Math.max(0, (state.endsAt ?? now) - (state.pausedAt ?? now))
    
    // 正常运行时，计算当前的剩余时间
    return Math.max(0, state.endsAt - now)
  }, [state?.running, state?.endsAt, state?.paused, state?.pausedAt, now])

  // 计算当前阶段的总时长（毫秒）
  const totalMs = useMemo(() => {
    if (!state) return 0
    const { config, phase } = state
    let minutes = 0
    
    // 根据当前阶段获取对应的分钟数配置
    if (phase === "focus") minutes = config.focusMin        // 专注时间
    else if (phase === "short") minutes = config.shortMin   // 短休息时间
    else if (phase === "long") minutes = config.longMin     // 长休息时间
    
    return Math.round(minutes * 60 * 1000) // 转换为毫秒
  }, [state])

  // 计算进度百分比（0-1）
  const progress = totalMs > 0 ? 1 - remainMs / totalMs : 0
  // 格式化剩余时间为 MM:SS 格式
  const mmss = useMemo(() => formatMs(remainMs), [remainMs])

  return {
    // 状态数据
    state,           // 完整的番茄时钟状态
    remainMs,        // 剩余时间（毫秒）
    totalMs,         // 总时长（毫秒）
    progress,        // 进度（0-1）
    mmss,            // 格式化的剩余时间（MM:SS）
    
    // 操作方法 - 通过消息传递与后台脚本通信
    start: (phase: PomodoroPhase = "focus") => 
      sendToBackground<{ phase?: PomodoroPhase }, { ok: true }>({ 
        name: "pomodoro.start", 
        body: { phase } 
      }),
    pause: () => 
      sendToBackground<never, { ok: true }>({ 
        name: "pomodoro.pause" 
      }),
    resume: () => 
      sendToBackground<never, { ok: true }>({ 
        name: "pomodoro.resume" 
      }),
    stop: () => 
      sendToBackground<never, { ok: true }>({ 
        name: "pomodoro.stop" 
      }),
    skip: () => 
      sendToBackground<never, { ok: true }>({ 
        name: "pomodoro.skip" 
      }),
    updateConfig: (cfg: PomodoroConfig) => 
      sendToBackground<PomodoroConfig, { ok: true }>({ 
        name: "pomodoro.config.update", 
        body: cfg 
      })
  }
}

/**
 * 格式化毫秒为 MM:SS 格式的时间字符串
 * @param ms 毫秒数
 * @returns 格式化的时间字符串，如 "25:00"、"03:47"
 */
function formatMs(ms: number) {
  const s = Math.ceil(ms / 1000)  // 向上取整到秒
  const m = Math.floor(s / 60)    // 计算分钟数
  const r = s % 60                // 计算剩余秒数
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
}
