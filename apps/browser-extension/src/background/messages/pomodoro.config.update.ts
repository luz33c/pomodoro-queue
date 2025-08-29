import type { PlasmoMessaging } from "@plasmohq/messaging"
import { applyConfig } from "~background/index"
import type { PomodoroConfig } from "~model/pomodoro/types"

export type RequestBody = PomodoroConfig
export type ResponseBody = { ok: true }

const handler: PlasmoMessaging.MessageHandler<RequestBody, ResponseBody> = async (
  req,
  res
) => {
  await applyConfig(req.body)
  res.send({ ok: true })
}

export default handler
