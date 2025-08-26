import '@/style.css';

import { Toaster } from 'sonner';
import { HistoryList } from './components/HistoryList';
import { PomodoroTimer } from './components/PomodoroTimer';

function IndexPopup() {
  return (
    <div className="dark flex h-[560px] w-[420px] flex-col overflow-hidden bg-background text-foreground">
      <Toaster />
      <div className="flex w-full justify-center">
        <PomodoroTimer />
      </div>
      <HistoryList />
    </div>
  );
}

export default IndexPopup;
