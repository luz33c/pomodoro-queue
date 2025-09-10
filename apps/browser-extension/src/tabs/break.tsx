import { Storage } from '@plasmohq/storage';
import { useCallback, useEffect, useState } from 'react';
import { usePomodoro } from '~hooks/pomodoro/usePomodoro';
import { useI18n } from '~hooks/useI18n';
import type { PomodoroState } from '~model/pomodoro/types';

import './style.css';

const storage = new Storage({ area: 'local' });
const BREAK_FORCED_AT = 'breakLastForcedAt';

function BreakPage() {
  const { state, mmss, pause, resume, skip } = usePomodoro();
  const { t } = useI18n();
  const [showHint, setShowHint] = useState(false);

  // 检查是否应该关闭页面
  const shouldClose =
    !state?.running || (state?.phase !== 'short' && state?.phase !== 'long');

  useEffect(() => {
    if (shouldClose) {
      // 延迟关闭，给用户时间看到状态变化
      // Mark: break control
      // 不再处于休息或计时已停止 → Break 页面自我关闭
      const timer = setTimeout(() => {
        window.close();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [shouldClose]);

  // 显示被强制拉回的提示
  const flashHint = useCallback(() => {
    setShowHint(true);
    setTimeout(() => setShowHint(false), 2000);
  }, []);

  useEffect(() => {
    // 监听被强制拉回的提示
    const handleStorageChange = (
      changes: Record<string, { newValue?: unknown; oldValue?: unknown }>
    ) => {
      if (changes[BREAK_FORCED_AT]) {
        flashHint();
      }
    };

    storage.watch({
      [BREAK_FORCED_AT]: handleStorageChange,
    });

    // Plasmo 会自动清理 storage watch
  }, [flashHint]);

  const handlePause = async () => {
    await pause();
  };

  const handleResume = async () => {
    await resume();
  };

  const handleSkip = async () => {
    await skip();
  };

  const running = state?.running;
  const paused = Boolean(state?.paused);
  const phase = state?.phase;

  return (
    <div className="break-container">
      <div className={`break-hint ${showHint ? 'show' : ''}`}>
        {t('breakPageHint')}
      </div>

      <div className="break-content">
        <div className="break-emoji">☕</div>
        <div className="break-msg">{t('breakPageTitle')}</div>
        <div className="breathing-circle" />
        <div className="break-timer">{mmss}</div>
        <div className="break-tips">
          {t('breakPageTip1')}
          <br />
          {t('breakPageTip2')}
          <br />
          {t('breakPageTip3')}
        </div>

        {/* 低调的暂停控制按钮 */}
        {running && (phase === 'short' || phase === 'long') && (
          <div className="break-controls">
            {!paused ? (
              <button
                className="break-control-btn break-pause-btn"
                onClick={handlePause}
                title={t('tooltipPauseTimer')}
              >
                ⏸
              </button>
            ) : (
              <button
                className="break-control-btn break-resume-btn"
                onClick={handleResume}
                title={t('tooltipResumeTimer')}
              >
                ▶
              </button>
            )}
            {/* <button 
              className="break-control-btn break-skip-btn" 
              onClick={handleSkip}
              title={t('tooltipSkipBreak')}
            >
              ⏭
            </button> */}
          </div>
        )}
      </div>
    </div>
  );
}

export default BreakPage;
