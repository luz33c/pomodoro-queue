/**
 * 番茄时钟配置更新消息处理器
 *
 * 处理来自前端UI的配置更新请求。
 * 更新包括专注时间、休息时间、长休息间隔、严格模式等设置。
 */

import type { PlasmoMessaging } from '@plasmohq/messaging'
import { applyConfig } from '~background/index'
import type { PomodoroConfig } from '~model/pomodoro/types'

// 请求体类型：完整的番茄时钟配置
export type RequestBody = PomodoroConfig
// 响应体类型：成功标识
export type ResponseBody = { ok: true }

const handler: PlasmoMessaging.MessageHandler<
  RequestBody,
  ResponseBody
> = async (req, res) => {
  // 调用后台核心函数应用新配置
  await applyConfig(req.body)

  // 返回成功响应
  res.send({ ok: true })
}

export default handler
