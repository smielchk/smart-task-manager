import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Alert } from 'antd'

/** 通知数据结构 — [REQ_TASK_MGMT_005] */

interface NotificationItem {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  duration?: number
}

interface NotificationContextValue {
  notifications: NotificationItem[]
  addNotification: (n: Omit<NotificationItem, 'id'>) => void
  removeNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  addNotification: () => {},
  removeNotification: () => {},
})

export function useNotification() {
  return useContext(NotificationContext)
}

/**
 * 页面内通知上下文 — [REQ_TASK_MGMT_005]
 * 当浏览器通知未授权时，降级为页面内通知条。
 */
export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const addNotification = useCallback((n: Omit<NotificationItem, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setNotifications((prev) => [...prev, { ...n, id }])
    // 自动移除
    const duration = n.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((item) => item.id !== id))
      }, duration)
    }
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id))
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, maxWidth: 400 }}>
        {notifications.map((n) => (
          <Alert
            key={n.id}
            type={n.type}
            message={n.title}
            description={n.message}
            showIcon
            closable
            onClose={() => removeNotification(n.id)}
            style={{ marginBottom: 8 }}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}
