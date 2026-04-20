import { List, Tag, Typography } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import PriorityBadge from '../../components/Task/PriorityBadge'
import type { Task } from '../../types'

const { Text } = Typography

/**
 * 时间轴组件 — [REQ_TASK_MGMT_006]
 * 展示每日规划的时间轴排列。
 */
export default function PlanTimeline({
  tasks,
}: {
  tasks: {
    task_id: number
    title?: string
    priority?: string
    due_datetime?: string | null
    estimated_minutes?: number | null
    suggested_slot: string
    reason: string
  }[]
}) {
  return (
    <div style={{ position: 'relative' }}>
      {tasks.map((task, idx) => (
        <div key={task.task_id} style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          {/* 时间轴节点 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
            <div
              style={{
                padding: '4px 12px',
                background: '#1890ff',
                color: '#fff',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {task.suggested_slot}
            </div>
            {idx < tasks.length - 1 && (
              <div style={{ width: 2, flex: 1, background: '#e8e8e8', marginTop: 4 }} />
            )}
          </div>

          {/* 任务内容 */}
          <div
            style={{
              flex: 1,
              padding: '8px 12px',
              background: '#fafafa',
              borderRadius: 6,
              borderLeft: '3px solid #1890ff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {task.priority && <PriorityBadge priority={task.priority} />}
              <Text strong>{task.title || `任务 #${task.task_id}`}</Text>
              {task.estimated_minutes && (
                <Tag icon={<ClockCircleOutlined />}>{task.estimated_minutes} 分钟</Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              💡 {task.reason}
            </Text>
          </div>
        </div>
      ))}
    </div>
  )
}
