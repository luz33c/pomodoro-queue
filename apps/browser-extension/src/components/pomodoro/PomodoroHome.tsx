import { HistoryList } from './HistoryList';
import { PomodoroTimer } from './PomodoroTimer';

interface PomodoroHomeProps {
  onOpenSettings?: () => void;
}

export function PomodoroHome({ onOpenSettings }: PomodoroHomeProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-6">
        <PomodoroTimer onOpenSettings={onOpenSettings} />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <HistoryList />
      </div>
    </div>
  );
}
