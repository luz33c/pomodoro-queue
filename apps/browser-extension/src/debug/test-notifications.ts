/**
 * 简单的通知测试脚本
 * 用于在扩展开发环境中测试通知功能
 */

// 测试通知功能
async function testNotifications() {
  console.log('开始测试通知功能...')
  
  try {
    // 检查通知权限
    const permission = await chrome.notifications.getPermissionLevel()
    console.log('通知权限状态:', permission)
    
    // 发送测试通知
    await chrome.notifications.create('test-notification', {
      type: 'basic',
      iconUrl: 'icon48.plasmo.aced7582.png',
      title: '测试通知',
      message: '这是一个测试通知，用于验证图标是否正确显示',
      priority: 2
    })
    
    console.log('测试通知已发送')
    
    // 3秒后清除通知
    setTimeout(() => {
      chrome.notifications.clear('test-notification')
      console.log('测试通知已清除')
    }, 3000)
    
  } catch (error) {
    console.error('通知测试失败:', error)
  }
}

// 等待扩展加载完成后执行测试
setTimeout(testNotifications, 2000)

console.log('通知测试脚本已加载')