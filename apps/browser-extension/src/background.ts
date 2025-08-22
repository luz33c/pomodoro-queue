/*
  番茄钟后台引擎：
  - 使用 chrome.alarms 保证 popup 关闭后仍能运行
  - 使用 @plasmohq/storage 持久化状态，popup 通过存储与 UI 同步
*/
import { sharedStorage as storage } from '@/lib/storage';
import type {
  QueueRules,
  QueueState,
  Segment,
  SegmentType,
} from '@/pomodoro/types';
import {
  DEFAULT_RULES,
  MIN_RESTORE_AHEAD_MS,
  MS_PER_SEC,
  STORAGE_KEYS,
  segmentTitle,
  uid,
} from '@/pomodoro/types';

const ALARM_NAME = 'pomodoro-segment-end';

async function getState(): Promise<QueueState> {
  const state = (await storage.get<QueueState>(STORAGE_KEYS.STATE)) as
    | QueueState
    | undefined;
  if (state) {
    return state;
  }
  const empty: QueueState = {
    rules: null,
    current: null,
    status: 'idle',
    history: [],
    workCount: 0,
    deadline: null,
  };
  await storage.set(STORAGE_KEYS.STATE, empty);
  return empty;
}

async function setState(
  patch: Partial<QueueState> | ((s: QueueState) => QueueState)
) {
  const prev = await getState();
  const next =
    typeof patch === 'function'
      ? (patch as (s: QueueState) => QueueState)(prev)
      : { ...prev, ...patch };
  await storage.set(STORAGE_KEYS.STATE, next);
}

function nextSegment(
  prevType: SegmentType | null,
  rules: QueueRules,
  workCount: number
): Segment {
  if (prevType === 'work') {
    const isLong =
      rules.longEvery >= 2 &&
      workCount % rules.longEvery === 0 &&
      rules.longBreak > 0;
    const type: SegmentType = isLong ? 'longBreak' : 'shortBreak';
    const duration = isLong ? rules.longBreak : rules.shortBreak;
    return {
      id: uid(),
      type,
      title: segmentTitle(type),
      duration,
      status: 'pending',
    };
  }
  return {
    id: uid(),
    type: 'work',
    title: segmentTitle('work'),
    duration: rules.workDuration,
    status: 'pending',
  };
}

async function clearAlarm() {
  try {
    await globalThis.chrome?.alarms?.clear(ALARM_NAME);
  } catch {
    // ignore
  }
}

async function scheduleAlarm(whenMs: number) {
  await globalThis.chrome?.alarms?.create(ALARM_NAME, { when: whenMs });
}

async function startWithRules(rules: QueueRules) {
  // 首段为 work
  const seg = nextSegment(null, rules, 0);
  const now = Date.now();
  const deadline = now + seg.duration * MS_PER_SEC;
  const newState: QueueState = {
    rules,
    current: { ...seg, status: 'running' as const, startedAt: now },
    status: 'running' as const,
    workCount: 0,
    deadline,
    history: [],
  };
  // console.log('Background startWithRules:', { seg, deadline, newState });
  await setState(newState);
  await clearAlarm();
  await scheduleAlarm(deadline);
}

async function pause() {
  await setState((s) => {
    if (s.status !== 'running' || !s.current || !s.deadline) {
      return s;
    }
    const remaining = Math.max(
      0,
      Math.ceil((s.deadline - Date.now()) / MS_PER_SEC)
    );
    clearAlarm();
    return {
      ...s,
      status: 'paused',
      current: { ...s.current, remaining },
      deadline: null,
    };
  });
}

async function resume() {
  const s = await getState();
  if (s.status !== 'paused' || !s.current) {
    return;
  }
  const remaining = s.current.remaining ?? s.current.duration;
  const now = Date.now();
  const deadline = now + remaining * MS_PER_SEC;
  await setState({
    status: 'running',
    current: {
      ...s.current,
      status: 'running',
      startedAt: s.current.startedAt ?? now,
    },
    deadline,
  });
  await clearAlarm();
  await scheduleAlarm(deadline);
}

async function terminate() {
  await setState((s) => {
    if (!s.current) {
      return { ...s, status: 'terminated', deadline: null };
    }
    const now = Date.now();
    const finished: Segment = {
      ...s.current,
      status: 'done',
      endedAt: now,
    };
    clearAlarm();
    return {
      ...s,
      status: 'terminated',
      current: null,
      history: [finished, ...s.history],
      deadline: null,
    };
  });
}

async function onSegmentEnd() {
  const s = await getState();
  if (!s.current) {
    return;
  }
  if (!s.rules) {
    return;
  }
  const now = Date.now();
  const finished: Segment = { ...s.current, status: 'done', endedAt: now };
  const newWorkCount =
    s.current.type === 'work' ? s.workCount + 1 : s.workCount;
  const next = nextSegment(s.current.type, s.rules, newWorkCount);

  // 自动衔接下一段
  const nextDeadline = now + next.duration * MS_PER_SEC;
  await setState({
    history: [finished, ...s.history],
    current: { ...next, status: 'running', startedAt: now },
    deadline: nextDeadline,
    workCount: newWorkCount,
    status: 'running',
  });
  await scheduleAlarm(nextDeadline);
}

async function restoreAlarm() {
  const s = await getState();
  if (s.status === 'running' && s.deadline) {
    const remainingMs = s.deadline - Date.now();
    if (remainingMs > MIN_RESTORE_AHEAD_MS) {
      await scheduleAlarm(s.deadline);
      return;
    }
    // 已过期：推进到下一段
    await onSegmentEnd();
  }
}

// 消息路由
globalThis.chrome?.runtime?.onMessage.addListener(
  (message, _sender, sendResponse) => {
    (async () => {
      try {
        if (message?.type === 'pomodoro:start') {
          const rules = (message?.payload as QueueRules) ?? DEFAULT_RULES;
          await startWithRules(rules);
          sendResponse({ ok: true });
          return;
        }
        if (message?.type === 'pomodoro:pause') {
          await pause();
          sendResponse({ ok: true });
          return;
        }
        if (message?.type === 'pomodoro:resume') {
          await resume();
          sendResponse({ ok: true });
          return;
        }
        if (message?.type === 'pomodoro:terminate') {
          await terminate();
          sendResponse({ ok: true });
          return;
        }
        if (message?.type === 'pomodoro:get') {
          const s = await getState();
          sendResponse({ ok: true, data: s });
          return;
        }
        sendResponse({ ok: false, error: 'Unknown message' });
      } catch (e) {
        sendResponse({ ok: false, error: (e as Error).message });
      }
    })();
    return true; // 异步响应
  }
);

globalThis.chrome?.alarms?.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await onSegmentEnd();
  }
});

// SW 激活时恢复 alarm
restoreAlarm().catch(() => {
  // ignore
});
