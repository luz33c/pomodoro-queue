export type SegmentType = 'work' | 'shortBreak' | 'longBreak';

export type QueueRules = {
  workDuration: number; // 秒（默认 1500）
  shortBreak: number; // 秒（默认 300，可 0）
  longBreak: number; // 秒（默认 1200，可 0）
  longEvery: number; // >=2（默认 4）
};

export type Segment = {
  id: string;
  type: SegmentType;
  title: string; // '专注时段' | '短休息' | '长休息'
  duration: number; // 秒
  startedAt?: number; // epoch ms
  endedAt?: number; // epoch ms
  remaining?: number; // 暂停时的剩余秒
  status: 'pending' | 'running' | 'done';
};

export type QueueState = {
  rules: QueueRules | null;
  current: Segment | null;
  status: 'idle' | 'running' | 'paused' | 'terminated';
  history: Segment[]; // 已完成段
  workCount: number; // 已完成 work 段累计
  deadline: number | null; // 当前段结束时间戳（ms）
};

// 常量
export const SEC_PER_MIN = 60;
export const MS_PER_SEC = 1000;
export const UI_TICK_MS = 500;
export const MIN_RESTORE_AHEAD_MS = 100;
export const NUMBER_RADIX = 36;
export const RANDOM_SLICE_PREFIX = 2;
export const DEFAULT_WORK_MIN = 25;
export const DEFAULT_SHORT_MIN = 5;
export const DEFAULT_LONG_MIN = 20;

export const DEFAULT_RULES: QueueRules = {
  workDuration: DEFAULT_WORK_MIN * SEC_PER_MIN,
  shortBreak: DEFAULT_SHORT_MIN * SEC_PER_MIN,
  longBreak: DEFAULT_LONG_MIN * SEC_PER_MIN,
  longEvery: 4,
};

export const STORAGE_KEYS = {
  STATE: 'pomodoro:state',
} as const;

export function uid(): string {
  // 轻量无依赖 uuid
  const a = Math.random().toString(NUMBER_RADIX).slice(RANDOM_SLICE_PREFIX);
  const b = Date.now().toString(NUMBER_RADIX);
  return `${a}${b}`;
}

export function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / SEC_PER_MIN);
  const ss = s % SEC_PER_MIN;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function segmentTitle(type: SegmentType): string {
  if (type === 'work') {
    return '专注时段';
  }
  if (type === 'shortBreak') {
    return '短休息';
  }
  return '长休息';
}
