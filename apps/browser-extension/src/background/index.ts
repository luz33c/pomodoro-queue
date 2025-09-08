import { Storage } from '@plasmohq/storage';
import type {
  PomodoroHistoryEntry,
  PomodoroPhase,
  PomodoroState,
} from '~model/pomodoro/types';
import {
  CURRENT_QUEUE_KEY,
  type CurrentQueue,
  DEFAULT_CONFIG,
  HISTORY_KEY,
  STORAGE_KEY,
} from '~model/pomodoro/types';
import {
  beginStrictBreak,
  endStrictBreak,
  initStrictBreakKernel,
  showOverlayOnAllOpenTabs,
} from './strict-break';

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

// 默认值设置
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
  const inBreak = s?.phase === 'short' || s?.phase === 'long';
  if (inBreak && s?.config?.strictMode) {
    // Mark: break control
    // 启动时检测到处于休息且为严格模式 → 打开/聚焦 Break 页面
    await beginStrictBreak();
  } else if (inBreak && !s?.config?.strictMode) {
    // Mark: break control
    // 启动时处于休息但非严格模式 → 为所有页面注入遮罩
    await showOverlayOnAllOpenTabs();
  } else {
    // Mark: break control
    // 启动时不在休息 → 确保关闭所有 Break 页面
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
        ? chrome.i18n.getMessage('phaseFocus')
        : state.phase === 'short'
          ? chrome.i18n.getMessage('phaseShortBreak')
          : chrome.i18n.getMessage('phaseLongBreak');
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
  if (
    next.config?.strictMode &&
    (next.phase === 'short' || next.phase === 'long')
  ) {
    // Mark: break control
    // 阶段自然切换到休息（严格模式） → 打开/聚焦 Break 页面
    await beginStrictBreak();
  } else if (
    !next.config?.strictMode &&
    (next.phase === 'short' || next.phase === 'long')
  ) {
    // 普通模式：覆盖遮罩
    // Mark: break control
    // 阶段自然切换到休息（普通模式） → 注入遮罩并清理严格模式
    await showOverlayOnAllOpenTabs();
    // Mark: break control
    // 清理可能遗留的严格模式 Break 页面
    await endStrictBreak(); // 确保不存在遗留的严格模式状态
  } else {
    // 进入专注或idle状态，关闭Break页面
    // Mark: break control
    // 切换到专注或 idle → 关闭 Break 页面
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

// 解析扩展内图标地址（适配 Plasmo dev/prod 路径），避免下载失败
function getExtensionIconUrl(): string | null {
  const manifest = chrome.runtime.getManifest();
  const iconPath =
    manifest.icons?.['128'] ||
    manifest.icons?.['64'] ||
    (manifest.icons ? Object.values(manifest.icons)[0] : undefined);
  if (!iconPath) return null;
  try {
    return chrome.runtime.getURL(iconPath);
  } catch {
    return null;
  }
}

export async function notifyPhase(phase: PomodoroPhase) {
  try {
    // 仅在进入休息阶段，且开关为开启时发送通知
    if (!(phase === 'short' || phase === 'long')) return;
    const s = await storage.get<PomodoroState>(STORAGE_KEY);
    if (!s?.config?.enableBreakNotifications) return;

    const iconUrl = getExtensionIconUrl();
    const content = getNotificationContent(phase);

    // 严格校验必填参数，避免报错
    if (!iconUrl || !content?.title || !content?.message) return;

    await chrome.notifications.create({
      type: 'basic',
      iconUrl,
      title: content.title,
      message: content.message,
      priority: 2,
    });
  } catch {
    // 忽略通知失败
  }
}

function getNotificationContent(phase: PomodoroPhase) {
  if (phase === 'focus') {
    return {
      title: chrome.i18n.getMessage('notificationFocusTitle'),
      message: chrome.i18n.getMessage('notificationFocusMessage'),
    };
  }
  if (phase === 'short') {
    return {
      title: chrome.i18n.getMessage('notificationShortBreakTitle'),
      message: chrome.i18n.getMessage('notificationShortBreakMessage'),
    };
  }
  if (phase === 'long') {
    return {
      title: chrome.i18n.getMessage('notificationLongBreakTitle'),
      message: chrome.i18n.getMessage('notificationLongBreakMessage'),
    };
  }
  return { title: chrome.i18n.getMessage('pomodoroTimer'), message: '' };
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
    // Mark: break control
    // 用户开始短/长休息（严格模式） → 打开/聚焦 Break 页面
    await beginStrictBreak();
  } else if (
    !next.config?.strictMode &&
    (phase === 'short' || phase === 'long')
  ) {
    // 普通模式：覆盖遮罩
    // Mark: break control
    // 用户开始短/长休息（普通模式） → 注入遮罩并清理严格模式
    await showOverlayOnAllOpenTabs();
    // Mark: break control
    // 确保不存在遗留的严格模式 Break 页面
    await endStrictBreak(); // 确保不存在遗留的严格模式状态
  } else {
    // Mark: break control
    // 用户开始专注或 idle → 关闭 Break 页面
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
        ? chrome.i18n.getMessage('phaseFocus')
        : s.phase === 'short'
          ? chrome.i18n.getMessage('phaseShortBreak')
          : chrome.i18n.getMessage('phaseLongBreak');
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
  // Mark: break control
  // 用户点击“停止” → 关闭 Break 页面并退出严格模式
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
      // Mark: break control
      // 休息中将配置从“普通”切到“严格” → 打开/聚焦 Break 页面
      await beginStrictBreak();
    } else if (!cfg.strictMode && s.config?.strictMode) {
      // Mark: break control
      // 休息中将配置从“严格”切到“普通” → 为所有页面注入遮罩
      await showOverlayOnAllOpenTabs(); // 切换到普通模式时注入遮罩
      // Mark: break control
      // 切换到普通模式时关闭严格模式 Break 页面
      await endStrictBreak();
    }
  }
}
