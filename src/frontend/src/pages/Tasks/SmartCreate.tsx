import { useState } from 'react'
import { Input, Button, Space, message } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import { parseNLP } from '../../api/tasks'
import { getAIHealth } from '../../api/health'
import type { ParsedTask } from '../../types'

/**
 * 自然语言智能创建入口 — [REQ_TASK_MGMT_002]
 */
interface Props {
  onParsed: (parsed: ParsedTask) => void
  onManualCreate: () => void
}

export default function SmartCreate({ onParsed, onManualCreate }: Props) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null)

  const checkAI = async () => {
    try {
      const health = await getAIHealth()
      setAiAvailable(health.available)
      return health.available
    } catch {
      setAiAvailable(false)
      return false
    }
  }

  const handleParse = async () => {
    if (!input.trim()) return

    // 首次检查 AI 可用性
    if (aiAvailable === null) {
      const available = await checkAI()
      if (!available) {
        message.warning('AI 暂时不可用，请手动创建任务')
        return
      }
    } else if (!aiAvailable) {
      message.warning('AI 暂时不可用，请手动创建任务')
      return
    }

    setLoading(true)
    try {
      const result = await parseNLP(input)
      if (result.ai_available && result.parsed_task) {
        onParsed(result.parsed_task)
      } else {
        message.warning('AI 解析暂时不可用，请手动创建任务')
      }
    } catch {
      message.error('AI 解析失败，请稍后重试或手动创建')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <Space.Compact style={{ flex: 1 }}>
        <Input
          size="large"
          placeholder="💡 用自然语言创建任务，例如：下周三下午3点开会讨论Q2方案"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={handleParse}
          allowClear
        />
        <Button
          size="large"
          type="primary"
          icon={<RobotOutlined />}
          loading={loading}
          onClick={handleParse}
        >
          智能解析
        </Button>
      </Space.Compact>
      <Button size="large" onClick={onManualCreate}>
        手动创建
      </Button>
    </div>
  )
}
