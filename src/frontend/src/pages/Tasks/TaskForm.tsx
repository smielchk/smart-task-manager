import { useState, useEffect } from 'react'
import {
  Drawer,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Space,
  message,
} from 'antd'
import { createTask, updateTask } from '../../api/tasks'
import { getCategories, getTags } from '../../api/categories'
import type { Task, TaskCreate, TaskUpdate, Category, Tag } from '../../types'

/**
 * 任务创建/编辑表单（抽屉） — [REQ_TASK_MGMT_001]
 * 支持手动创建和编辑模式。
 */
interface Props {
  open: boolean
  task?: Task | null
  onClose: () => void
  onSuccess: () => void
}

export default function TaskForm({ open, task, onClose, onSuccess }: Props) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  const isEdit = !!task

  useEffect(() => {
    if (open) {
      // 加载分类和标签
      getCategories(true).then(setCategories).catch(() => {})
      getTags(true).then(setTags).catch(() => {})

      if (task) {
        form.setFieldsValue({
          title: task.title,
          description: task.description,
          priority: task.priority,
          category_id: task.category_id,
          tag_ids: task.tags?.map((t) => t.id) || [],
          estimated_minutes: task.estimated_minutes,
          location: task.location,
          due_datetime: task.due_datetime ? new Date(task.due_datetime) : null,
        })
      } else {
        form.resetFields()
        form.setFieldsValue({ priority: 'P2' })
      }
    }
  }, [open, task, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const payload = {
        ...values,
        due_datetime: values.due_datetime?.toISOString(),
        tag_ids: values.tag_ids || [],
      }

      if (isEdit) {
        await updateTask(task!.id, payload as TaskUpdate)
        message.success('任务更新成功')
      } else {
        await createTask(payload as TaskCreate)
        message.success('任务创建成功')
      }

      onSuccess()
      onClose()
    } catch (err) {
      if (err instanceof Error) {
        // 表单校验失败等
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Drawer
      title={isEdit ? '编辑任务' : '新建任务'}
      open={open}
      onClose={onClose}
      width={480}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={loading} onClick={handleSubmit}>
            {isEdit ? '保存' : '创建'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入任务标题' }]}>
          <Input placeholder="任务标题" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={3} placeholder="任务描述（可选）" />
        </Form.Item>
        <Form.Item name="priority" label="优先级">
          <Select>
            <Select.Option value="P0">P0 — 紧急</Select.Option>
            <Select.Option value="P1">P1 — 高</Select.Option>
            <Select.Option value="P2">P2 — 中</Select.Option>
            <Select.Option value="P3">P3 — 低</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="category_id" label="分类">
          <Select allowClear placeholder="选择分类">
            {categories.map((c) => (
              <Select.Option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="tag_ids" label="标签">
          <Select mode="multiple" allowClear placeholder="选择标签">
            {tags.map((t) => (
              <Select.Option key={t.id} value={t.id}>
                #{t.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="due_datetime" label="截止时间">
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="estimated_minutes" label="预估时长（分钟）">
          <InputNumber min={0} max={480} style={{ width: '100%' }} placeholder="可选" />
        </Form.Item>
        <Form.Item name="location" label="地点">
          <Input placeholder="任务地点（可选）" />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
