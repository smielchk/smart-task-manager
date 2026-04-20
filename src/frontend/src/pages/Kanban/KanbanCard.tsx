import { Card, Typography } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import PriorityBadge from '../../components/Task/PriorityBadge'

const { Text } = Typography

/**
 * 看板任务卡片 — [REQ_TASK_MGMT_007]
 * 紧凑展示，支持拖拽。
 */
export default function KanbanCard({
  task,
  onDragStart,
  onClick,
}: {
  task: import('../../types').Task
  onDragStart?: (e: React.DragEvent, taskId: number) => void
  onClick?: (task: import('../../types').Task) => void
}) {
  return (
    <Card
      size="small"
      draggable
      onDragStart={(e) => onDragStart?.(e, task.id)}
      onClick={() => onClick?.(task)}
      hoverable={!!onClick}
      style={{ cursor: 'grab', marginBottom: 8 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <Text strong ellipsis style={{ flex: 1 }}>
          {task.title}
        </Text>
        <PriorityBadge priority={task.priority} />
      </div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
        {task.category_name && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {task.category_name}
          </Text>
        )}
        {task.due_datetime && (
          <Text
            type={dayjs(task.due_datetime).isBefore(dayjs(), 'day') ? 'danger' : 'secondary'}
            style={{ fontSize: 12 }}
          >
            {dayjs(task.due_datetime).format('MM-DD')}
          </Text>
        )}
      </div>
      {task.completed_at && (
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
          ✅ {dayjs(task.completed_at).format('MM-DD HH:mm')}
        </Text>
      )}
    </Card>
  )
}
