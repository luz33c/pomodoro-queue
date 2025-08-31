import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { usePomodoro } from "@/hooks/pomodoro/usePomodoro"
import { useI18n } from "@/hooks/useI18n"
import { Settings } from "lucide-react"

interface PomodoroSettingsProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function PomodoroSettings({ isOpen = true, onClose }: PomodoroSettingsProps) {
  const { state, updateConfig } = usePomodoro()
  const { t } = useI18n()
  const [strictMode, setStrictMode] = useState(state?.config?.strictMode ?? false)

  useEffect(() => {
    if (state?.config?.strictMode !== undefined) {
      setStrictMode(state.config.strictMode)
    }
  }, [state?.config])

  const handleSave = async () => {
    if (!state?.config) return
    await updateConfig({
      ...state.config,
      strictMode
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
      
      <div className="flex-1">
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