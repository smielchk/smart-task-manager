import { Drawer, Descriptions, Tag, Button, Space, Typography, Popconfirm, message } from 'antd'
import dayjs from 'dayjs'
import PriorityBadge from '../../components/Task/PriorityBadge'
import StatusBadge from '../../components/Task/StatusBadge'
import { updateTaskStatus, deleteTask, restoreTask } from '../../api/tasks'
import type { Task } from '../../types'

const { Text, Paragraph } = Typography

/**
 * 任务详情侧边抽屉 — [REQ_TASK_MGMT_001]
 */
interface Props {
  open: boolean
  task: Task | null
  includeDeleted?: boolean
  onClose: () => void
  onStatusChange?: () => void
}

export default function TaskDetail({ open, task, includeDeleted, onClose, onStatusChange }: Props) {
  if (!task) return null

  const handleStatusChange = async (status: string) => {
    try {
      await updateTaskStatus(task.id, status)
      message.success('状态已更新')
      onStatusChange?.()
    } catch {
      // 错误已在拦截器中处理
    }
  }

  const handleDelete = async () => {
    try {
      await deleteTask(task.id)
      message.success('任务已移到回收站')
      onStatusChange?.()
      onClose()
    } catch {
      // 错误已在拦截器中处理
    }
  }

  const handleRestore = async () => {
    try {
      await restoreTask(task.id)
      message.success('任务已恢复')
      onStatusChange?.()
    } catch {
      // 错误已在拦截器中处理
    }
  }

  const nextStatusMap: Record<string, string> = {
    pending: 'in_progress',
    in_progress: 'completed',
    completed: 'pending',
  }

  return (
    <Drawer
      title="任务详情"
      open={open}
      onClose={onClose}
      width={520}
      extra={
        <Space>
          {task.status !== 'cancelled' && (
            <Button
              type="primary"
              onClick={() => handleStatusChange(nextStatusMap[task.status] || 'pending')}
            >
              {task.status === 'completed' ? '重新打开' : '推进状态'}
            </Button>
          )}
          {includeDeleted && task.deleted_at ? (
            <Popconfirm title="确认恢复此任务？" onConfirm={handleRestore}>
              <Button>恢复</Button>
            </Popconfirm>
          ) : (
            <Popconfirm title="确认删除此任务？将移入回收站。" onConfirm={handleDelete}>
              <Button danger>删除</Button>
            </Popconfirm>
          )}
        </Space>
      }
    >
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="标题">
          <Text strong>{task.title}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <StatusBadge status={task.status} />
        </Descriptions.Item>
        <Descriptions.Item label="优先级">
          <PriorityBadge priority={task.priority} />
        </Descriptions.Item>
        {task.category_name && (
          <Descriptions.Item label="分类">{task.category_name}</Descriptions.Item>
        )}
        {task.tags.length > 0 && (
          <Descriptions.Item label="标签">
            {task.tags.map((t) => (
              <Tag key={t.id}>#{t.name}</Tag>
            ))}
          </Descriptions.Item>
        )}
        {task.due_datetime && (
          <Descriptions.Item label="截止时间">
            {dayjs(task.due_datetime).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
        )}
        {task.completed_at && (
          <Descriptions.Item label="完成时间">
            {dayjs(task.completed_at).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
        )}
        {task.estimated_minutes != null && (
          <Descriptions.Item label="预估时长">{task.estimated_minutes} 分钟</Descriptions.Item>
        )}
        {task.location && (
          <Descriptions.Item label="地点">{task.location}</Descriptions.Item>
        )}
        {task.description && (
          <Descriptions.Item label="描述">
            <Paragraph>{task.description}</Paragraph>
          </Descriptions.Item>
        )}
        {task.priority_score != null && (
          <Descriptions.Item label="AI 评分">
            {task.priority_score.toFixed(1)} — {task.priority_reason}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="AI 生成">
          <Tag color={task.ai_generated ? 'blue' : 'default'}>
            {task.ai_generated ? '是' : '否'}
          </Tag>
        </Descriptions.Item>
        {task.created_at && (
          <Descriptions.Item label="创建时间">
            {dayjs(task.created_at).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
        )}
        {task.deleted_at && (
          <Descriptions.Item label="删除时间">
            {dayjs(task.deleted_at).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
        )}
      </Descriptions>
    </Drawer>
  )
}
