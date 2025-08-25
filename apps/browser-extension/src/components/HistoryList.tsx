import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useStorage } from "@plasmohq/storage/hook"
import { Storage } from "@plasmohq/storage"
import type { PomodoroHistoryEntry, PomodoroState } from "@/pomodoro/types"
import { HISTORY_KEY, STORAGE_KEY } from "@/pomodoro/types"

const localInstance = new Storage({ area: "local" })

function formatTime(ts: number) {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

function minutes(ms: number) {
  return Math.round(ms / 60000)
}

export function HistoryList() {
  const [history] = useStorage<PomodoroHistoryEntry[]>({ key: HISTORY_KEY, instance: localInstance, initialValue: [] })
  const [state] = useStorage<PomodoroState>({ key: STORAGE_KEY, instance: localInstance })

  const list = [...(history ?? [])].sort((a, b) => b.endedAt - a.endedAt)

  return (
    <div className="mx-auto mb-8 w-[360px] max-w-full">
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">历史记录</h3>
      {state?.running && (
        <Card className="mb-3 p-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">当前 · {state.phase === "focus" ? "专注时段" : state.phase === "short" ? "短休息" : "长休息"}</div>
            <div className="text-sm text-muted-foreground">进行中</div>
          </div>
        </Card>
      )}
      <div className="space-y-2">
        {list.map((h) => (
          <Card key={h.id} className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{h.title}</div>
                <div className="text-sm text-muted-foreground">{minutes(h.durationMs)} 分钟</div>
              </div>
              <div className="text-sm text-muted-foreground">{formatTime(h.endedAt)}</div>
            </div>
          </Card>
        ))}
        {list.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">还没有完成的番茄钟，开始你的第一个专注时段吧！</Card>
        )}
      </div>
      <Separator className="mt-4" />
    </div>
  )
}
