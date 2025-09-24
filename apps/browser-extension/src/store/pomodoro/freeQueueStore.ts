import { Storage } from '@plasmohq/storage';
import {
  CURRENT_QUEUE_KEY,
  HISTORY_KEY,
  type CurrentQueue,
  type PomodoroHistoryEntry,
  type PomodoroQueueMode,
} from '~model/pomodoro/types';

const storage = new Storage({ area: 'local' });

export const FREE_MODE: PomodoroQueueMode = 'free';
export const FREE_MODE_CURRENT_QUEUE_KEY = CURRENT_QUEUE_KEY;
export const FREE_MODE_HISTORY_KEY = HISTORY_KEY;

const QUEUE_ID_PREFIX = 'free';

type StoredCurrentQueue = {
  id: string;
  startedAt: number;
  mode?: PomodoroQueueMode;
  label?: string;
};

type StoredHistoryEntry = PomodoroHistoryEntry;

function withFreeMode(queue: StoredCurrentQueue | null): CurrentQueue | null {
  if (!queue) return null;
  return {
    id: queue.id,
    startedAt: queue.startedAt,
    mode: queue.mode ?? FREE_MODE,
    label: queue.label,
  };
}

function buildQueueId(now: number) {
  return `${QUEUE_ID_PREFIX}-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function startOfLocalDay(ts: number) {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function isSameLocalDate(a: number, b: number) {
  return startOfLocalDay(a) === startOfLocalDay(b);
}

export async function getFreeModeQueue(): Promise<CurrentQueue | null> {
  const stored = (await storage.get<StoredCurrentQueue | null>(
    FREE_MODE_CURRENT_QUEUE_KEY
  )) ?? null;
  return withFreeMode(stored);
}

async function setFreeModeQueue(queue: CurrentQueue) {
  await storage.set(FREE_MODE_CURRENT_QUEUE_KEY, queue);
}

async function clearFreeModeQueueMeta() {
  await storage.set(
    FREE_MODE_CURRENT_QUEUE_KEY,
    null as unknown as undefined
  );
}

export async function ensureFreeModeQueue(now: number) {
  const existing = await getFreeModeQueue();
  if (existing && isSameLocalDate(existing.startedAt, now)) {
    return existing;
  }
  if (existing) {
    await clearFreeModeData();
  }
  const next: CurrentQueue = {
    id: buildQueueId(now),
    startedAt: now,
    mode: FREE_MODE,
  };
  await setFreeModeQueue(next);
  return next;
}

export async function clearFreeModeData() {
  await clearFreeModeQueueMeta();
  await storage.set(FREE_MODE_HISTORY_KEY, [] as PomodoroHistoryEntry[]);
}

function normalizeHistoryEntry(entry: StoredHistoryEntry) {
  return {
    ...entry,
    mode: entry.mode ?? FREE_MODE,
  } satisfies PomodoroHistoryEntry;
}

function belongsToQueue(
  entry: PomodoroHistoryEntry,
  queue: CurrentQueue | null
) {
  if (!queue) return false;
  if (entry.queueId) return entry.queueId === queue.id;
  return true;
}

function isTodayEntry(entry: PomodoroHistoryEntry, now: number) {
  return (
    isSameLocalDate(entry.startedAt, now) || isSameLocalDate(entry.endedAt, now)
  );
}

export async function appendFreeModeHistory(entry: PomodoroHistoryEntry) {
  const queue = await getFreeModeQueue();
  const current = (await storage.get<PomodoroHistoryEntry[] | null>(
    FREE_MODE_HISTORY_KEY
  )) ?? [];
  const nextEntry = normalizeHistoryEntry({
    ...entry,
    queueId: queue?.id ?? entry.queueId,
    mode: FREE_MODE,
  });
  current.push(nextEntry);
  await storage.set(FREE_MODE_HISTORY_KEY, current);
}

export async function pruneFreeModeHistory(now: number) {
  const queue = await getFreeModeQueue();
  const stored = (await storage.get<PomodoroHistoryEntry[] | null>(
    FREE_MODE_HISTORY_KEY
  )) ?? [];
  const filtered = stored.filter((entry) => {
    const normalized = normalizeHistoryEntry(entry);
    if (normalized.mode !== FREE_MODE) return false;
    if (!isTodayEntry(normalized, now)) return false;
    return belongsToQueue(normalized, queue);
  });
  if (!queue) {
    if (stored.length > 0) {
      await storage.set(FREE_MODE_HISTORY_KEY, [] as PomodoroHistoryEntry[]);
    }
    return;
  }
  if (filtered.length !== stored.length) {
    await storage.set(FREE_MODE_HISTORY_KEY, filtered);
    return;
  }
  if (!filtered.length) {
    await storage.set(FREE_MODE_HISTORY_KEY, [] as PomodoroHistoryEntry[]);
  }
}

export async function resetFreeModeIfOutdated(now: number) {
  const queue = await getFreeModeQueue();
  if (!queue) {
    await pruneFreeModeHistory(now);
    return;
  }
  if (isSameLocalDate(queue.startedAt, now)) return;
  await clearFreeModeData();
}

export async function loadFreeModeHistory(now: number) {
  await resetFreeModeIfOutdated(now);
  await pruneFreeModeHistory(now);
  const stored = (await storage.get<PomodoroHistoryEntry[] | null>(
    FREE_MODE_HISTORY_KEY
  )) ?? [];
  return stored.map((entry) => normalizeHistoryEntry(entry));
}
