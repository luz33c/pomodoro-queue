import { Storage } from '@plasmohq/storage';
import type {
  PomodoroHistoryEntry,
  PomodoroPhase,
  PomodoroState,
} from '~model/pomodoro/types';
import { DEFAULT_CONFIG, HISTORY_KEY, STORAGE_KEY, CURRENT_QUEUE_KEY, type CurrentQueue } from '~model/pomodoro/types';
import { beginStrictBreak, endStrictBreak, initStrictBreakKernel, showOverlayOnAllOpenTabs } from './strict-break';

const storage = new Storage({ area: 'local' });

const PHASE_ALARM = 'pomodoro-phase-end';

// Initialize strict break kernel
initStrictBreakKernel();

function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function getCurrentQueue(): Promise<CurrentQueue | null> {
  return (await storage.get<CurrentQueue>(CURRENT_QUEUE_KEY)) ?? null;
}

async function ensureCurrentQueue(now: number): Promise<CurrentQueue> {
  const existing = await getCurrentQueue();
  if (existing) return existing;
  const q: CurrentQueue = { id: genId(), startedAt: now };
  await storage.set(CURRENT_QUEUE_KEY, q);
  return q;
}

async function clearCurrentQueue() {
  await storage.set(CURRENT_QUEUE_KEY, null as unknown as undefined);
}

async function pushHistory(entry: PomodoroHistoryEntry) {
  const list = (await storage.get<PomodoroHistoryEntry[]>(HISTORY_KEY)) ?? [];
  const q = await getCurrentQueue();
  list.push({ ...entry, queueId: q?.id });
  await storage.set(HISTORY_KEY, list);
}

async function ensureInitialState() {
  const state = await storage.get<PomodoroState>(STORAGE_KEY);
  if (!state) {
    const base: PomodoroState = {
      phase: 'idle',
      running: false,
      cycleCount: 0,
      paused: false,
      pauseAccumMs: 0,
      config: DEFAULT_CONFIG,
    };
    await storage.set(STORAGE_KEY, base);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  ensureInitialState();
});

// Check strict mode on startup
chrome.runtime.onStartup.addListener(async () => {
  const s = await storage.get<PomodoroState>(STORAGE_KEY);
  const inBreak = s?.phase === "short" || s?.phase === "long"
  if (inBreak && s?.config?.strictMode) {
    await beginStrictBreak();
  } else if (inBreak && !s?.config?.strictMode) {
    await showOverlayOnAllOpenTabs();
  } else {
    await endStrictBreak();
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== PHASE_ALARM) {
    return;
  }
  const state = await storage.get<PomodoroState>(STORAGE_KEY);
  if (!(state && state.running) || state.paused) {
    return;
  }

  // 检查刚完成的阶段是否为休息状态
  const wasInBreak = state.phase === 'short' || state.phase === 'long';

  // 记录刚完成的阶段（state）
  if (state.phase !== 'idle' && state.startedAt) {
    const endedAt = Date.now();
    const durationMs = Math.max(0, endedAt - state.startedAt);
    const title =
      state.phase === 'focus'
        ? '专注时段'
        : state.phase === 'short'
          ? '短休息'
          : '长休息';
    await pushHistory({
      id: genId(),
      phase: state.phase,
      title,
      startedAt: state.startedAt,
      endedAt,
      durationMs,
    });
  }

  let next = getNextStateAfterPhase(state);

  // 若下一阶段为 0 分钟休息，直接跳过进入专注
  if ((next.phase === 'short' || next.phase === 'long') && !next.endsAt) {
    next = getNextStateAfterPhase(next);
  }

  await storage.set(STORAGE_KEY, next);
  await schedulePhaseEndAlarm(next);
  notifyPhase(next.phase).catch(() => {});
  
  // Handle strict mode transitions
  if (next.config?.strictMode && (next.phase === 'short' || next.phase === 'long')) {
    await beginStrictBreak();
  } else if (!next.config?.strictMode && (next.phase === 'short' || next.phase === 'long')) {
    // 普通模式：覆盖遮罩
    await showOverlayOnAllOpenTabs();
    await endStrictBreak(); // 确保不存在遗留的严格模式状态
  } else {
    // 进入专注或idle状态，关闭Break页面
    await endStrictBreak();
    
    // 如果从休息状态自然结束，确保关闭Break页面
    if (wasInBreak) {
      // endStrictBreak已经处理了页面关闭，这里是额外确认
      console.log('[Pomodoro] 休息阶段自然结束，已关闭Break页面');
    }
  }
});

function minutesToMs(m: number) {
  return Math.round(m * 60 * 1000);
}

function calcEndsAt(
  now: number,
  phase: PomodoroPhase,
  cfg: PomodoroState['config']
) {
  let dur = 0;
  if (phase === 'focus') {
    dur = minutesToMs(cfg.focusMin);
  } else if (phase === 'short') {
    dur = minutesToMs(cfg.shortMin);
  } else if (phase === 'long') {
    dur = minutesToMs(cfg.longMin);
  }
  return dur ? now + dur : undefined;
}

export function getNextStateAfterPhase(s: PomodoroState): PomodoroState {
  const cfg = s.config;
  if (s.phase === 'focus') {
    const newCycle = s.cycleCount + 1;
    const nextPhase: PomodoroPhase =
      newCycle % cfg.longEvery === 0 ? 'long' : 'short';
    const now = Date.now();
    return {
      ...s,
      phase: nextPhase,
      running: true,
      startedAt: now,
      endsAt: calcEndsAt(now, nextPhase, cfg),
      paused: false,
      pausedAt: undefined,
      pauseAccumMs: 0,
      cycleCount: newCycle,
    };
  }
  if (s.phase === 'short' || s.phase === 'long') {
    const now = Date.now();
    return {
      ...s,
      phase: 'focus',
      running: true,
      startedAt: now,
      endsAt: calcEndsAt(now, 'focus', s.config),
      paused: false,
      pausedAt: undefined,
      pauseAccumMs: 0,
    };
  }
  return s;
}

