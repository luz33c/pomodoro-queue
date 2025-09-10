/**
 * 番茄时钟恢复消息处理器
 *
 * 处理来自前端UI的恢复番茄时钟请求。
 * 恢复会从暂停的地方继续计时，调整结束时间。
 */

import type { PlasmoMessaging } from '@plasmohq/messaging';
import { resumeTimer } from '~background/index';

// 响应体类型：成功标识
export type ResponseBody = { ok: true };

const handler: PlasmoMessaging.MessageHandler<never, ResponseBody> = async (
  _req,
  res
) => {
  // 调用后台核心函数恢复计时器
  await resumeTimer();

  // 返回成功响应
  res.send({ ok: true });
};

export default handler;
