import { useState } from 'react'
import { Modal, Form, Input, Select, DatePicker, InputNumber, Button, Space, Tag, Typography, Alert } from 'antd'
import dayjs from 'dayjs'
import { createTask } from '../../api/tasks'
import type { ParsedTask } from '../../types'

const { Text } = Typography

/**
 * AI 解析结果预览卡片 — [REQ_TASK_MGMT_002]
 * 展示 AI 解析结果，允许用户确认或修改后提交创建。
 */
interface Props {
  visible: boolean
  parsedTask: ParsedTask | null
  onClose: () => void
  onSuccess: () => void
}

export default function ParsePreview({ visible, parsedTask, onClose, onSuccess }: Props) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!parsedTask) return

    try {
      const values = await form.validateFields()
      setLoading(true)

      await createTask({
        title: values.title,
        description: null,
        due_datetime: values.due_datetime?.toISOString(),
        priority: values.priority,
        category: values.category,
        estimated_minutes: values.estimated_minutes,
        location: values.location,
        ai_generated: true,
      })

      Modal.success({ title: '任务创建成功', content: values.title })
      onSuccess()
      onClose()
    } catch {
      // 表单校验或 API 错误
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="🤖 AI 解析结果预览"
      open={visible}
      onCancel={onClose}
      width={520}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="manual" onClick={() => { onClose() }}>
          手动创建
        </Button>,
        <Button key="confirm" type="primary" loading={loading} onClick={handleConfirm}>
          确认创建
        </Button>,
      ]}
    >
      {parsedTask && (
        <>
          <Alert
            type="info"
            message="请核对以下 AI 解析结果，可修改后创建"
            style={{ marginBottom: 16 }}
          />
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              title: parsedTask.title,
              priority: parsedTask.priority,
              category: parsedTask.category,
              location: parsedTask.location,
              due_datetime: parsedTask.due_datetime ? dayjs(parsedTask.due_datetime) : null,
              estimated_minutes: parsedTask.estimated_minutes,
            }}
          >
            <Form.Item name="title" label="标题" rules={[{ required: true, message: '标题不能为空' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="priority" label="优先级">
              <Select>
                <Select.Option value="P0">P0 — 紧急</Select.Option>
                <Select.Option value="P1">P1 — 高</Select.Option>
                <Select.Option value="P2">P2 — 中</Select.Option>
                <Select.Option value="P3">P3 — 低</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="category" label="分类">
              <Input placeholder="AI 推荐的分类" />
            </Form.Item>
            <Form.Item name="due_datetime" label="截止时间">
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="estimated_minutes" label="预估时长（分钟）">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="location" label="地点">
              <Input />
            </Form.Item>
          </Form>
          <div style={{ marginTop: 8 }}>
            <Tag color="blue">AI 生成</Tag>
            <Text type="secondary">此任务由 AI 从自然语言解析创建</Text>
          </div>
        </>
      )}
    </Modal>
  )
}
