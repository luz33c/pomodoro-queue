/**
 * 通知相关消息处理器
 * 
 * 处理前端关于通知权限、测试通知等相关请求
 */

import type { PlasmoMessaging } from "@plasmohq/messaging"
import { notificationManager } from "~background/notifications"
import type { PomodoroPhase } from "~model/pomodoro/types"

// 请求体类型
export type RequestBody = {
  action: 'checkPermission' | 'requestPermission' | 'sendTest' | 'clearAll'
  testPhase?: PomodoroPhase
}

// 响应体类型
export type ResponseBody = {
  success: boolean
  permission?: 'granted' | 'denied' | 'unknown'
  message?: string
}

const handler: PlasmoMessaging.MessageHandler<RequestBody, ResponseBody> = async (
  req,
  res
) => {
  try {
    const { action, testPhase } = req.body || {}

    switch (action) {
      case 'checkPermission': {
        const permission = await notificationManager.checkPermission()
        res.send({
          success: true,
          permission,
          message: `通知权限状态: ${permission}`
        })
        break
      }

      case 'requestPermission': {
        const permission = await notificationManager.requestPermission()
        res.send({
          success: permission === 'granted',
          permission,
          message: permission === 'granted' 
            ? '通知权限已授予' 
            : '通知权限被拒绝或不可用'
        })
        break
      }

      case 'sendTest': {
        const success = await notificationManager.sendTestNotification(testPhase || 'short')
        res.send({
          success,
          message: success 
            ? '测试通知已发送' 
            : '发送测试通知失败'
        })
        break
      }

      case 'clearAll': {
        await notificationManager.clearAllNotifications()
        res.send({
          success: true,
          message: '已清除所有通知'
        })
        break
      }

      default: {
        res.send({
          success: false,
          message: `未知的操作类型: ${action}`
        })
        break
      }
    }
  } catch (error) {
    console.error('[Notification Message Handler] Error:', error)
    res.send({
      success: false,
      message: `处理通知请求时发生错误: ${error.message}`
    })
  }
}

export default handler