import { Tag } from 'antd'

/**
 * 优先级标签 — [REQ_TASK_MGMT_008]
 * P0=红, P1=橙, P2=蓝, P3=灰
 */
export default function PriorityBadge({ priority }: { priority: string }) {
  const colorMap: Record<string, string> = {
    P0: 'red',
    P1: 'orange',
    P2: 'blue',
    P3: 'default',
  }
  const labelMap: Record<string, string> = {
    P0: '紧急',
    P1: '高',
    P2: '中',
    P3: '低',
  }

  return (
    <Tag color={colorMap[priority] || 'default'}>
      {priority} {labelMap[priority] || ''}
    </Tag>
  )
}
