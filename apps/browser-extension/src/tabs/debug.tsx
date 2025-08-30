import '@/style.css';

import { useState } from 'react';
import { Toaster } from 'sonner';
import { PomodoroHome } from '../components/pomodoro/PomodoroHome';
import { PomodoroSettings } from '../components/pomodoro/PomodoroSettings';

function DebugTab() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="dark relative flex h-[600px] w-[380px] flex-col overflow-hidden overscroll-none bg-background text-foreground mx-auto mt-8 border rounded-lg shadow-lg">
      <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
        Debug Mode
      </div>
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

export default DebugTab;