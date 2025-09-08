import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { usePomodoro } from '@/hooks/pomodoro/usePomodoro';
import { useI18n } from '@/hooks/useI18n';

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
  const { state, updateConfig, hydrated } = usePomodoro();
  const { t } = useI18n();
  const [strictMode, setStrictMode] = useState(
    state?.config?.strictMode ?? false
  );
  const [enableTask, setEnableTask] = useState(
    state?.config?.enableTask ?? false
  );
  const [showFloatingTimer, setShowFloatingTimer] = useState(
    state?.config?.showFloatingTimer ?? true
  );
  const [enableBreakNotifications, setEnableBreakNotifications] = useState(
    state?.config?.enableBreakNotifications ?? false
  );

  // 立即持久化休息提醒开关，避免用户只切换未保存导致未生效
  const handleToggleBreakNotifications = async (checked: boolean) => {
    setEnableBreakNotifications(checked);
    // 开启时检查/请求权限（如未来改为可选权限）
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
            setEnableBreakNotifications(false);
            return;
          }
        }
      } catch {
        // 忽略权限探测错误
      }
    }
    if (state?.config) {
      await updateConfig({
        ...state.config,
        enableBreakNotifications: checked,
      });
    }
  };

  useEffect(() => {
    if (state?.config) {
      if (state.config.strictMode !== undefined) {
        setStrictMode(state.config.strictMode);
      }
      if (state.config.enableTask !== undefined) {
        setEnableTask(state.config.enableTask);
      }
      if (state.config.showFloatingTimer !== undefined) {
        setShowFloatingTimer(state.config.showFloatingTimer);
      }
      if (state.config.enableBreakNotifications !== undefined) {
        setEnableBreakNotifications(state.config.enableBreakNotifications);
      }
    }
  }, [state?.config]);

  const handleSave = async () => {
    if (!state?.config) return;
    // 开启通知时（如有必要）检查/请求权限
    if (
      enableBreakNotifications &&
      typeof chrome !== 'undefined' &&
      chrome?.permissions
    ) {
      try {
        const hasPerm = await chrome.permissions.contains({
          permissions: ['notifications'],
        });
        if (!hasPerm && chrome.permissions.request) {
          const granted = await chrome.permissions.request({
            permissions: ['notifications'],
          });
          if (!granted) {
            // 权限未授予，保持关闭
            setEnableBreakNotifications(false);
          }
        }
      } catch {
        // 忽略权限探测错误
      }
    }
    await updateConfig({
      ...state.config,
      strictMode,
      enableTask,
      showFloatingTimer,
      enableBreakNotifications,
    });
    onClose?.();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="flex h-full w-full flex-col bg-background p-4"
      role="dialog"
    >
      <Card className="w-full p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold">{t('settings')}</div>
          <Button
            aria-label={t('buttonClose')}
            onClick={onClose}
            size="sm"
            variant="ghost"
          >
            {t('buttonClose')}
          </Button>
        </div>

        <Separator className="mb-4" />
        {/* 在未完成状态获取前，不渲染各开关，避免初始值抖动 */}
        {!hydrated ? (
          <div className="flex-1">
            <div className="animate-pulse space-y-4">
              <div className="h-5 w-40 rounded bg-muted/50" />
              <div className="h-10 w-full rounded bg-muted/30" />
              <div className="h-10 w-full rounded bg-muted/30" />
              <div className="h-5 w-40 rounded bg-muted/50 mt-6" />
              <div className="h-10 w-full rounded bg-muted/30" />
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-6">
            {/* General Features Section */}
            {showTaskSetting && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">
                  {t('settingsGeneralFeatures')}
                </h3>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <Label
                      className="text-sm font-medium"
                      htmlFor="enable-task"
                    >
                      {t('settingsTaskMode')}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('settingsTaskModeDesc')}
                    </p>
                  </div>
                  <Switch
                    aria-label={t('settingsTaskMode')}
                    checked={enableTask}
                    id="enable-task"
                    onCheckedChange={setEnableTask}
                  />
                </div>
              </div>
            )}

            {/* Display Options Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">
                {t('settingsDisplayOptions')}
              </h3>

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <Label
                    className="text-sm font-medium"
                    htmlFor="floating-timer"
                  >
                    {t('settingsFloatingTimer')}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settingsFloatingTimerDesc')}
                  </p>
                </div>
                <Switch
                  aria-label={t('settingsFloatingTimer')}
                  checked={showFloatingTimer}
                  id="floating-timer"
                  onCheckedChange={setShowFloatingTimer}
                />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <Label
                    className="text-sm font-medium"
                    htmlFor="break-notifications"
                  >
                    {t('settingsBreakNotifications')}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settingsBreakNotificationsDesc')}
                  </p>
                </div>
                <Switch
                  aria-label={t('settingsBreakNotifications')}
                  checked={enableBreakNotifications}
                  id="break-notifications"
                  onCheckedChange={handleToggleBreakNotifications}
                />
              </div>
            </div>

            {/* Break Behavior Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">
                {t('settingsBreakBehavior')}
              </h3>

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <Label className="text-sm font-medium" htmlFor="strict-mode">
                    {t('settingsStrictMode')}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settingsStrictModeDesc')}
                  </p>
                </div>
                <Switch
                  aria-label={t('settingsStrictMode')}
                  checked={strictMode}
                  id="strict-mode"
                  onCheckedChange={setStrictMode}
                />
              </div>

              {!strictMode && (
                <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
                  <p>{t('settingsNormalMode')}</p>
                </div>
              )}

              {strictMode && (
                <div className="rounded-md bg-primary/10 p-2.5 text-xs">
                  <p className="font-medium text-primary">
                    {t('settingsStrictModeEnabled')}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {t('settingsStrictModeEnabledDesc')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <Separator className="my-4" />

        <div className="flex justify-end gap-2">
          <Button onClick={onClose} size="sm" variant="outline">
            {t('buttonCancel')}
          </Button>
          <Button onClick={handleSave} size="sm">
            {t('buttonSave')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
