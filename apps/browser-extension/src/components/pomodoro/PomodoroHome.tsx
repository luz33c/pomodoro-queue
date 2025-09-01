import { HistoryList } from './HistoryList';
import { PomodoroTimer } from './PomodoroTimer';

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
        <HistoryList />
      </div>
    </div>
  );
}
