import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { usePomodoro } from "@/hooks/pomodoro/usePomodoro"
import { Settings } from "lucide-react"

interface PomodoroSettingsProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function PomodoroSettings({ isOpen = true, onClose }: PomodoroSettingsProps) {
  const { state, updateConfig } = usePomodoro()
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
        <div className="text-lg font-semibold">番茄钟设置</div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="关闭">
          关闭
        </Button>
      </div>
      
      <Separator className="mb-4" />
      
      <div className="flex-1">
        <div className="space-y-3">
          <h3 className="text-sm font-medium">休息行为设置</h3>
          
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <Label htmlFor="strict-mode" className="text-sm font-medium">
                严格休息模式
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                启用后，休息期间将强制停留在休息页面，无法浏览其他标签页
              </p>
            </div>
            <Switch
              id="strict-mode"
              checked={strictMode}
              onCheckedChange={setStrictMode}
              aria-label="严格休息模式开关"
            />
          </div>
          
          {!strictMode && (
            <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
              <p>普通模式：休息时会在当前页面显示遮罩层提醒</p>
            </div>
          )}
          
          {strictMode && (
            <div className="rounded-md bg-primary/10 p-2.5 text-xs">
              <p className="font-medium text-primary">严格模式已启用</p>
              <p className="mt-1 text-muted-foreground">
                休息时会打开专属休息页面，切换标签会被自动拉回
              </p>
            </div>
          )}
        </div>
      </div>
      
      <Separator className="my-4" />
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          取消
        </Button>
        <Button size="sm" onClick={handleSave}>
          保存设置
        </Button>
      </div>
    </div>
  )
}