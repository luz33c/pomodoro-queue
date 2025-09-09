import '@/style.css';

import { useMemo, useState } from 'react';
import { Toaster } from 'sonner';
import { PomodoroHome } from './components/pomodoro/PomodoroHome';
import { PomodoroSettings } from './components/pomodoro/PomodoroSettings';
import { usePomodoro } from './hooks/pomodoro/usePomodoro';

function IndexPopup() {
  const [showSettings, setShowSettings] = useState(false);
  const { state } = usePomodoro();
  
  const backgroundClass = useMemo(() => {
    const phase = state?.phase ?? 'idle';
    
    if (phase === 'short' || phase === 'long') {
      return 'pomodoro-break-bg';
    }
    
    return 'pomodoro-focus-bg';
  }, [state?.phase]);

  return (
    <div className={`dark relative flex h-[600px] w-[380px] flex-col overflow-hidden overscroll-none ${backgroundClass}`}>
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
