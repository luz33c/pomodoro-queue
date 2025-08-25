export type PomodoroPhase = "idle" | "focus" | "short" | "long";

export type PomodoroConfig = {
  focusMin: number; // minutes
  shortMin: number; // minutes
  longMin: number; // minutes
  longEvery: number; // take long break after N focus sessions
};

export type PomodoroState = {
  phase: PomodoroPhase;
  running: boolean;
  cycleCount: number; // number of completed focus sessions in the current long-break cycle
  startedAt?: number; // epoch ms when the current phase started (excluding pauses)
  endsAt?: number; // epoch ms when the current phase should end (derived)
  paused: boolean;
  pausedAt?: number; // epoch ms when paused
  pauseAccumMs: number; // sum of pauses since current phase started
  config: PomodoroConfig;
};

export type PomodoroHistoryEntry = {
  id: string;
  phase: Exclude<PomodoroPhase, "idle">;
  title: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
};

export const DEFAULT_CONFIG: PomodoroConfig = {
  focusMin: 25,
  shortMin: 5,
  longMin: 20,
  longEvery: 4,
};

export const STORAGE_KEY = "pomodoroState" as const;
export const HISTORY_KEY = "pomodoroHistory" as const;
