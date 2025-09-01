/**
 * 番茄时钟跳过消息处理器
 * 
 * 处理来自前端UI的跳过当前阶段请求。
 * 跳过会立即结束当前阶段，记录到历史，并自动进入下一阶段。
 * 如果从休息状态跳过，会关闭严格模式的Break页面。
 */

import type { PlasmoMessaging } from "@plasmohq/messaging"
import { getNextStateAfterPhase, schedulePhaseEndAlarm, notifyPhase } from "~background/index"
import { endStrictBreak } from "~background/strict-break"
import { Storage } from "@plasmohq/storage"
import { STORAGE_KEY, HISTORY_KEY, CURRENT_QUEUE_KEY, type PomodoroState, type PomodoroHistoryEntry, type CurrentQueue } from "~model/pomodoro/types"

const storage = new Storage({ area: "local" })

// 响应体类型：成功标识
export type ResponseBody = { ok: true }

const handler: PlasmoMessaging.MessageHandler<never, ResponseBody> = async (
  _req,
  res
) => {
  // 获取当前番茄时钟状态
  const s = await storage.get<PomodoroState>(STORAGE_KEY)
  
  if (s?.running) {
    // 检查是否从休息状态跳过（用于后续处理Break页面）
    const wasInBreak = s.phase === "short" || s.phase === "long"
    
    // 将被跳过的当前阶段记录到历史中
    if (s.startedAt && s.phase !== "idle") {
      const endedAt = Date.now()
      
      // 根据阶段类型获取本地化标题
      const title = s.phase === "focus" 
        ? chrome.i18n.getMessage('phaseFocus') 
        : s.phase === "short" 
          ? chrome.i18n.getMessage('phaseShortBreak') 
          : chrome.i18n.getMessage('phaseLongBreak')
      
      // 获取现有历史记录和当前队列信息
      const list = (await storage.get<PomodoroHistoryEntry[]>(HISTORY_KEY)) ?? []
      const q = (await storage.get<CurrentQueue>(CURRENT_QUEUE_KEY)) ?? null
      
      // 添加新的历史记录
      list.push({ 
        id: `${Date.now()}`, 
        phase: s.phase, 
        title, 
        startedAt: s.startedAt, 
        endedAt, 
        durationMs: Math.max(0, endedAt - s.startedAt), 
        queueId: q?.id 
      })
      
      await storage.set(HISTORY_KEY, list)
    }

    // 获取跳过后的下一个状态
    let next = getNextStateAfterPhase(s)
    
    // 如果下一阶段是0分钟的休息，直接跳过进入专注阶段
    if ((next.phase === "short" || next.phase === "long") && !next.endsAt) {
      next = getNextStateAfterPhase(next)
    }

    // 更新状态并重新安排定时器
    await storage.set(STORAGE_KEY, next)
    await schedulePhaseEndAlarm(next)
    await notifyPhase(next.phase)
    
    // 如果从休息状态跳过，关闭严格模式的Break页面
    if (wasInBreak) {
      await endStrictBreak()
    }
  }
  
  // 返回成功响应
  res.send({ ok: true })
}

export default handler
