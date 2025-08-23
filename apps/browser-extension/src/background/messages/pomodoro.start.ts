import type { PlasmoMessaging } from "@plasmohq/messaging"
import { startPhase } from "~background/index"
import type { PomodoroPhase } from "~pomodoro/types"

export type RequestBody = { phase?: PomodoroPhase }
export type ResponseBody = { ok: true }

const handler: PlasmoMessaging.MessageHandler<RequestBody, ResponseBody> = async (
  req,
  res
) => {
  const phase: PomodoroPhase = req.body?.phase ?? "focus"
  await startPhase(phase)
  res.send({ ok: true })
}

export default handler
