import { Storage } from "@plasmohq/storage"
import type { PomodoroPhase, PomodoroState } from "~pomodoro/types"
import { DEFAULT_CONFIG, STORAGE_KEY } from "~pomodoro/types"

const storage = new Storage({ area: "local" })

const PHASE_ALARM = "pomodoro-phase-end"

async function ensureInitialState() {
  const state = await storage.get<PomodoroState>(STORAGE_KEY)
  if (!state) {
    const base: PomodoroState = {
      phase: "idle",
      running: false,
      cycleCount: 0,
      paused: false,
      pauseAccumMs: 0,
      config: DEFAULT_CONFIG
    }
    await storage.set(STORAGE_KEY, base)
  }
}

chrome.runtime.onInstalled.addListener(() => {
  ensureInitialState()
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== PHASE_ALARM) {
    return
  }
  const state = await storage.get<PomodoroState>(STORAGE_KEY)
  if (!state || !state.running || state.paused) {
    return
  }

  const next = getNextStateAfterPhase(state)
  await storage.set(STORAGE_KEY, next)
  await schedulePhaseEndAlarm(next)
  notifyPhase(next.phase).catch(() => {})
})

function minutesToMs(m: number) {
  return Math.round(m * 60 * 1000)
}

function calcEndsAt(now: number, phase: PomodoroPhase, cfg: PomodoroState["config"]) {
  let dur = 0
  if (phase === "focus") {
    dur = minutesToMs(cfg.focusMin)
  } else if (phase === "short") {
    dur = minutesToMs(cfg.shortMin)
  } else if (phase === "long") {
    dur = minutesToMs(cfg.longMin)
  }
  return dur ? now + dur : undefined
}

export function getNextStateAfterPhase(s: PomodoroState): PomodoroState {
  const cfg = s.config
  if (s.phase === "focus") {
    const newCycle = s.cycleCount + 1
    const nextPhase: PomodoroPhase = newCycle % cfg.longEvery === 0 ? "long" : "short"
    const now = Date.now()
    return {
      ...s,
      phase: nextPhase,
      running: true,
      startedAt: now,
      endsAt: calcEndsAt(now, nextPhase, cfg),
      paused: false,
      pausedAt: undefined,
      pauseAccumMs: 0,
      cycleCount: newCycle
    }
  }
  if (s.phase === "short" || s.phase === "long") {
    const now = Date.now()
    return {
      ...s,
      phase: "focus",
      running: true,
      startedAt: now,
      endsAt: calcEndsAt(now, "focus", s.config),
      paused: false,
      pausedAt: undefined,
      pauseAccumMs: 0
    }
  }
  return s
}

async function schedulePhaseEndAlarm(s: PomodoroState) {
  await chrome.alarms.clear(PHASE_ALARM)
  if (s.running && !s.paused && s.endsAt) {
    await chrome.alarms.create(PHASE_ALARM, { when: s.endsAt })
  }
}

async function notifyPhase(phase: PomodoroPhase) {
  try {
    const content = getNotificationContent(phase)
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: content.title,
      message: content.message,
      priority: 2
    })
  } catch {
    // ignore
  }
}

function getNotificationContent(phase: PomodoroPhase) {
  if (phase === "focus") {
    return { title: "开始专注", message: "进入专注时段" }
  }
  if (phase === "short") {
    return { title: "短休息", message: "放松一下～" }
  }
  if (phase === "long") {
    return { title: "长休息", message: "好好休息一下" }
  }
  return { title: "番茄钟", message: "" }
}

export async function startPhase(phase: PomodoroPhase) {
  const s = (await storage.get<PomodoroState>(STORAGE_KEY)) ?? {
    phase: "idle",
    running: false,
    cycleCount: 0,
    paused: false,
    pauseAccumMs: 0,
    config: DEFAULT_CONFIG
  }
  const now = Date.now()
  const next: PomodoroState = {
    ...s,
    phase,
    running: true,
    startedAt: now,
    endsAt: calcEndsAt(now, phase, s.config),
    paused: false,
    pausedAt: undefined,
    pauseAccumMs: 0
  }
  await storage.set(STORAGE_KEY, next)
  await schedulePhaseEndAlarm(next)
  notifyPhase(phase).catch(() => {})
}

export async function stopAll() {
  const s = (await storage.get<PomodoroState>(STORAGE_KEY)) as PomodoroState
  const next: PomodoroState = {
    ...s,
    phase: "idle",
    running: false,
    startedAt: undefined,
    endsAt: undefined,
    paused: false,
    pausedAt: undefined,
    pauseAccumMs: 0
  }
  await storage.set(STORAGE_KEY, next)
  await chrome.alarms.clear(PHASE_ALARM)
}

export async function pauseTimer() {
  const s = (await storage.get<PomodoroState>(STORAGE_KEY)) as PomodoroState
  if (!s?.running || s.paused) {
    return
  }
  const next: PomodoroState = {
    ...s,
    paused: true,
    pausedAt: Date.now()
  }
  await storage.set(STORAGE_KEY, next)
  await chrome.alarms.clear(PHASE_ALARM)
}

export async function resumeTimer() {
  const s = (await storage.get<PomodoroState>(STORAGE_KEY)) as PomodoroState
  if (!s?.running || !s.paused || !s.pausedAt || !s.endsAt) {
    return
  }
  const now = Date.now()
  const pausedDelta = now - s.pausedAt
  const next: PomodoroState = {
    ...s,
    paused: false,
    pausedAt: undefined,
    pauseAccumMs: (s.pauseAccumMs ?? 0) + pausedDelta,
    endsAt: s.endsAt + pausedDelta
  }
  await storage.set(STORAGE_KEY, next)
  await schedulePhaseEndAlarm(next)
}

export async function applyConfig(cfg: PomodoroState["config"]) {
  const s = (await storage.get<PomodoroState>(STORAGE_KEY)) as PomodoroState
  const next: PomodoroState = { ...s, config: cfg }
  if (next.running && next.startedAt && next.phase !== "idle") {
    const now = Date.now()
    const remaining = Math.max(0, (s.endsAt ?? now) - now)
    next.endsAt = now + remaining
  }
  await storage.set(STORAGE_KEY, next)
  if (next.running && !next.paused) {
    await schedulePhaseEndAlarm(next)
  }
}
