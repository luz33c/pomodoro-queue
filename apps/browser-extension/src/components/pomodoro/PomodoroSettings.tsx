import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { usePomodoro } from '@/hooks/pomodoro/usePomodoro';
import { useI18n } from '@/hooks/useI18n';
import type { PomodoroConfig } from '~model/pomodoro/types';

interface PomodoroSettingsProps {
  isOpen?: boolean;
  onClose?: () => void;
  showTaskSetting?: boolean;
}

export function PomodoroSettings({
  isOpen = true,
  onClose,
  showTaskSetting = true,
}: PomodoroSettingsProps) {
  const { state, updateConfig } = usePomodoro();
  const { t } = useI18n();

  // 工作配置引用：保持与最新的远端配置同步，用于合并增量更新
  const workingConfigRef = useRef<PomodoroConfig | null>(state?.config ?? null);
  // 等待合并的局部更新
  const pendingPartialRef = useRef<Partial<PomodoroConfig> | null>(null);
  // 微节流定时器
  const scheduleRef = useRef<number | null>(null);

  // 扁平化 Switch：通过父组件传入类名覆盖 UI 组件默认样式
  const flatSwitchClass = [
    // 轨道：去边框与阴影，使用白色系与主界面匹配
    'border-0 shadow-none focus-visible:ring-white/60',
    'data-[state=checked]:bg-white data-[state=unchecked]:bg-white/25',
    // 圆点：移除阴影，未开=白色，开启=品牌绿
    '![&_span]:shadow-none',
    'data-[state=unchecked]:![&_span]:bg-white',
    'data-[state=checked]:![&_span]:bg-emerald-600',
  ].join(' ');

  // 将远端配置同步到工作引用
  useEffect(() => {
    if (state?.config) {
      workingConfigRef.current = state.config;
    }
  }, [state?.config]);

  // 统一的增量更新入口（含 150ms 微节流合并）
  const updateConfigPartial = async (partial: Partial<PomodoroConfig>) => {
    if (!state?.config) return;
    pendingPartialRef.current = {
      ...(pendingPartialRef.current ?? {}),
      ...partial,
    };
    if (scheduleRef.current) {
      window.clearTimeout(scheduleRef.current);
    }
    scheduleRef.current = window.setTimeout(async () => {
      const base = workingConfigRef.current ?? state.config;
      const merged = { ...base, ...(pendingPartialRef.current ?? {}) };
      // 乐观：先写入工作引用，避免并发覆盖
      workingConfigRef.current = merged;
      pendingPartialRef.current = null;
      scheduleRef.current = null;
      try {
        await updateConfig(merged);
      } catch {
        // 忽略：后续会由 storage 同步修正
      }
    }, 150);
  };

  // 休息提醒开关：启用前做权限门控
  const handleToggleBreakNotifications = async (checked: boolean) => {
    if (checked && typeof chrome !== 'undefined' && chrome?.permissions) {
      try {
        const hasPerm = await chrome.permissions.contains({
          permissions: ['notifications'],
        });
        if (!hasPerm && chrome.permissions.request) {
          const granted = await chrome.permissions.request({
            permissions: ['notifications'],
          });
          if (!granted) {
            // 未授予则不更新配置（UI 受控于 state.config，保持关闭）
            return;
          }
        }
      } catch {
        // 忽略权限探测错误
      }
    }
    await updateConfigPartial({ enableBreakNotifications: checked });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="flex h-full w-full flex-col p-4"
      role="dialog"
    >
      <div className="w-full p-4  text-white">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold text-white">
            {t('settings')}
          </div>
          <Button
            aria-label={t('buttonClose')}
            onClick={onClose}
            size="sm"
            className="text-white hover:bg-white/20"
            variant="ghost"
          >
            {t('buttonClose')}
          </Button>
        </div>

        <Separator className="mb-4 bg-white/30" />
        {/* 在未完成状态获取前，不渲染各开关，避免初始值抖动 */}
        {!state?.config ? (
          <div className="flex-1">
            <div className="animate-pulse space-y-4">
              <div className="h-5 w-40 rounded bg-white/30" />
              <div className="h-10 w-full rounded bg-white/20" />
              <div className="h-10 w-full rounded bg-white/20" />
              <div className="h-5 w-40 rounded bg-white/30 mt-6" />
              <div className="h-10 w-full rounded bg-white/20" />
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-6">
            {/* General Features Section */}
            {showTaskSetting && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-white">
                  {t('settingsGeneralFeatures')}
                </h3>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <Label
                      className="text-sm font-medium text-white"
                      htmlFor="enable-task"
                    >
                      {t('settingsTaskMode')}
                    </Label>
                    <p className="text-xs text-white/70 mt-1">
                      {t('settingsTaskModeDesc')}
                    </p>
                  </div>
                  <Switch
                    aria-label={t('settingsTaskMode')}
                    checked={state?.config?.enableTask ?? false}
                    id="enable-task"
                    className={flatSwitchClass}
                    onCheckedChange={(v) =>
                      updateConfigPartial({ enableTask: v })
                    }
                  />
                </div>
              </div>
            )}

            {/* Display Options Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-white">
                {t('settingsDisplayOptions')}
              </h3>

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <Label
                    className="text-sm font-medium text-white"
                    htmlFor="floating-timer"
                  >
                    {t('settingsFloatingTimer')}
                  </Label>
                  <p className="text-xs text-white/70 mt-1">
                    {t('settingsFloatingTimerDesc')}
                  </p>
                </div>
                <Switch
                  aria-label={t('settingsFloatingTimer')}
                  checked={state?.config?.showFloatingTimer ?? false}
                  id="floating-timer"
                  className={flatSwitchClass}
                  onCheckedChange={(v) =>
                    updateConfigPartial({ showFloatingTimer: v })
                  }
                />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <Label
                    className="text-sm font-medium text-white"
                    htmlFor="break-notifications"
                  >
                    {t('settingsBreakNotifications')}
                  </Label>
                  <p className="text-xs text-white/70 mt-1">
                    {t('settingsBreakNotificationsDesc')}
                  </p>
                </div>
                <Switch
                  aria-label={t('settingsBreakNotifications')}
                  checked={state?.config?.enableBreakNotifications ?? false}
                  id="break-notifications"
                  className={flatSwitchClass}
                  onCheckedChange={handleToggleBreakNotifications}
                />
              </div>
            </div>

            {/* Break Behavior Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-white">
                {t('settingsBreakBehavior')}
              </h3>

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <Label
                    className="text-sm font-medium text-white"
                    htmlFor="strict-mode"
                  >
                    {t('settingsStrictMode')}
                  </Label>
                  <p className="text-xs text-white/70 mt-1">
                    {t('settingsStrictModeDesc')}
                  </p>
                </div>
                <Switch
                  aria-label={t('settingsStrictMode')}
                  checked={state?.config?.strictMode ?? false}
                  id="strict-mode"
                  className={flatSwitchClass}
                  onCheckedChange={(v) =>
                    updateConfigPartial({ strictMode: v })
                  }
                />
              </div>

              {!(state?.config?.strictMode ?? false) && (
                <div className="rounded-md bg-white/20 p-2.5 text-xs text-white/80">
                  <p>{t('settingsNormalMode')}</p>
                </div>
              )}

              {state?.config?.strictMode && (
                <div className="rounded-md bg-yellow-500/20 p-2.5 text-xs">
                  <p className="font-medium text-yellow-200">
                    {t('settingsStrictModeEnabled')}
                  </p>
                  <p className="mt-1 text-white/80">
                    {t('settingsStrictModeEnabledDesc')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <Separator className="my-4 bg-white/30" />

        {/* <div className="flex justify-end gap-2">
          <Button
            onClick={onClose}
            size="sm"
            className="rounded-lg border-0 shadow-none bg-white/20 text-white hover:bg-white/30"
            variant="outline">
            {t("buttonClose")}
          </Button>
        </div> */}
      </div>
    </div>
  );
}
