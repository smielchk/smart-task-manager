import { useEffect } from 'react'
import { useNotification } from './NotificationProvider'
import { isBrowserNotificationGranted, sendBrowserNotification } from './BrowserNotification'
import { getPendingReminders } from '../../api/tasks'

/**
 * 页面内通知展示组件 — [REQ_TASK_MGMT_005]
 * 定时轮询待推送提醒，根据浏览器通知授权状态选择推送方式。
 */
export default function InPageNotification() {
  const { addNotification } = useNotification()

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>

    const fetchReminders = async () => {
      try {
        const reminders = await getPendingReminders()
        if (!reminders || !Array.isArray(reminders)) return

        for (const reminder of reminders) {
          if (isBrowserNotificationGranted()) {
            // 浏览器通知已授权，使用浏览器通知
            sendBrowserNotification(reminder.title || '任务提醒', {
              body: reminder.message,
              tag: `task-${reminder.task_id}`,
            })
          } else {
            // 降级为页面内通知条
            addNotification({
              type: reminder.type === 'urgent' ? 'error' : 'info',
              title: reminder.title || '任务提醒',
              message: reminder.message,
              duration: 8000,
            })
          }
        }
      } catch {
        // 静默忽略轮询失败
      }
    }

    // 首次立即检查
    fetchReminders()
    // 每 15 分钟轮询一次（与后端 reminder_check job 对齐）
    timer = setInterval(fetchReminders, 15 * 60 * 1000)

    return () => clearInterval(timer)
  }, [addNotification])

  // 此组件仅负责后台轮询，无 UI 渲染
  return null
}
