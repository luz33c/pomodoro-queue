import { useStorage } from '@plasmohq/storage/hook';
import { useEffect, useMemo, useRef, useState } from 'react';

import { sharedStorage } from '@/lib/storage';
import type { QueueRules, QueueState } from '@/pomodoro/types';
import {
  DEFAULT_RULES,
  MS_PER_SEC,
  STORAGE_KEYS,
  UI_TICK_MS,
} from '@/pomodoro/types';

export type PomodoroViewState = {
  state: QueueState;
  remainingSec: number;
  totalSec: number;
};

export function usePomodoro(): [
  PomodoroViewState | null,
  {
    start: (rules: QueueRules) => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    terminate: () => Promise<void>;
  },
] {
  const defaultState: QueueState = {
    rules: null,
    current: null,
    status: 'idle',
    history: [],
    workCount: 0,
    deadline: null,
  };

  const [state] = useStorage<QueueState>(STORAGE_KEYS.STATE, defaultState, {
    instance: sharedStorage,
  });

  const tickRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
    }
    if (state?.status === 'running') {
      tickRef.current = setInterval(() => setNow(Date.now()), UI_TICK_MS);
    }
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
      }
    };
  }, [state?.status]);

  const [now, setNow] = useState(Date.now());

  const view = useMemo<PomodoroViewState | null>(() => {
    if (!state) {
      return null;
    }
    const totalSec = state.current?.duration ?? 0;
    let remainingSec = 0;
    if (state.status === 'running' && state.deadline) {
      remainingSec = Math.max(
        0,
        Math.ceil((state.deadline - now) / MS_PER_SEC)
      );
    } else if (state.current?.remaining != null) {
      remainingSec = state.current.remaining;
    } else {
      remainingSec = totalSec;
    }

    // console.log('Frontend usePomodoro view:', {
    //   state: state.status,
    //   current: state.current?.type,
    //   deadline: state.deadline,
    //   now,
    //   totalSec,
    //   remainingSec,
    // });

    return { state, remainingSec, totalSec };
  }, [state, now]);

  async function start(rules: QueueRules = DEFAULT_RULES) {
    // console.log('Frontend start called with rules:', rules);
    await globalThis.chrome?.runtime?.sendMessage({
      type: 'pomodoro:start',
      payload: rules,
    });
    // 强制刷新，以防 useStorage 没有立即更新
    const REFRESH_DELAY = 100;
    setTimeout(() => {
      setNow(Date.now());
    }, REFRESH_DELAY);
  }
  async function pause() {
    await globalThis.chrome?.runtime?.sendMessage({ type: 'pomodoro:pause' });
  }
  async function resume() {
    await globalThis.chrome?.runtime?.sendMessage({ type: 'pomodoro:resume' });
  }
  async function terminate() {
    await globalThis.chrome?.runtime?.sendMessage({
      type: 'pomodoro:terminate',
    });
  }

  return [view, { start, pause, resume, terminate }];
}
