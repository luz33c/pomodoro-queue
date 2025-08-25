import '@/style.css'

import { Toaster } from 'sonner';
import { PomodoroTimer } from './components/PomodoroTimer';
import { HistoryList } from './components/HistoryList';

function IndexPopup() {
  return (
    <div className="dark min-h-[560px] w-[420px] overflow-hidden bg-background text-foreground">
      <Toaster />
      <div className="flex w-full justify-center">
        <PomodoroTimer />
      </div>
      <HistoryList />
    </div>
  );
}

export default IndexPopup;
