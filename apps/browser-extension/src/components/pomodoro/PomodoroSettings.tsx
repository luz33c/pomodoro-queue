import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { usePomodoro } from "@/hooks/pomodoro/usePomodoro"
import { useI18n } from "@/hooks/useI18n"
import { useEffect, useState } from "react"

interface PomodoroSettingsProps {
  isOpen?: boolean
  onClose?: () => void
  showTaskSetting?: boolean
}

export function PomodoroSettings({
  isOpen = true,
  onClose,
  showTaskSetting = true
}: PomodoroSettingsProps) {
  const { state, updateConfig } = usePomodoro()
  const { t } = useI18n()
  const [strictMode, setStrictMode] = useState(
    state?.config?.strictMode ?? false
  )
  const [enableTask, setEnableTask] = useState(
    state?.config?.enableTask ?? false
  )
  const [showFloatingTimer, setShowFloatingTimer] = useState(
    state?.config?.showFloatingTimer ?? true
  )
  const [enableBreakNotifications, setEnableBreakNotifications] = useState(
    state?.config?.enableBreakNotifications ?? false
  )

  // 扁平化 Switch：通过父组件传入类名覆盖 UI 组件默认样式
  const flatSwitchClass =
    [
      // 轨道：去边框与阴影，使用白色系与主界面匹配
      'border-0 shadow-none focus-visible:ring-white/60',
      'data-[state=checked]:bg-white data-[state=unchecked]:bg-white/25',
      // 圆点：移除阴影，未开=白色，开启=黑色
      '![&_span]:shadow-none',
      'data-[state=unchecked]:![&_span]:bg-white',
      'data-[state=checked]:![&_span]:bg-black'
    ].join(' ')

  // 立即持久化休息提醒开关，避免用户只切换未保存导致未生效
  const handleToggleBreakNotifications = async (checked: boolean) => {
    setEnableBreakNotifications(checked)
    // 开启时检查/请求权限（如未来改为可选权限）
    if (checked && typeof chrome !== "undefined" && chrome?.permissions) {
      try {
        const hasPerm = await chrome.permissions.contains({
          permissions: ["notifications"]
        })
        if (!hasPerm && chrome.permissions.request) {
          const granted = await chrome.permissions.request({
            permissions: ["notifications"]
          })
          if (!granted) {
            setEnableBreakNotifications(false)
            return
          }
        }
      } catch {
        // 忽略权限探测错误
      }
    }
    if (state?.config) {
      await updateConfig({
        ...state.config,
        enableBreakNotifications: checked
      })
    }
  }

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

  const handleSave = async () => {
    if (!state?.config) return
    // 开启通知时（如有必要）检查/请求权限
    if (
      enableBreakNotifications &&
      typeof chrome !== "undefined" &&
      chrome?.permissions
    ) {
      try {
        const hasPerm = await chrome.permissions.contains({
          permissions: ["notifications"]
        })
        if (!hasPerm && chrome.permissions.request) {
          const granted = await chrome.permissions.request({
            permissions: ["notifications"]
          })
          if (!granted) {
            // 权限未授予，保持关闭
            setEnableBreakNotifications(false)
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
      enableBreakNotifications
    })
    onClose?.()
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      aria-modal="true"
      className="flex h-full w-full flex-col p-4"
      role="dialog">
      <div className="w-full p-4  text-white">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold text-white">
            {t("settings")}
          </div>
          <Button
            aria-label={t("buttonClose")}
            onClick={onClose}
            size="sm"
            className="text-white hover:bg-white/20"
            variant="ghost">
            {t("buttonClose")}
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
                  {t("settingsGeneralFeatures")}
                </h3>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <Label
                      className="text-sm font-medium text-white"
                      htmlFor="enable-task">
                      {t("settingsTaskMode")}
                    </Label>
                    <p className="text-xs text-white/70 mt-1">
                      {t("settingsTaskModeDesc")}
                    </p>
                  </div>
                  <Switch
                    aria-label={t("settingsTaskMode")}
                    checked={enableTask}
                    id="enable-task"
                    className={flatSwitchClass}
                    onCheckedChange={setEnableTask}
                  />
                </div>
              </div>
            )}

            {/* Display Options Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-white">
                {t("settingsDisplayOptions")}
              </h3>

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <Label
                    className="text-sm font-medium text-white"
                    htmlFor="floating-timer">
                    {t("settingsFloatingTimer")}
                  </Label>
                  <p className="text-xs text-white/70 mt-1">
                    {t("settingsFloatingTimerDesc")}
                  </p>
                </div>
                <Switch
                  aria-label={t("settingsFloatingTimer")}
                  checked={showFloatingTimer}
                  id="floating-timer"
                  className={flatSwitchClass}
                  onCheckedChange={setShowFloatingTimer}
                />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <Label
                    className="text-sm font-medium text-white"
                    htmlFor="break-notifications">
                    {t("settingsBreakNotifications")}
                  </Label>
                  <p className="text-xs text-white/70 mt-1">
                    {t("settingsBreakNotificationsDesc")}
                  </p>
                </div>
                <Switch
                  aria-label={t("settingsBreakNotifications")}
                  checked={enableBreakNotifications}
                  id="break-notifications"
                  className={flatSwitchClass}
                  onCheckedChange={handleToggleBreakNotifications}
                />
              </div>
            </div>

            {/* Break Behavior Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-white">
                {t("settingsBreakBehavior")}
              </h3>

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <Label
                    className="text-sm font-medium text-white"
                    htmlFor="strict-mode">
                    {t("settingsStrictMode")}
                  </Label>
                  <p className="text-xs text-white/70 mt-1">
                    {t("settingsStrictModeDesc")}
                  </p>
                </div>
                <Switch
                  aria-label={t("settingsStrictMode")}
                  checked={strictMode}
                  id="strict-mode"
                  className={flatSwitchClass}
                  onCheckedChange={setStrictMode}
                />
              </div>

              {!strictMode && (
                <div className="rounded-md bg-white/20 p-2.5 text-xs text-white/80">
                  <p>{t("settingsNormalMode")}</p>
                </div>
              )}

              {strictMode && (
                <div className="rounded-md bg-yellow-500/20 p-2.5 text-xs">
                  <p className="font-medium text-yellow-200">
                    {t("settingsStrictModeEnabled")}
                  </p>
                  <p className="mt-1 text-white/80">
                    {t("settingsStrictModeEnabledDesc")}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <Separator className="my-4 bg-white/30" />

        <div className="flex justify-end gap-2">
          <Button
            onClick={onClose}
            size="sm"
            className="rounded-lg border-0 shadow-none bg-white/20 text-white hover:bg-white/30"
            variant="outline">
            {t("buttonCancel")}
          </Button>
          <Button
            onClick={handleSave}
            size="sm"
            className="rounded-lg border-0 shadow-none bg-white text-black hover:bg-white/90">
            {t("buttonSave")}
          </Button>
        </div>
      </div>
    </div>
  )
}
