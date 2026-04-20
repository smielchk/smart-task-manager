import { useState, useEffect } from 'react'
import { Card, Button, Empty, Spin, Typography, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { getDailyPlan, regeneratePlan } from '../../api/planning'
import WorkloadIndicator from './WorkloadIndicator'
import PlanTimeline from './PlanTimeline'
import type { DailyPlan } from '../../types'

const { Title, Text } = Typography

/**
 * 今日规划 Tab — [REQ_TASK_MGMT_006]
 */
export default function DailyPlanView() {
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const fetchPlan = async () => {
    setLoading(true)
    try {
      const data = await getDailyPlan()
      setPlan(data)
    } catch {
      // 错误已在拦截器中处理
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const data = await regeneratePlan('daily')
      setPlan(data)
      message.success('规划已重新生成')
    } catch {
      // 错误已在拦截器中处理
    } finally {
      setRegenerating(false)
    }
  }

  useEffect(() => {
    fetchPlan()
  }, [])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" tip="加载规划中..." /></div>
  }

  if (!plan) {
    return <Empty description="暂无今日规划" />
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>📅 今日规划 — {plan.date}</Title>
          <Text type="secondary">生成时间：{new Date(plan.generated_at).toLocaleString()}</Text>
        </div>
        <Button icon={<ReloadOutlined />} loading={regenerating} onClick={handleRegenerate}>
          重新生成
        </Button>
      </div>

      <WorkloadIndicator
        totalMinutes={plan.total_estimated_minutes}
        availableMinutes={plan.available_minutes}
        overloaded={plan.is_overloaded}
      />

      {plan.recommended_tasks.length === 0 ? (
        <Empty description="今日没有待办任务" />
      ) : (
        <PlanTimeline tasks={plan.recommended_tasks} />
      )}
    </Card>
  )
}
