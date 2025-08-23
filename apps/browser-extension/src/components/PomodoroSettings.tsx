import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { usePomodoro } from "@/hooks/usePomodoro"
import type { PomodoroConfig } from "@/pomodoro/types"
import { DEFAULT_CONFIG } from "@/pomodoro/types"

export function PomodoroSettings({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, updateConfig, start } = usePomodoro()
  const [form, setForm] = useState<PomodoroConfig>(state?.config ?? DEFAULT_CONFIG)

  useEffect(() => {
    if (state?.config) setForm(state.config)
  }, [state?.config])

  const setField = (k: keyof PomodoroConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value.replace(/[^\d]/g, ""))
    setForm((prev) => ({ ...prev, [k]: Number.isFinite(v) && v > 0 ? v : 1 }))
  }

  if (!open) return null

  return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/30" role="dialog" aria-modal="true">
        <div className="w-[380px] rounded-md bg-background p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-lg font-semibold">番茄钟设置</div>
            <Button variant="ghost" onClick={() => onOpenChange(false)} aria-label="关闭设置">关闭</Button>
          </div>
          <p className="text-sm text-muted-foreground">自定义专注与休息时长，创建适合自己的节奏。</p>
          <Separator className="my-4" />
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span>专注时长（分钟）</span>
              <Input inputMode="numeric" value={form.focusMin} onChange={setField("focusMin")} />
            </label>
            <label className="grid gap-2">
              <span>短休息时长（分钟）</span>
              <Input inputMode="numeric" value={form.shortMin} onChange={setField("shortMin")} />
            </label>
            <label className="grid gap-2">
              <span>长休息时长（分钟）</span>
              <Input inputMode="numeric" value={form.longMin} onChange={setField("longMin")} />
            </label>
            <label className="grid gap-2">
              <span>长休息间隔（完成多少个专注后）</span>
              <Input inputMode="numeric" value={form.longEvery} onChange={setField("longEvery")} />
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button
              onClick={async () => {
                await updateConfig(form)
                onOpenChange(false)
                if (!state?.running) await start("focus")
              }}
            >
              生成并开始
            </Button>
          </div>
        </div>
      </div>
  )
}
