import { Storage } from '@plasmohq/storage';
import { useStorage } from '@plasmohq/storage/hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CurrentQueue, PomodoroHistoryEntry } from '~model/pomodoro/types';
import {
  FREE_MODE_CURRENT_QUEUE_KEY,
  FREE_MODE_HISTORY_KEY,
  loadFreeModeHistory,
} from '~store/pomodoro/freeQueueStore';

const localStorageInstance = new Storage({ area: 'local' });

export function useFreeQueueHistory() {
  const [queue] = useStorage<CurrentQueue | null>({
    key: FREE_MODE_CURRENT_QUEUE_KEY,
    instance: localStorageInstance,
  });
  const [history] = useStorage<PomodoroHistoryEntry[]>({
    key: FREE_MODE_HISTORY_KEY,
    instance: localStorageInstance,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadFreeModeHistory(Date.now());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      setLoading(false);
    });
  }, [refresh]);

  const entries = useMemo(() => history ?? [], [history]);

  return { entries, queue, refresh, loading };
}
