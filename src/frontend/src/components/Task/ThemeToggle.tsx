import React from 'react'
import { Button, Tooltip } from 'antd'
import { SunOutlined, MoonOutlined } from '@ant-design/icons'
import { useSettingsStore } from '../../store'

/**
 * 主题切换组件 — [REQ_TASK_MGMT_011]
 * 亮色/暗色主题切换。
 */
export default function ThemeToggle() {
  const { theme, setTheme } = useSettingsStore()

  return (
    <Tooltip title={theme === 'dark' ? '切换亮色主题' : '切换暗色主题'}>
      <Button
        type="text"
        icon={theme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />
    </Tooltip>
  )
}
