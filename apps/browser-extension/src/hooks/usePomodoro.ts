import { useEffect, useMemo, useRef, useState } from "react"
import { useStorage } from "@plasmohq/storage/hook"
import { Storage } from "@plasmohq/storage"
import { sendToBackground } from "@plasmohq/messaging"
import type { PomodoroConfig, PomodoroPhase, PomodoroState } from "~pomodoro/types"
import { DEFAULT_CONFIG, STORAGE_KEY } from "~pomodoro/types"

// Use the same storage area as background (local)
const localStorageInstance = new Storage({ area: "local" })

export function usePomodoro() {
  const [state] = useStorage<PomodoroState>(
    {
      key: STORAGE_KEY,
      instance: localStorageInstance
    },
    // Default value when storage is empty
    {
      phase: "idle",
      running: false,
      cycleCount: 0,
      paused: false,
      pauseAccumMs: 0,
      config: DEFAULT_CONFIG
    } satisfies PomodoroState
  )

  const [now, setNow] = useState(() => Date.now())
  const frameRef = useRef<number | null>(null)
  const tickRef = useRef<number | null>(null)

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const startRaf = () => {
      const loop = () => {
        tick()
        frameRef.current = requestAnimationFrame(loop)
      }
      frameRef.current = requestAnimationFrame(loop)
    }
    const startInterval = () => {
      tickRef.current = window.setInterval(tick, 1000)
    }

    // 运行且未暂停时使用 rAF，否则 1s 刷新
    if (state?.running && !state.paused) startRaf()
    else startInterval()

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [state?.running, state?.paused])

  const remainMs = useMemo(() => {
    if (!state?.running || !state?.endsAt) return 0
    if (state.paused) return Math.max(0, (state.endsAt ?? now) - (state.pausedAt ?? now))
    return Math.max(0, state.endsAt - now)
  }, [state?.running, state?.endsAt, state?.paused, state?.pausedAt, now])

  const totalMs = useMemo(() => {
    if (!state) return 0
    const { config, phase } = state
    let m = 0
    if (phase === "focus") m = config.focusMin
    else if (phase === "short") m = config.shortMin
    else if (phase === "long") m = config.longMin
    return Math.round(m * 60 * 1000)
  }, [state])

  const progress = totalMs > 0 ? 1 - remainMs / totalMs : 0
  const mmss = useMemo(() => formatMs(remainMs), [remainMs])

  return {
    state,
    remainMs,
    totalMs,
    progress,
    mmss,
    start: (phase: PomodoroPhase = "focus") => sendToBackground<{ phase?: PomodoroPhase }, { ok: true }>({ name: "pomodoro.start", body: { phase } }),
    pause: () => sendToBackground<never, { ok: true }>({ name: "pomodoro.pause" }),
    resume: () => sendToBackground<never, { ok: true }>({ name: "pomodoro.resume" }),
    stop: () => sendToBackground<never, { ok: true }>({ name: "pomodoro.stop" }),
    skip: () => sendToBackground<never, { ok: true }>({ name: "pomodoro.skip" }),
    updateConfig: (cfg: PomodoroConfig) => sendToBackground<PomodoroConfig, { ok: true }>({ name: "pomodoro.config.update", body: cfg })
  }
}

function formatMs(ms: number) {
  const s = Math.ceil(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
}
