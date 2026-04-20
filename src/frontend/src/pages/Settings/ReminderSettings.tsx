import { useState, useEffect } from 'react'
import { Card, Form, Switch, TimePicker, Button, message } from 'antd'
import dayjs from 'dayjs'
import { getSettings, updateSettings } from '../../api/settings'

/**
 * 提醒设置 — [REQ_TASK_MGMT_005] [REQ_TASK_MGMT_011]
 * 全局提醒开关、免打扰时段。
 */
export default function ReminderSettings() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    getSettings()
      .then((data) => {
        form.setFieldsValue({
          reminder_enabled: data.reminder_enabled,
          quiet_hours_start: data.quiet_hours_start ? dayjs(data.quiet_hours_start, 'HH:mm') : null,
          quiet_hours_end: data.quiet_hours_end ? dayjs(data.quiet_hours_end, 'HH:mm') : null,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await updateSettings({
        reminder_enabled: values.reminder_enabled,
        quiet_hours_start: values.quiet_hours_start?.format('HH:mm') || null,
        quiet_hours_end: values.quiet_hours_end?.format('HH:mm') || null,
      })
      message.success('提醒设置已保存')
    } catch {
      // 表单校验或 API 错误
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="🔔 提醒设置" loading={loading}>
      <Form form={form} layout="vertical">
        <Form.Item name="reminder_enabled" label="全局提醒" valuePropName="checked">
          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>
        <Form.Item label="免打扰时段">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Form.Item name="quiet_hours_start" noStyle>
              <TimePicker format="HH:mm" placeholder="开始时间" />
            </Form.Item>
            <span>至</span>
            <Form.Item name="quiet_hours_end" noStyle>
              <TimePicker format="HH:mm" placeholder="结束时间" />
            </Form.Item>
          </div>
        </Form.Item>
      </Form>
      <Button type="primary" loading={saving} onClick={handleSave}>
        保存设置
      </Button>
    </Card>
  )
}
