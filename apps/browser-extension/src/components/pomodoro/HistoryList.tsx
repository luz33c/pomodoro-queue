import { Storage } from '@plasmohq/storage';
import { useStorage } from '@plasmohq/storage/hook';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/hooks/useI18n';
import type {
  CurrentQueue,
  PomodoroHistoryEntry,
  PomodoroState,
} from '@/model/pomodoro/types';
import {
  CURRENT_QUEUE_KEY,
  HISTORY_KEY,
  STORAGE_KEY,
} from '@/model/pomodoro/types';

const localInstance = new Storage({ area: 'local' });

function formatTime(ts: number) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

const MS_PER_MINUTE = 60_000;

function minutes(ms: number) {
  return Math.round(ms / MS_PER_MINUTE);
}

function phaseLabel(phase: string, t: (key: string) => string) {
  if (phase === 'focus') {
    return t('phaseFocus');
  }
  if (phase === 'short') {
    return t('phaseShortBreak');
  }
  if (phase === 'long') {
    return t('phaseLongBreak');
  }
  return t('phaseIdle');
}

export function HistoryList() {
  const { t } = useI18n();
  const [history] = useStorage<PomodoroHistoryEntry[]>({
    key: HISTORY_KEY,
    instance: localInstance,
  });
  const [state] = useStorage<PomodoroState>({
    key: STORAGE_KEY,
    instance: localInstance,
  });
  const [currentQueue] = useStorage<CurrentQueue | null>({
    key: CURRENT_QUEUE_KEY,
    instance: localInstance,
  });

  const sorted = [...(history ?? [])].sort((a, b) => b.endedAt - a.endedAt);
  const list = currentQueue
    ? sorted.filter((h) => h.queueId === currentQueue.id)
    : [];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <h3 className="mb-2 font-medium text-muted-foreground text-sm">
        {t('historyTitle')}
      </h3>
      <div className="flex-1 overflow-hidden flex flex-col">
        {state?.running && (
          <Card className="mb-2 p-2.5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{t('historyCurrent')} · {phaseLabel(state.phase, t)}</div>
              <div className="text-muted-foreground text-xs">{t('historyInProgress')}</div>
            </div>
          </Card>
        )}
        <div className="scrollbar-hide flex-1 overflow-y-auto space-y-2 min-h-0">
          {list.map((h) => (
            <Card className="p-2.5" key={h.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{h.title}</div>
                  <div className="text-muted-foreground text-xs">
                    {minutes(h.durationMs)} {t('historyMinutes')}
                  </div>
                </div>
                <div className="text-muted-foreground text-xs">
                  {formatTime(h.endedAt)}
                </div>
              </div>
            </Card>
          ))}
          {list.length === 0 && !state?.running && (
            <Card className="p-4 text-center text-muted-foreground text-xs">
              {t('historyEmpty')}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
