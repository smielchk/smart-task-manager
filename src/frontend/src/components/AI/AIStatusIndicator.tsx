import { useEffect, useState } from 'react'
import { Tag, Tooltip } from 'antd'
import { RobotOutlined, DisconnectOutlined } from '@ant-design/icons'
import { getAIHealth, type AIHealthStatus } from '../../api/health'

/**
 * AI 可用性状态指示 — [REQ_TASK_MGMT_012]
 * 显示当前 AI 模型的连接状态。
 */
export default function AIStatusIndicator() {
  const [status, setStatus] = useState<AIHealthStatus | null>(null)

  useEffect(() => {
    getAIHealth().then(setStatus).catch(() => {
      setStatus({ available: false, model: null, base_url: null, latency_ms: null, checked_at: new Date().toISOString() })
    })
  }, [])

  if (!status) return null

  if (status.available) {
    return (
      <Tooltip title={`AI 可用 | 模型: ${status.model} | 延迟: ${status.latency_ms}ms`}>
        <Tag icon={<RobotOutlined />} color="success">
          AI 在线
        </Tag>
      </Tooltip>
    )
  }

  return (
    <Tooltip title={`AI 不可用: ${status.reason || '未配置'}`}>
      <Tag icon={<DisconnectOutlined />} color="default">
        AI 离线
      </Tag>
    </Tooltip>
  )
}
