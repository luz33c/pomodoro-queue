import '@/style.css';

import { Toaster } from 'sonner';
import { HistoryList } from './pomodoro/HistoryList';
import { TimerCard } from './pomodoro/TimerCard';

function IndexPopup() {
  return (
    <div className="dark h-fit min-h-[600px] w-fit min-w-[420px] overflow-hidden bg-background text-foreground">
      <Toaster />
      <div className="px-4 pt-4">
        <TimerCard />
        <HistoryList />
      </div>
    </div>
  );
}

export default IndexPopup;
