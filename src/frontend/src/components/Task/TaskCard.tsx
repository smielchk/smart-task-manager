import { Card, Typography } from 'antd'
import dayjs from 'dayjs'
import PriorityBadge from './PriorityBadge'
import StatusBadge from './StatusBadge'

const { Text } = Typography

/**
 * 任务卡片 — 列表/看板复用
 * [REQ_TASK_MGMT_001] [REQ_TASK_MGMT_007]
 */
export default function TaskCard({
  task,
  onClick,
  draggable,
  style,
}: {
  task: import('../../types').Task
  onClick?: () => void
  draggable?: boolean
  style?: React.CSSProperties
}) {
  return (
    <Card
      size="small"
      hoverable={!!onClick}
      onClick={onClick}
      draggable={draggable}
      style={{ marginBottom: 8, ...style }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PriorityBadge priority={task.priority} />
          <Text strong ellipsis style={{ flex: 1 }}>
            {task.title}
          </Text>
        </div>
      }
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusBadge status={task.status} />
          {task.category_name && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {task.category_name}
            </Text>
          )}
          {task.due_datetime && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              📅 {dayjs(task.due_datetime).format('MM-DD HH:mm')}
            </Text>
          )}
        </div>
        {task.priority_score != null && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            AI: {task.priority_score.toFixed(0)}
          </Text>
        )}
      </div>
      {task.tags.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {task.tags.map((tag) => (
            <Text key={tag.id} style={{ fontSize: 11, color: '#888', background: '#f5f5f5', padding: '0 6px', borderRadius: 4 }}>
              #{tag.name}
            </Text>
          ))}
        </div>
      )}
    </Card>
  )
}