export async function schedulePhaseEndAlarm(s: PomodoroState) {
  await chrome.alarms.clear(PHASE_ALARM);
  if (s.running && !s.paused && s.endsAt) {
    await chrome.alarms.create(PHASE_ALARM, { when: s.endsAt });
  }
}

export async function notifyPhase(phase: PomodoroPhase) {
  try {
    const content = getNotificationContent(phase);
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: content.title,
      message: content.message,
      priority: 2,
    });
  } catch {
    // ignore
  }
}

function getNotificationContent(phase: PomodoroPhase) {
  if (phase === 'focus') {
    return { title: '开始专注', message: '进入专注时段' };
  }
  if (phase === 'short') {
    return { title: '短休息', message: '放松一下～' };
  }
  if (phase === 'long') {
    return { title: '长休息', message: '好好休息一下' };
  }
  return { title: '番茄钟', message: '' };
}

export async function startPhase(phase: PomodoroPhase) {
  const s = (await storage.get<PomodoroState>(STORAGE_KEY)) ?? {
    phase: 'idle',
    running: false,
    cycleCount: 0,
    paused: false,
    pauseAccumMs: 0,
    config: DEFAULT_CONFIG,
  };
  const now = Date.now();

  // If starting from idle/not running, create a new current queue
  if (!s.running || s.phase === 'idle') {
    await ensureCurrentQueue(now);
  }

  const next: PomodoroState = {
    ...s,
    phase,
    running: true,
    startedAt: now,
    endsAt: calcEndsAt(now, phase, s.config),
    paused: false,
    pausedAt: undefined,
    pauseAccumMs: 0,
  };
  await storage.set(STORAGE_KEY, next);
  await schedulePhaseEndAlarm(next);
  notifyPhase(phase).catch(() => {});
  
  // Handle strict mode when starting a phase
  if (next.config?.strictMode && (phase === 'short' || phase === 'long')) {
    await beginStrictBreak();
  } else if (!next.config?.strictMode && (phase === 'short' || phase === 'long')) {
    // 普通模式：覆盖遮罩
    await showOverlayOnAllOpenTabs();
    await endStrictBreak(); // 确保不存在遗留的严格模式状态
  } else {
    await endStrictBreak();
  }
}

export async function stopAll() {
  const s = (await storage.get<PomodoroState>(STORAGE_KEY)) as PomodoroState;
  // 终止时将当前段记入历史
  if (s?.running && s.phase !== 'idle' && s.startedAt) {
    const endedAt = Date.now();
    const title =
      s.phase === 'focus'
        ? '专注时段'
        : s.phase === 'short'
          ? '短休息'
          : '长休息';
    await pushHistory({
      id: genId(),
      phase: s.phase,
      title,
      startedAt: s.startedAt,
      endedAt,
      durationMs: Math.max(0, endedAt - s.startedAt),
    });
  }
  const next: PomodoroState = {
    ...s,
    phase: 'idle',
    running: false,
    cycleCount: 0,
    startedAt: undefined,
    endsAt: undefined,
    paused: false,
    pausedAt: undefined,
    pauseAccumMs: 0,
  };
  await storage.set(STORAGE_KEY, next);
  await chrome.alarms.clear(PHASE_ALARM);
  await clearCurrentQueue();
  // End strict mode when stopping
  await endStrictBreak();
}
 
export async function pauseTimer() {
  const s = (await storage.get<PomodoroState>(STORAGE_KEY)) as PomodoroState;
  if (!s?.running || s.paused) {
    return;
  }
  const next: PomodoroState = {
    ...s,
    paused: true,
    pausedAt: Date.now(),
  };
  await storage.set(STORAGE_KEY, next);
  await chrome.alarms.clear(PHASE_ALARM);
}

export async function resumeTimer() {
  const s = (await storage.get<PomodoroState>(STORAGE_KEY)) as PomodoroState;
  if (!(s?.running && s.paused && s.pausedAt && s.endsAt)) {
    return;
  }
  const now = Date.now();
  const pausedDelta = now - s.pausedAt;
  const next: PomodoroState = {
    ...s,
    paused: false,
    pausedAt: undefined,
    pauseAccumMs: (s.pauseAccumMs ?? 0) + pausedDelta,
    endsAt: s.endsAt + pausedDelta,
  };
  await storage.set(STORAGE_KEY, next);
  await schedulePhaseEndAlarm(next);
}

export async function applyConfig(cfg: PomodoroState['config']) {
  const s = (await storage.get<PomodoroState>(STORAGE_KEY)) as PomodoroState;
  const next: PomodoroState = { ...s, config: cfg };
  if (next.running && next.startedAt && next.phase !== 'idle') {
    const now = Date.now();
    const remaining = Math.max(0, (s.endsAt ?? now) - now);
    next.endsAt = now + remaining;
  }
  await storage.set(STORAGE_KEY, next);
  if (next.running && !next.paused) {
    await schedulePhaseEndAlarm(next);
  }
  
  // Handle strict mode toggle in config
  if (s && s.running && (s.phase === 'short' || s.phase === 'long')) {
    if (cfg.strictMode && !s.config?.strictMode) {
      await beginStrictBreak();
    } else if (!cfg.strictMode && s.config?.strictMode) {
      await showOverlayOnAllOpenTabs(); // 切换到普通模式时注入遮罩
      await endStrictBreak();
    }
  }
}
