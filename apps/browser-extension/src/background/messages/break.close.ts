/**
 * 休息页面关闭消息处理器
 *
 * 处理来自严格模式Break页面的关闭请求。
 * 当用户在严格模式下点击关闭休息页面时触发。
 */

import type { PlasmoMessaging } from '@plasmohq/messaging';
import { endStrictBreak } from '~background/strict-break';

// 响应体类型：成功标识
export type ResponseBody = { ok: true };

const handler: PlasmoMessaging.MessageHandler<never, ResponseBody> = async (
  _req,
  res
) => {
  // 结束严格模式的休息状态，关闭Break页面
  // Mark: break control
  // Break 页面发送“关闭”指令（严格模式下）→ 关闭所有 Break 标签
  await endStrictBreak();

  // 返回成功响应
  res.send({ ok: true });
};

export default handler;
