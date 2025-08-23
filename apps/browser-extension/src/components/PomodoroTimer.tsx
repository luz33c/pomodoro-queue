import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { usePomodoro } from "@/hooks/usePomodoro"
import { Settings } from "lucide-react"
import { PomodoroSettings } from "./PomodoroSettings"

function phaseLabel(phase: string) {
  if (phase === "focus") return "专注时段"
  if (phase === "short") return "短休息"
  if (phase === "long") return "长休息"
  return "未开始"
}

export function PomodoroTimer() {
  const { state, progress, mmss, start, pause, resume, stop, skip } = usePomodoro()
  const [open, setOpen] = useState(false)

  const ringStyle = useMemo(() => {
    const p = Math.max(0, Math.min(1, progress))
    const deg = p * 360
    return {
      background: `conic-gradient(hsl(var(--primary)) ${deg}deg, hsl(var(--muted)) ${deg}deg)`
    } as const
  }, [progress])

  const running = state?.running
  const paused = !!state?.paused
  const phase = state?.phase ?? "idle"

  return (
    <Card className="mx-auto my-6 w-[360px] max-w-full p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">番茄钟</h2>
        <Button variant="ghost" size="icon" aria-label="设置" onClick={() => setOpen(true)}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        <div className="relative h-44 w-44">
          <div className="absolute inset-0 rounded-full p-[6px]" style={ringStyle}>
            <div className="h-full w-full rounded-full bg-background" />
          </div>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-4xl font-bold tabular-nums">{mmss}</div>
            <div className="mt-1 text-sm text-muted-foreground">{phaseLabel(phase)}</div>
          </div>
        </div>

        <div className="flex gap-2">
          {!running && (
            <Button onClick={() => setOpen(true)} aria-label="开始番茄钟">
              开始
            </Button>
          )}
          {running && !paused && (
            <Button variant="secondary" onClick={() => pause()} aria-label="暂停">
              暂停
            </Button>
          )}
          {running && paused && (
            <Button onClick={() => resume()} aria-label="继续">
              继续
            </Button>
          )}
          {running && (
            <Button variant="destructive" onClick={() => stop()} aria-label="终止队列">
              终止队列
            </Button>
          )}
          {running && (
            <Button variant="outline" onClick={() => skip()} aria-label="跳过阶段">
              跳过
            </Button>
          )}
        </div>
      </div>

      <PomodoroSettings open={open} onOpenChange={setOpen} />
    </Card>
  )
}
