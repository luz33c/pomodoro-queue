import type { PlasmoMessaging } from "@plasmohq/messaging"
import { getNextStateAfterPhase } from "~background/index"
import { Storage } from "@plasmohq/storage"
import { STORAGE_KEY, type PomodoroState } from "~pomodoro/types"

const storage = new Storage({ area: "local" })

export type ResponseBody = { ok: true }

const handler: PlasmoMessaging.MessageHandler<never, ResponseBody> = async (
  _req,
  res
) => {
  const s = await storage.get<PomodoroState>(STORAGE_KEY)
  if (s && s.running) {
    const next = getNextStateAfterPhase(s)
    await storage.set(STORAGE_KEY, next)
    await chrome.alarms.clear("pomodoro-phase-end")
    if (next.endsAt) {
      await chrome.alarms.create("pomodoro-phase-end", { when: next.endsAt })
    }
  }
  res.send({ ok: true })
}

export default handler
