import type { PlasmoMessaging } from "@plasmohq/messaging"
import { getNextStateAfterPhase, schedulePhaseEndAlarm, notifyPhase } from "~background/index"
import { Storage } from "@plasmohq/storage"
import { STORAGE_KEY, HISTORY_KEY, CURRENT_QUEUE_KEY, type PomodoroState, type PomodoroHistoryEntry, type CurrentQueue } from "~model/pomodoro/types"

const storage = new Storage({ area: "local" })

export type ResponseBody = { ok: true }

const handler: PlasmoMessaging.MessageHandler<never, ResponseBody> = async (
  _req,
  res
) => {
  const s = await storage.get<PomodoroState>(STORAGE_KEY)
  if (s?.running) {
    // 将当前段记入历史
    if (s.startedAt && s.phase !== "idle") {
      const endedAt = Date.now()
      const title = s.phase === "focus" ? "专注时段" : s.phase === "short" ? "短休息" : "长休息"
      const list = (await storage.get<PomodoroHistoryEntry[]>(HISTORY_KEY)) ?? []
      const q = (await storage.get<CurrentQueue>(CURRENT_QUEUE_KEY)) ?? null
      list.push({ id: `${Date.now()}`, phase: s.phase, title, startedAt: s.startedAt, endedAt, durationMs: Math.max(0, endedAt - s.startedAt), queueId: q?.id })
      await storage.set(HISTORY_KEY, list)
    }

    let next = getNextStateAfterPhase(s)
    // 跳过 0 分钟休息
    if ((next.phase === "short" || next.phase === "long") && !next.endsAt) {
      next = getNextStateAfterPhase(next)
    }

    await storage.set(STORAGE_KEY, next)
    await schedulePhaseEndAlarm(next)
    await notifyPhase(next.phase)
  }
  res.send({ ok: true })
}

export default handler
