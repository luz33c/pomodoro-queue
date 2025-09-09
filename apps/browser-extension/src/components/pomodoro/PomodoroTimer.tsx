import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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

interface PomodoroTimerProps {
  onOpenSettings?: () => void;
}

export function PomodoroTimer({ onOpenSettings }: PomodoroTimerProps) {
  const { state, progress, mmss, pause, resume, skip } = usePomodoro();
  const { t } = useI18n();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  // 控制首次挂载时不要出现从0%跳到实际进度的过渡
  const [enableAnim, setEnableAnim] = useState(false);

  useEffect(() => {
    // 当首次拿到 state 后，下一帧再开启动画，使首帧直接渲染在正确位置
    if (state && !enableAnim) {
      const id = requestAnimationFrame(() => setEnableAnim(true));
      return () => cancelAnimationFrame(id);
    }
  }, [state, enableAnim]);

  // 先定义phase变量
  const running = state?.running;
  const paused = Boolean(state?.paused);
  const phase = state?.phase ?? 'idle';

  return (
    <div className="w-full text-white">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-lg text-white">
          {t('pomodoroTimer')}
        </h2>
        <Button
          aria-label={t('tooltipOpenSettings')}
          className="h-10 w-10 text-white/80 hover:text-white hover:bg-white/15 rounded-full transition-all duration-200 backdrop-blur-sm"
          onClick={onOpenSettings}
          size="icon"
          title={t('settings')}
          variant="ghost"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative h-52 w-52">
          {/* 简化的SVG圆环实现（修复CSS drop-shadow 导致的方框伪影） */}
          <svg
            aria-label={t('progressRingAriaLabel') ?? 'progress'}
            className="absolute inset-0 w-full h-full -rotate-90"
            role="img"
            viewBox="0 0 100 100"
          >
            <title>{t('progressRingTitle') ?? 'Timer Progress'}</title>
            <defs>
              {/* 使用 SVG 原生滤镜制造柔光，避免 CSS filter 在 SVG 上的光栅化方框 */}
              <filter
                colorInterpolationFilters="sRGB"
                filterUnits="userSpaceOnUse"
                height="130"
                id="ring-glow"
                width="130"
                x="-15"
                y="-15"
              >
                <feGaussianBlur
                  in="SourceGraphic"
                  result="blur"
                  stdDeviation="2.5"
                />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* 背景圆环 */}
            <circle
              cx="50"
              cy="50"
              fill="none"
              r="42"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="6"
            />
            {/* 进度圆环 */}
            <circle
              className={
                enableAnim
                  ? 'transition-[stroke-dashoffset] duration-500 ease-out'
                  : 'transition-none'
              }
              cx="50"
              cy="50"
              fill="none"
              r="42"
              stroke="rgba(255, 255, 255, 0.9)"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress)}`}
              strokeLinecap="round"
              /* 首次渲染无过渡，之后仅为 dashoffset 添加过渡 */
              strokeWidth="6"
            />
          </svg>

          {/* 文字内容 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-bold text-5xl tabular-nums text-white drop-shadow-lg">
              {mmss}
            </div>
            <div className="text-white/95 text-sm mt-2 font-medium drop-shadow-md">
              {phaseLabel(phase, t)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 px-4">
          {!running && (
            <Button
              aria-label={t('buttonStart')}
              className="bg-white text-black hover:bg-white/90 font-medium px-6 py-2 rounded-lg border-0 shadow-none transition-colors duration-200"
              onClick={() => setCreateModalOpen(true)}
              size="sm"
            >
              {t('buttonStart')}
            </Button>
          )}
          {running && !paused && (
            <Button
              aria-label={t('buttonPause')}
              className="bg-white/25 text-white hover:bg-white/35 px-5 py-2 rounded-lg border-0 shadow-none transition-colors duration-200"
              onClick={() => pause()}
              size="sm"
            >
              {t('buttonPause')}
            </Button>
          )}
          {running && paused && (
            <Button
              aria-label={t('buttonResume')}
              className="bg-white text-black hover:bg-white/90 font-medium px-6 py-2 rounded-lg border-0 shadow-none transition-colors duration-200"
              onClick={() => resume()}
              size="sm"
            >
              {t('buttonResume')}
            </Button>
          )}
          {/* 终止队列按钮移动到 HistoryList 顶部卡片的右侧，避免此处重复展示 */}
          {running && (
            <Button
              aria-label={t('buttonSkip')}
              className="bg-white/25 text-white hover:bg-white/35 px-5 py-2 rounded-lg border-0 shadow-none transition-colors duration-200"
              onClick={() => skip()}
              size="sm"
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
    </div>
  );
}
