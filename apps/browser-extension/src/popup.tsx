import '@/style.css';

import { useState } from 'react';
import { Toaster } from 'sonner';
import { PomodoroHome } from './components/pomodoro/PomodoroHome';
import { PomodoroSettings } from './components/pomodoro/PomodoroSettings';

function IndexPopup() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="dark relative flex h-[600px] w-[380px] flex-col overflow-hidden overscroll-none bg-background text-foreground">
      <Toaster />
      {showSettings ? (
        <PomodoroSettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          showTaskSetting={false}
        />
      ) : (
        <PomodoroHome onOpenSettings={() => setShowSettings(true)} />
      )}
    </div>
  );
}

export default IndexPopup;
