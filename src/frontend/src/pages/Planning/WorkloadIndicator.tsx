import { Progress, Tooltip, Typography } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'

const { Text } = Typography

/**
 * 工作量评估条 — [REQ_TASK_MGMT_006]
 */
export default function WorkloadIndicator({
  totalMinutes,
  availableMinutes,
  overloaded,
}: {
  totalMinutes: number
  availableMinutes: number
  overloaded: boolean
}) {
  const percentage = availableMinutes > 0 ? Math.round((totalMinutes / availableMinutes) * 100) : 0

  const statusColor = overloaded ? '#f5222d' : percentage > 60 ? '#fa8c16' : '#52c41a'

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text>
          工作量评估：
          <Text strong style={{ color: statusColor }}>
            {overloaded ? '⚠️ 过载' : '正常'}
          </Text>
        </Text>
        <Tooltip title={`预估 ${totalMinutes} 分钟 / 可用 ${availableMinutes} 分钟`}>
          <InfoCircleOutlined style={{ color: '#888' }} />
        </Tooltip>
      </div>
      <Progress
        percent={Math.min(percentage, 100)}
        strokeColor={statusColor}
        format={() => `${percentage}%`}
      />
    </div>
  )
}
