/**
 * 浏览器通知封装 — [REQ_TASK_MGMT_005]
 * 封装 Web Notification API，提供权限检测和发送能力。
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied'
  }
  if (Notification.permission === 'granted') {
    return 'granted'
  }
  return await Notification.requestPermission()
}

export function isBrowserNotificationSupported(): boolean {
  return 'Notification' in window
}

export function isBrowserNotificationGranted(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

export function sendBrowserNotification(title: string, options?: NotificationOptions): void {
  if (isBrowserNotificationGranted()) {
    new Notification(title, options)
  }
}
