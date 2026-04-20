import { useState, useEffect } from 'react'
import { Card, Button, Empty, Spin, Typography, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getWeeklyPlan, regeneratePlan } from '../../api/planning'
import PlanTimeline from './PlanTimeline'

const { Title, Text } = Typography

/**
 * 本周规划 Tab（甘特图/时间轴） — [REQ_TASK_MGMT_006]
 */
export default function WeeklyPlanView() {
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const fetchPlan = async () => {
    setLoading(true)
    try {
      const weekStart = dayjs().startOf('week').format('YYYY-MM-DD')
      const data = await getWeeklyPlan(weekStart)
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
      const data = await regeneratePlan('weekly')
      setPlan(data)
      message.success('周规划已重新生成')
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
    return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" tip="加载周规划中..." /></div>
  }

  if (!plan) {
    return <Empty description="暂无本周规划" />
  }

  // 按天分组展示
  const days = plan.daily_plans || plan.days || []

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>📆 本周规划</Title>
        <Button icon={<ReloadOutlined />} loading={regenerating} onClick={handleRegenerate}>
          重新生成
        </Button>
      </div>

      {Array.isArray(days) && days.length > 0 ? (
        days.map((day: any, idx: number) => (
          <div key={idx} style={{ marginBottom: 24 }}>
            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
              {day.date} — 预估 {day.total_estimated_minutes || 0} 分钟
            </Text>
            {day.tasks && day.tasks.length > 0 ? (
              <PlanTimeline tasks={day.tasks} />
            ) : (
              <Empty description="当天无规划任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        ))
      ) : (
        <PlanTimeline tasks={plan.recommended_tasks || plan.tasks || []} />
      )}
    </Card>
  )
}
