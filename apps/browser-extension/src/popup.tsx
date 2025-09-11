import '@/style.css';

import { lazy, Suspense, useMemo, useState } from 'react';
import { Toaster } from 'sonner';
import { PomodoroHome } from './components/pomodoro/PomodoroHome';
import { usePomodoro } from './hooks/pomodoro/usePomodoro';

// 按需加载设置页，避免首屏引入不必要的大模块
const PomodoroSettingsLazy = lazy(() =>
  import('./components/pomodoro/PomodoroSettings').then((m) => ({
    default: m.PomodoroSettings,
  }))
);

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
    <div
      className={`dark relative flex h-[640px] w-[360px] flex-col overflow-hidden overscroll-none ${backgroundClass}`}
    >
      <Toaster />
      {showSettings ? (
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-white/80">
              Loading...
            </div>
          }
        >
          <PomodoroSettingsLazy
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            showTaskSetting={false}
          />
        </Suspense>
      ) : (
        <PomodoroHome onOpenSettings={() => setShowSettings(true)} />
      )}
    </div>
  );
}

export default IndexPopup;
