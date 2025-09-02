import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { usePomodoro } from "@/hooks/pomodoro/usePomodoro"
import { useI18n } from "@/hooks/useI18n"
import { sendToBackground } from "@plasmohq/messaging"
import { Settings, Bell, BellOff, AlertTriangle } from "lucide-react"

interface PomodoroSettingsProps {
  isOpen?: boolean;
  onClose?: () => void;
  showTaskSetting?: boolean;
}

export function PomodoroSettings({ isOpen = true, onClose, showTaskSetting = true }: PomodoroSettingsProps) {
  const { state, updateConfig } = usePomodoro()
  const { t } = useI18n()
  const [strictMode, setStrictMode] = useState(state?.config?.strictMode ?? false)
  const [enableTask, setEnableTask] = useState(state?.config?.enableTask ?? false)
  const [showFloatingTimer, setShowFloatingTimer] = useState(state?.config?.showFloatingTimer ?? true)
  const [enableBreakNotifications, setEnableBreakNotifications] = useState(state?.config?.enableBreakNotifications ?? true)
  
  // 通知权限相关状态
  const [notificationPermission, setNotificationPermission] = useState<'granted' | 'denied' | 'unknown'>('unknown')
  const [isCheckingPermission, setIsCheckingPermission] = useState(false)
  const [isTestingNotification, setIsTestingNotification] = useState(false)

  useEffect(() => {
    if (state?.config) {
      if (state.config.strictMode !== undefined) {
        setStrictMode(state.config.strictMode)
      }
      if (state.config.enableTask !== undefined) {
        setEnableTask(state.config.enableTask)
      }
      if (state.config.showFloatingTimer !== undefined) {
        setShowFloatingTimer(state.config.showFloatingTimer)
      }
      if (state.config.enableBreakNotifications !== undefined) {
        setEnableBreakNotifications(state.config.enableBreakNotifications)
      }
    }
  }, [state?.config])

  // 检查通知权限
  const checkNotificationPermission = async () => {
    try {
      setIsCheckingPermission(true)
      const response = await sendToBackground({
        name: "notifications",
        body: { action: 'checkPermission' }
      })
      if (response.success && response.permission) {
        setNotificationPermission(response.permission)
      }
    } catch (error) {
      console.error('Failed to check notification permission:', error)
    } finally {
      setIsCheckingPermission(false)
    }
  }

  // 发送测试通知
  const handleTestNotification = async () => {
    try {
      setIsTestingNotification(true)
      const response = await sendToBackground({
        name: "notifications",
        body: { action: 'sendTest', testPhase: 'short' }
      })
      console.log('Test notification result:', response)
    } catch (error) {
      console.error('Failed to send test notification:', error)
    } finally {
      setIsTestingNotification(false)
    }
  }

  // 组件打开时检查通知权限
  useEffect(() => {
    if (isOpen) {
      checkNotificationPermission()
    }
  }, [isOpen])

  const handleSave = async () => {
    if (!state?.config) return
    await updateConfig({
      ...state.config,
      strictMode,
      enableTask,
      showFloatingTimer,
      enableBreakNotifications
    })
    onClose?.()
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="flex h-full w-full flex-col bg-background p-4" role="dialog" aria-modal="true">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold">{t('settings')}</div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('buttonClose')}>
          {t('buttonClose')}
        </Button>
      </div>
      
      <Separator className="mb-4" />
      
      <div className="flex-1 space-y-6">
        {/* General Features Section */}
        {showTaskSetting && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">{t('settingsGeneralFeatures')}</h3>
            
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <Label htmlFor="enable-task" className="text-sm font-medium">
                  {t('settingsTaskMode')}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('settingsTaskModeDesc')}
                </p>
              </div>
              <Switch
                id="enable-task"
                checked={enableTask}
                onCheckedChange={setEnableTask}
                aria-label={t('settingsTaskMode')}
              />
            </div>
          </div>
        )}

        {/* Display Options Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">{t('settingsDisplayOptions')}</h3>
          
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <Label htmlFor="floating-timer" className="text-sm font-medium">
                {t('settingsFloatingTimer')}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t('settingsFloatingTimerDesc')}
              </p>
            </div>
            <Switch
              id="floating-timer"
              checked={showFloatingTimer}
              onCheckedChange={setShowFloatingTimer}
              aria-label={t('settingsFloatingTimer')}
            />
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <Label htmlFor="break-notifications" className="text-sm font-medium">
                {t('settingsBreakNotifications')}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t('settingsBreakNotificationsDesc')}
              </p>
            </div>
            <Switch
              id="break-notifications"
              checked={enableBreakNotifications}
              onCheckedChange={setEnableBreakNotifications}
              aria-label={t('settingsBreakNotifications')}
            />
          </div>

          {/* Notification Permission Status */}
          <div className="rounded-md bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {notificationPermission === 'granted' ? (
                  <Bell className="h-4 w-4 text-green-500" />
                ) : notificationPermission === 'denied' ? (
                  <BellOff className="h-4 w-4 text-red-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {t('notificationPermissionTitle')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {notificationPermission === 'granted' 
                      ? t('notificationPermissionGranted')
                      : notificationPermission === 'denied'
                      ? t('notificationPermissionDenied')
                      : t('notificationPermissionUnknown')
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkNotificationPermission}
                  disabled={isCheckingPermission}
                >
                  {isCheckingPermission ? '检查中...' : '检查权限'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestNotification}
                  disabled={isTestingNotification || notificationPermission !== 'granted'}
                >
                  {isTestingNotification ? '发送中...' : t('buttonTestNotification')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Break Behavior Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">{t('settingsBreakBehavior')}</h3>
          
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <Label htmlFor="strict-mode" className="text-sm font-medium">
                {t('settingsStrictMode')}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t('settingsStrictModeDesc')}
              </p>
            </div>
            <Switch
              id="strict-mode"
              checked={strictMode}
              onCheckedChange={setStrictMode}
              aria-label={t('settingsStrictMode')}
            />
          </div>
          
          {!strictMode && (
            <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
              <p>{t('settingsNormalMode')}</p>
            </div>
          )}
          
          {strictMode && (
            <div className="rounded-md bg-primary/10 p-2.5 text-xs">
              <p className="font-medium text-primary">{t('settingsStrictModeEnabled')}</p>
              <p className="mt-1 text-muted-foreground">
                {t('settingsStrictModeEnabledDesc')}
              </p>
            </div>
          )}
        </div>
      </div>
      
      <Separator className="my-4" />
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          {t('buttonCancel')}
        </Button>
        <Button size="sm" onClick={handleSave}>
          {t('buttonSave')}
        </Button>
      </div>
    </div>
  )
}