import '@/style.css';

import { useState } from 'react';
import { Toaster } from 'sonner';
import { PomodoroHome } from '../components/pomodoro/PomodoroHome';
import { PomodoroSettings } from '../components/pomodoro/PomodoroSettings';
import { usePomodoro } from '../hooks/pomodoro/usePomodoro';

function DebugTab() {
  const [showSettings, setShowSettings] = useState(false);
  const { state } = usePomodoro();

  const renderDebugValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    return JSON.stringify(value);
  };

  return (
    <div className="dark flex h-screen w-full bg-background text-foreground">
      <Toaster />
      
      {/* Left Panel - Pomodoro Interface */}
      <div className="relative flex h-[600px] w-[380px] flex-col overflow-hidden overscroll-none bg-background text-foreground mt-8 ml-8 border rounded-lg shadow-lg">
        <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          Debug Mode
        </div>
        {showSettings ? (
          <PomodoroSettings
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            showTaskSetting={true}
          />
        ) : (
          <PomodoroHome onOpenSettings={() => setShowSettings(true)} />
        )}
      </div>

      {/* Right Panel - Debug Info */}
      <div className="flex-1 p-8">
        <div className="h-full border rounded-lg bg-muted/20 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4 text-primary">Debug Information</h2>
          
          {state ? (
            <div className="space-y-4 font-mono text-sm">
              
              {/* PomodoroConfig Section */}
              <div className="bg-muted/30 p-3 rounded">
                <h3 className="font-semibold text-primary mb-2">config:</h3>
                <div className="pl-4 space-y-1">
                  {state.config && Object.entries(state.config).map(([key, value]) => (
                    <div key={key} className="flex">
                      <span className="text-blue-400 min-w-[140px]">{key}:</span>
                      <span className="text-green-400">{renderDebugValue(value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* PomodoroState Section */}
              <div className="bg-muted/30 p-3 rounded">
                <h3 className="font-semibold text-primary mb-2">state:</h3>
                <div className="pl-4 space-y-1">
                  <div className="flex">
                    <span className="text-blue-400 min-w-[140px]">phase:</span>
                    <span className="text-green-400">{renderDebugValue(state.phase)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-blue-400 min-w-[140px]">running:</span>
                    <span className="text-green-400">{renderDebugValue(state.running)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-blue-400 min-w-[140px]">paused:</span>
                    <span className="text-green-400">{renderDebugValue(state.paused)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-blue-400 min-w-[140px]">cycleCount:</span>
                    <span className="text-green-400">{renderDebugValue(state.cycleCount)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-blue-400 min-w-[140px]">startedAt:</span>
                    <span className="text-green-400">{renderDebugValue(state.startedAt)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-blue-400 min-w-[140px]">endsAt:</span>
                    <span className="text-green-400">{renderDebugValue(state.endsAt)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-blue-400 min-w-[140px]">pausedAt:</span>
                    <span className="text-green-400">{renderDebugValue(state.pausedAt)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-blue-400 min-w-[140px]">pauseAccumMs:</span>
                    <span className="text-green-400">{renderDebugValue(state.pauseAccumMs)}</span>
                  </div>
                </div>
              </div>

              {/* Timestamps Section */}
              {(state.startedAt || state.endsAt || state.pausedAt) && (
                <div className="bg-muted/30 p-3 rounded">
                  <h3 className="font-semibold text-primary mb-2">timestamps (formatted):</h3>
                  <div className="pl-4 space-y-1">
                    {state.startedAt && (
                      <div className="flex">
                        <span className="text-blue-400 min-w-[140px]">startedAt:</span>
                        <span className="text-yellow-400">{new Date(state.startedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {state.endsAt && (
                      <div className="flex">
                        <span className="text-blue-400 min-w-[140px]">endsAt:</span>
                        <span className="text-yellow-400">{new Date(state.endsAt).toLocaleString()}</span>
                      </div>
                    )}
                    {state.pausedAt && (
                      <div className="flex">
                        <span className="text-blue-400 min-w-[140px]">pausedAt:</span>
                        <span className="text-yellow-400">{new Date(state.pausedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="text-muted-foreground">Loading state...</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DebugTab;