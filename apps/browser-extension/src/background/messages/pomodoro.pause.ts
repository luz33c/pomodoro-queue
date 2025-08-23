import type { PlasmoMessaging } from "@plasmohq/messaging"
import { pauseTimer } from "~background/index"

export type ResponseBody = { ok: true }

const handler: PlasmoMessaging.MessageHandler<never, ResponseBody> = async (
  _req,
  res
) => {
  await pauseTimer()
  res.send({ ok: true })
}

export default handler
