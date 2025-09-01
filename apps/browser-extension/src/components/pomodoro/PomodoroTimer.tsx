import { Settings } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePomodoro } from '@/hooks/pomodoro/usePomodoro';
import { useI18n } from '@/hooks/useI18n';
import { CreateQueueModal } from './CreateQueueModal';

function phaseLabel(phase: string, t: (key: string) => string) {
  if (phase === 'focus') {
    return t('phaseFocus');
  }
  if (phase === 'short') {
    return t('phaseShortBreak');
  }
  if (phase === 'long') {
    return t('phaseLongBreak');
  }
  return t('phaseIdle');
}

const FULL_CIRCLE_DEGREES = 360;

interface PomodoroTimerProps {
  onOpenSettings?: () => void;
}

export function PomodoroTimer({ onOpenSettings }: PomodoroTimerProps) {
  const { state, progress, mmss, pause, resume, stop, skip } = usePomodoro();
  const { t } = useI18n();
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
        <h2 className="font-semibold text-lg">{t('pomodoroTimer')}</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onOpenSettings}
          title={t('settings')}
          aria-label={t('tooltipOpenSettings')}
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
              {phaseLabel(phase, t)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {!running && (
            <Button
              size="sm"
              aria-label={t('buttonStart')}
              onClick={() => setCreateModalOpen(true)}
            >
              {t('buttonStart')}
            </Button>
          )}
          {running && !paused && (
            <Button
              size="sm"
              aria-label={t('buttonPause')}
              onClick={() => pause()}
              variant="secondary"
            >
              {t('buttonPause')}
            </Button>
          )}
          {running && paused && (
            <Button size="sm" aria-label={t('buttonResume')} onClick={() => resume()}>
              {t('buttonResume')}
            </Button>
          )}
          {running && (
            <Button
              size="sm"
              aria-label={t('buttonStop')}
              onClick={() => stop()}
              variant="destructive"
            >
              {t('buttonStop')}
            </Button>
          )}
          {running && (
            <Button
              size="sm"
              aria-label={t('buttonSkip')}
              onClick={() => skip()}
              variant="outline"
            >
              {t('buttonSkip')}
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
