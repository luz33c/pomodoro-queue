import type { PlasmoMessaging } from "@plasmohq/messaging"
import { endStrictBreak } from "~background/strict-break"

export type ResponseBody = { ok: true }

const handler: PlasmoMessaging.MessageHandler<never, ResponseBody> = async (
  _req,
  res
) => {
  await endStrictBreak()
  res.send({ ok: true })
}

export default handler