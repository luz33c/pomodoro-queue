import '@/style.css';

import { Toaster } from 'sonner';
import { HistoryList } from './components/pomodoro/HistoryList';
import { PomodoroTimer } from './components/pomodoro/PomodoroTimer';

function IndexPopup() {
  return (
    <div className="dark flex h-[560px] w-[420px] flex-col overflow-hidden bg-background text-foreground">
      <Toaster />
      <div className="flex-shrink-0 px-6 pt-6">
        <PomodoroTimer />
      </div>
      <div className="flex-1 overflow-hidden">
        <HistoryList />
      </div>
    </div>
  );
}

export default IndexPopup;
