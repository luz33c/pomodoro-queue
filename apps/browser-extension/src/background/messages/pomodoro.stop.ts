/**
 * 番茄时钟停止消息处理器
 *
 * 处理来自前端UI的停止番茄时钟请求。
 * 停止会终止当前会话，重置状态到空闲状态，并记录历史。
 */

import type { PlasmoMessaging } from '@plasmohq/messaging';
import { stopAll } from '~background/index';

// 响应体类型：成功标识
export type ResponseBody = { ok: true };

const handler: PlasmoMessaging.MessageHandler<never, ResponseBody> = async (
  _req,
  res
) => {
  // 调用后台核心函数停止所有计时器
  await stopAll();

  // 返回成功响应
  res.send({ ok: true });
};

export default handler;
