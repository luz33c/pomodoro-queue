import '@/style.css';

import { useState } from 'react';
import { Toaster } from 'sonner';
import { PomodoroHome } from './components/pomodoro/PomodoroHome';
import { PomodoroSettings } from './components/pomodoro/PomodoroSettings';

function IndexPopup() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="dark flex h-[640px] w-[360px] flex-col overflow-hidden bg-background text-foreground">
      <Toaster />
      {showSettings ? (
        <PomodoroSettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      ) : (
        <PomodoroHome onOpenSettings={() => setShowSettings(true)} />
      )}
    </div>
  );
}

export default IndexPopup;
