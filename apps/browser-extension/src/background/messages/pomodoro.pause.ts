/**
 * 番茄时钟暂停消息处理器
 * 
 * 处理来自前端UI的暂停番茄时钟请求。
 * 暂停会保存当前进度，用户可以稍后恢复。
 */

import type { PlasmoMessaging } from "@plasmohq/messaging"
import { pauseTimer } from "~background/index"

// 响应体类型：成功标识
export type ResponseBody = { ok: true }

const handler: PlasmoMessaging.MessageHandler<never, ResponseBody> = async (
  _req,
  res
) => {
  // 调用后台核心函数暂停计时器
  await pauseTimer()
  
  // 返回成功响应
  res.send({ ok: true })
}

export default handler
