import { useState, useEffect } from 'react'
import { Card, Form, Select, InputNumber, Button, message, TimePicker, Typography } from 'antd'
import { getSettings, updateSettings } from '../../api/settings'
import type { UserSettings } from '../../types'

const { Text } = Typography

/**
 * 通用设置 — [REQ_TASK_MGMT_011]
 * 时区、工作日、每日工作时长、默认视图。
 */
export default function GeneralSettings() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    getSettings()
      .then((data) => form.setFieldsValue(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await updateSettings(values)
      message.success('设置已保存')
    } catch {
      // 表单校验或 API 错误
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="⚙️ 通用设置" loading={loading}>
      <Form form={form} layout="vertical">
        <Form.Item name="timezone" label="时区">
          <Select>
            <Select.Option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</Select.Option>
            <Select.Option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</Select.Option>
            <Select.Option value="America/New_York">America/New_York (UTC-5)</Select.Option>
            <Select.Option value="Europe/London">Europe/London (UTC+0)</Select.Option>
            <Select.Option value="UTC">UTC</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="daily_work_hours" label="每日工作时长（小时）">
          <InputNumber min={1} max={24} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="work_days" label="工作日">
          <Select mode="multiple">
            <Select.Option value="1">周一</Select.Option>
            <Select.Option value="2">周二</Select.Option>
            <Select.Option value="3">周三</Select.Option>
            <Select.Option value="4">周四</Select.Option>
            <Select.Option value="5">周五</Select.Option>
            <Select.Option value="6">周六</Select.Option>
            <Select.Option value="0">周日</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="default_view" label="默认视图">
          <Select>
            <Select.Option value="tasks">任务列表</Select.Option>
            <Select.Option value="kanban">看板视图</Select.Option>
            <Select.Option value="calendar">日历视图</Select.Option>
          </Select>
        </Form.Item>
      </Form>
      <Button type="primary" loading={saving} onClick={handleSave}>
        保存设置
      </Button>
    </Card>
  )
}
