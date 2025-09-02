/**
 * 番茄钟通知管理器
 * 
 * 负责管理所有与通知相关的功能：
 * - 通知权限检查和请求
 * - 通知创建和发送
 * - 通知点击和按钮交互处理
 * - 通知内容本地化
 */

import type { PomodoroPhase, PomodoroState } from "~model/pomodoro/types"
import { pauseTimer, resumeTimer, stopAll } from "./index"

/**
 * 通知权限状态
 */
export type NotificationPermission = 'granted' | 'denied' | 'unknown'

/**
 * 通知按钮配置
 */
interface NotificationButton {
  title: string
  iconUrl?: string
}

/**
 * 通知内容配置
 */
interface NotificationContent {
  title: string
  message: string
  buttons: NotificationButton[]
}

/**
 * 通知管理器类
 */
export class NotificationManager {
  private static instance: NotificationManager
  private notificationHistory: Map<string, { phase: PomodoroPhase, timestamp: number }> = new Map()

  private constructor() {
    this.initEventListeners()
  }

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  /**
   * 初始化通知事件监听器
   */
  private initEventListeners(): void {
    // 监听通知点击事件
    chrome.notifications.onClicked.addListener(async (notificationId) => {
      await this.handleNotificationClicked(notificationId)
    })

    // 监听通知按钮点击事件
    chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
      await this.handleNotificationButtonClicked(notificationId, buttonIndex)
    })

    // 监听通知关闭事件
    chrome.notifications.onClosed.addListener((notificationId, byUser) => {
      this.handleNotificationClosed(notificationId, byUser)
    })
  }

  /**
   * 检查通知权限
   */
  async checkPermission(): Promise<NotificationPermission> {
    try {
      const permission = await chrome.notifications.getPermissionLevel()
      return permission as NotificationPermission
    } catch (error) {
      console.error('[NotificationManager] Failed to check permission:', error)
      return 'unknown'
    }
  }

  /**
   * 请求通知权限（如果需要）
   */
  async requestPermission(): Promise<NotificationPermission> {
    const currentPermission = await this.checkPermission()
    if (currentPermission === 'granted') {
      return 'granted'
    }

    try {
      // Chrome扩展中通知权限通常通过manifest声明，这里主要是检查状态
      console.log('[NotificationManager] Notification permission should be granted via manifest')
      return currentPermission
    } catch (error) {
      console.error('[NotificationManager] Failed to request permission:', error)
      return 'denied'
    }
  }

  /**
   * 发送阶段通知
   */
  async sendPhaseNotification(phase: PomodoroPhase, config: PomodoroState['config']): Promise<boolean> {
    try {
      // 检查是否应该发送通知
      if (!this.shouldSendNotification(phase, config)) {
        console.log(`[NotificationManager] Skipping ${phase} notification due to config`)
        return false
      }

      // 检查权限
      const permission = await this.checkPermission()
      if (permission !== 'granted') {
        console.log('[NotificationManager] Permission not granted:', permission)
        return false
      }

      // 生成通知内容
      const content = this.getNotificationContent(phase, config)
      const notificationId = this.generateNotificationId(phase)
      const iconUrl = this.getIconUrl(phase)

      // 创建通知选项 - iconUrl 是必需属性
      const notificationOptions: chrome.notifications.NotificationOptions<true> = {
        type: 'basic',
        iconUrl: iconUrl, // 必需属性，不能省略
        title: content.title,
        message: content.message,
        priority: this.getNotificationPriority(phase),
        buttons: content.buttons,
        silent: false
      }

      // 创建通知
      await chrome.notifications.create(notificationId, notificationOptions)

      // 记录通知历史
      this.notificationHistory.set(notificationId, {
        phase,
        timestamp: Date.now()
      })

      console.log(`[NotificationManager] Sent ${phase} notification:`, notificationId)
      return true
    } catch (error) {
      console.error('[NotificationManager] Failed to send notification:', error)
      return false
    }
  }

  /**
   * 清除所有通知
   */
  async clearAllNotifications(): Promise<void> {
    try {
      const notifications = await chrome.notifications.getAll()
      for (const notificationId of Object.keys(notifications)) {
        if (notificationId.startsWith('pomodoro-')) {
          await chrome.notifications.clear(notificationId)
        }
      }
      this.notificationHistory.clear()
      console.log('[NotificationManager] Cleared all notifications')
    } catch (error) {
      console.error('[NotificationManager] Failed to clear notifications:', error)
    }
  }

  /**
   * 发送测试通知
   */
  async sendTestNotification(phase: PomodoroPhase = 'short'): Promise<boolean> {
    try {
      const testContent = {
        title: chrome.i18n.getMessage('notificationTestTitle'),
        message: chrome.i18n.getMessage('notificationTestMessage'),
        buttons: [
          { title: chrome.i18n.getMessage('buttonOK') }
        ]
      }

      const notificationId = `pomodoro-test-${Date.now()}`
      const iconUrl = this.getIconUrl(phase)

      // 创建测试通知选项 - iconUrl 是必需属性
      const testNotificationOptions: chrome.notifications.NotificationOptions<true> = {
        type: 'basic',
        iconUrl: iconUrl, // 必需属性，不能省略
        title: testContent.title,
        message: testContent.message,
        priority: 1,
        buttons: testContent.buttons
      }

      await chrome.notifications.create(notificationId, testNotificationOptions)

      console.log('[NotificationManager] Test notification sent:', notificationId)
      return true
    } catch (error) {
      console.error('[NotificationManager] Failed to send test notification:', error)
      return false
    }
  }

  /**
   * 检查是否应该发送通知
   */
  private shouldSendNotification(phase: PomodoroPhase, config: PomodoroState['config']): boolean {
    // 专注阶段通知总是发送（提醒用户开始工作）
    if (phase === 'focus') {
      return true
    }
    
    // 休息阶段通知根据配置决定
    if (phase === 'short' || phase === 'long') {
      return config.enableBreakNotifications
    }
    
    return false
  }

  /**
   * 获取通知内容
   */
  private getNotificationContent(phase: PomodoroPhase, config: PomodoroState['config']): NotificationContent {
    if (phase === 'focus') {
      return {
        title: chrome.i18n.getMessage('notificationFocusTitle'),
        message: chrome.i18n.getMessage('notificationFocusMessage'),
        buttons: [
          { title: chrome.i18n.getMessage('buttonPause') },
          { title: chrome.i18n.getMessage('buttonStop') }
        ]
      }
    }
    
    if (phase === 'short') {
      const duration = config.shortMin
      return {
        title: chrome.i18n.getMessage('notificationShortBreakTitle'),
        message: chrome.i18n.getMessage('notificationShortBreakMessage').replace('{duration}', duration.toString()),
        buttons: [
          { title: chrome.i18n.getMessage('buttonSkip') },
          { title: chrome.i18n.getMessage('buttonStop') }
        ]
      }
    }
    
    if (phase === 'long') {
      const duration = config.longMin
      return {
        title: chrome.i18n.getMessage('notificationLongBreakTitle'),
        message: chrome.i18n.getMessage('notificationLongBreakMessage').replace('{duration}', duration.toString()),
        buttons: [
          { title: chrome.i18n.getMessage('buttonSkip') },
          { title: chrome.i18n.getMessage('buttonStop') }
        ]
      }
    }
    
    return {
      title: chrome.i18n.getMessage('pomodoroTimer'),
      message: '',
      buttons: []
    }
  }

  /**
   * 生成通知ID
   */
  private generateNotificationId(phase: PomodoroPhase): string {
    return `pomodoro-${phase}-${Date.now()}`
  }

  /**
   * 获取通知图标
   * Chrome 要求 iconUrl 是必需属性，不能为空
   * 使用 Plasmo 生成的图标文件
   */
  private getIconUrl(phase: PomodoroPhase): string {
    try {
      // 使用 Plasmo 生成的图标文件（48x48 是推荐的尺寸）
      return chrome.runtime.getURL('icon48.plasmo.aced7582.png')
    } catch (error) {
      console.warn('[NotificationManager] Failed to get icon URL, trying fallback:', error)
      try {
        // 尝试其他尺寸的图标
        return chrome.runtime.getURL('icon32.plasmo.76b92899.png')
      } catch (error2) {
        console.warn('[NotificationManager] Failed to get fallback icon URL, using data URL:', error2)
        // 使用简单的 data URL 作为备用方案（1x1 透明 PNG）
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      }
    }
  }

  /**
   * 获取通知优先级
   */
  private getNotificationPriority(phase: PomodoroPhase): number {
    switch (phase) {
      case 'focus':
        return 1 // 专注开始 - 中等优先级
      case 'short':
      case 'long':
        return 2 // 休息开始 - 高优先级
      default:
        return 0 // 默认优先级
    }
  }

  /**
   * 处理通知点击事件
   */
  private async handleNotificationClicked(notificationId: string): Promise<void> {
    try {
      console.log('[NotificationManager] Notification clicked:', notificationId)
      
      // 清除点击的通知
      await chrome.notifications.clear(notificationId)
      
      // 打开扩展popup（如果可能）
      try {
        await chrome.action.openPopup()
      } catch (error) {
        // 某些情况下可能无法打开popup，比如用户没有授权
        console.log('[NotificationManager] Could not open popup:', error)
      }
      
      // 清理历史记录
      this.notificationHistory.delete(notificationId)
    } catch (error) {
      console.error('[NotificationManager] Error handling notification click:', error)
    }
  }

  /**
   * 处理通知按钮点击事件
   */
  private async handleNotificationButtonClicked(notificationId: string, buttonIndex: number): Promise<void> {
    try {
      console.log('[NotificationManager] Notification button clicked:', notificationId, buttonIndex)
      
      const notification = this.notificationHistory.get(notificationId)
      if (!notification) {
        console.log('[NotificationManager] Notification not found in history:', notificationId)
        return
      }

      const { phase } = notification
      
      // 根据阶段和按钮索引执行相应操作
      if (phase === 'focus') {
        switch (buttonIndex) {
          case 0: // 暂停
            await pauseTimer()
            break
          case 1: // 停止
            await stopAll()
            break
        }
      } else if (phase === 'short' || phase === 'long') {
        switch (buttonIndex) {
          case 0: // 跳过休息
            // 跳过操作通过消息处理，这里可以发送跳过消息
            console.log('[NotificationManager] Skip break requested via notification')
            break
          case 1: // 停止
            await stopAll()
            break
        }
      }

      // 清除通知
      await chrome.notifications.clear(notificationId)
      this.notificationHistory.delete(notificationId)
      
    } catch (error) {
      console.error('[NotificationManager] Error handling button click:', error)
    }
  }

  /**
   * 处理通知关闭事件
   */
  private handleNotificationClosed(notificationId: string, byUser: boolean): void {
    console.log('[NotificationManager] Notification closed:', notificationId, 'by user:', byUser)
    this.notificationHistory.delete(notificationId)
  }
}

// 导出单例实例
export const notificationManager = NotificationManager.getInstance()