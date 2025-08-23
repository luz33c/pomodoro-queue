import type { PlasmoMessaging } from "@plasmohq/messaging"
import { stopAll } from "~background/index"

export type ResponseBody = { ok: true }

const handler: PlasmoMessaging.MessageHandler<never, ResponseBody> = async (
  _req,
  res
) => {
  await stopAll()
  res.send({ ok: true })
}

export default handler
