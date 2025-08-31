import { Settings } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePomodoro } from '@/hooks/pomodoro/usePomodoro';
import { CreateQueueModal } from './CreateQueueModal';

function phaseLabel(phase: string) {
  if (phase === 'focus') {
    return '专注时段';
  }
  if (phase === 'short') {
    return '短休息';
  }
  if (phase === 'long') {
    return '长休息';
  }
  return '未开始';
}

const FULL_CIRCLE_DEGREES = 360;

interface PomodoroTimerProps {
  onOpenSettings?: () => void;
}

export function PomodoroTimer({ onOpenSettings }: PomodoroTimerProps) {
  const { state, progress, mmss, pause, resume, stop, skip } = usePomodoro();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const ringStyle = useMemo(() => {
    const p = Math.max(0, Math.min(1, progress));
    const deg = p * FULL_CIRCLE_DEGREES;
    return {
      background: `conic-gradient(hsl(var(--primary)) ${deg}deg, hsl(var(--muted)) ${deg}deg)`,
    } as const;
  }, [progress]);

  const running = state?.running;
  const paused = Boolean(state?.paused);
  const phase = state?.phase ?? 'idle';

  return (
    <Card className="w-full p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">番茄钟</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onOpenSettings}
          title="番茄钟设置"
          aria-label="打开设置"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative h-48 w-48">
          <div
            className="absolute inset-0 rounded-full p-[10px]"
            style={ringStyle}
          >
            <div className="h-full w-full rounded-full bg-background" />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-bold text-5xl tabular-nums">{mmss}</div>
            <div className="text-muted-foreground text-sm mt-1">
              {phaseLabel(phase)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {!running && (
            <Button
              size="sm"
              aria-label="开始番茄钟"
              onClick={() => setCreateModalOpen(true)}
            >
              开始
            </Button>
          )}
          {running && !paused && (
            <Button
              size="sm"
              aria-label="暂停"
              onClick={() => pause()}
              variant="secondary"
            >
              暂停
            </Button>
          )}
          {running && paused && (
            <Button size="sm" aria-label="继续" onClick={() => resume()}>
              继续
            </Button>
          )}
          {running && (
            <Button
              size="sm"
              aria-label="终止队列"
              onClick={() => stop()}
              variant="destructive"
            >
              终止队列
            </Button>
          )}
          {running && (
            <Button
              size="sm"
              aria-label="跳过阶段"
              onClick={() => skip()}
              variant="outline"
            >
              跳过
            </Button>
          )}
        </div>
      </div>

      <CreateQueueModal
        onOpenChange={setCreateModalOpen}
        open={createModalOpen}
      />
    </Card>
  );
}
