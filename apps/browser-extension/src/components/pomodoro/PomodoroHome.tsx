import { lazy, Suspense } from 'react';
import { PomodoroTimer } from './PomodoroTimer';

// 按需加载历史列表，减小首屏体积
const HistoryListLazy = lazy(() =>
  import('./HistoryList').then((m) => ({ default: m.HistoryList }))
);

interface PomodoroHomeProps {
  onOpenSettings?: () => void;
}

export function PomodoroHome({ onOpenSettings }: PomodoroHomeProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex-shrink-0 p-4">
        <PomodoroTimer onOpenSettings={onOpenSettings} />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-4 pb-4">
        <Suspense
          fallback={
            <div className="h-full w-full animate-pulse rounded-xl bg-white/10" />
          }
        >
          <HistoryListLazy />
        </Suspense>
      </div>
    </div>
  );
}
