/**
 * 番茄时钟开始消息处理器
 *
 * 处理来自前端UI的开始番茄时钟请求，可以指定要开始的阶段类型。
 * 这是用户点击"开始"按钮时触发的后台处理逻辑。
 */

import type { PlasmoMessaging } from '@plasmohq/messaging';
import { startPhase } from '~background/index';
import type { PomodoroPhase } from '~model/pomodoro/types';

// 请求体类型：可选的阶段参数
export type RequestBody = { phase?: PomodoroPhase };
// 响应体类型：成功标识
export type ResponseBody = { ok: true };

const handler: PlasmoMessaging.MessageHandler<
  RequestBody,
  ResponseBody
> = async (req, res) => {
  // 从请求中获取阶段类型，默认为"focus"专注阶段
  const phase: PomodoroPhase = req.body?.phase ?? 'focus';

  // 调用后台核心函数开始指定阶段
  await startPhase(phase);

  // 返回成功响应
  res.send({ ok: true });
};

export default handler;
