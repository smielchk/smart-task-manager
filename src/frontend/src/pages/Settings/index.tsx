import { Tabs } from 'antd'
import ProfileSection from './ProfileSection'
import GeneralSettings from './GeneralSettings'
import ReminderSettings from './ReminderSettings'
import PreferenceLearning from './PreferenceLearning'

/**
 * 设置主页面 — [REQ_TASK_MGMT_010] [REQ_TASK_MGMT_011]
 */
export default function SettingsView() {
  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>系统设置</h2>
      <Tabs
        items={[
          { key: 'profile', label: '👤 账户', children: <ProfileSection /> },
          { key: 'general', label: '⚙️ 通用', children: <GeneralSettings /> },
          { key: 'reminder', label: '🔔 提醒', children: <ReminderSettings /> },
          { key: 'preference', label: '🧠 AI 偏好', children: <PreferenceLearning /> },
        ]}
      />
    </div>
  )
}
