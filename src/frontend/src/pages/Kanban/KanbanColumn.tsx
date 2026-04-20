import KanbanCard from './KanbanCard'
import { Typography } from 'antd'
import type { Task } from '../../types'

const { Text } = Typography

/**
 * 看板单列容器 — [REQ_TASK_MGMT_007]
 * 支持拖拽接收。
 */
export default function KanbanColumn({
  title,
  tasks,
  color,
  onDrop,
  onDragStart,
  onCardClick,
}: {
  title: string
  tasks: Task[]
  color: string
  onDrop?: (e: React.DragEvent, status: string) => void
  onDragStart?: (e: React.DragEvent, taskId: number) => void
  onCardClick?: (task: Task) => void
}) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const taskId = parseInt(e.dataTransfer.getData('taskId'), 10)
    if (taskId) {
      onDrop?.(e, title)
    }
  }

  return (
    <div
      style={{
        flex: 1,
        background: '#fafafa',
        borderRadius: 8,
        padding: 12,
        minHeight: 400,
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: `2px solid ${color}`,
        }}
      >
        <Text strong>{title}</Text>
        <Text type="secondary">{tasks.length}</Text>
      </div>
      {tasks.map((task) => (
        <KanbanCard
          key={task.id}
          task={task}
          onDragStart={(e, id) => {
            e.dataTransfer.setData('taskId', String(id))
            onDragStart?.(e, id)
          }}
          onClick={onCardClick}
        />
      ))}
    </div>
  )
}
