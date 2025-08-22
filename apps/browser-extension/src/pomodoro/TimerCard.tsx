import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePomodoro } from '@/hooks/usePomodoro';
import { cn } from '@/lib/utils';
import { WizardModal } from '@/pomodoro/WizardModal';
import {
  DEFAULT_RULES,
  formatMMSS,
  type QueueRules,
  segmentTitle,
} from './types';

function CircleProgress({ percent }: { percent: number }) {
  const size = 220;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = Math.min(1, Math.max(0, percent)) * c;
  return (
    <svg aria-label="进度环" height={size} role="img" width={size}>
      <title>番茄钟进度</title>
      <circle
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={r}
        stroke="#E5E7EB"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={r}
        stroke="#0f766e"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeLinecap="round"
        strokeWidth={stroke}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export function TimerCard() {
  const [view, actions] = usePomodoro();
  const [open, setOpen] = useState(false);

  const label = useMemo(() => {
    if (!view) {
      return '未开始';
    }
    if (view.state.status === 'terminated') {
      return '已终止';
    }
    if (!view.state.current) {
      return '未开始';
    }
    return segmentTitle(view.state.current.type);
  }, [view]);

  const timeText = useMemo(
    () => formatMMSS(view?.remainingSec ?? DEFAULT_RULES.workDuration),
    [view?.remainingSec]
  );

  const percent = useMemo(() => {
    if (!view || view.totalSec <= 0) {
      return 0;
    }
    return 1 - view.remainingSec / view.totalSec;
  }, [view]);

  return (
    <Card className="mx-auto mt-4 w-full max-w-md border-0 bg-background">
      <CardContent className="flex flex-col items-center gap-4 py-6">
        <div className="relative">
          <CircleProgress percent={percent} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              aria-atomic="true"
              aria-live="polite"
              className={cn(
                'font-semibold',
                'select-none',
                'tabular-nums',
                'text-5xl'
              )}
            >
              {timeText}
            </div>
            <div className="mt-2 text-muted-foreground text-sm">{label}</div>
          </div>
        </div>

        <div className="mt-2 flex gap-3">
          {(!view ||
            view.state.status === 'idle' ||
            view.state.status === 'terminated') && (
            <Button onClick={() => setOpen(true)} type="button">
              开始番茄钟
            </Button>
          )}
          {view?.state.status === 'running' && (
            <>
              <Button
                onClick={() => actions.pause()}
                type="button"
                variant="secondary"
              >
                暂停
              </Button>
              <Button
                onClick={() => actions.terminate()}
                type="button"
                variant="destructive"
              >
                终止
              </Button>
            </>
          )}
          {view?.state.status === 'paused' && (
            <>
              <Button onClick={() => actions.resume()} type="button">
                继续
              </Button>
              <Button
                onClick={() => actions.terminate()}
                type="button"
                variant="destructive"
              >
                终止
              </Button>
            </>
          )}
        </div>

        <WizardModal
          onClose={() => setOpen(false)}
          onConfirm={async (rules: QueueRules) => {
            await actions.start(rules);
            setOpen(false);
          }}
          open={open}
        />
      </CardContent>
    </Card>
  );
}
