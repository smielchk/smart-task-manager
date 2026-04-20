import { Tag } from 'antd'

/**
 * 状态标签
 */
export default function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending: 'default',
    in_progress: 'processing',
    completed: 'success',
    cancelled: 'warning',
  }
  const labelMap: Record<string, string> = {
    pending: '待办',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }

  return (
    <Tag color={colorMap[status] || 'default'}>
      {labelMap[status] || status}
    </Tag>
  )
}
