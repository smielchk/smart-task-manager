import { useState, useEffect } from 'react'
import { Row, Col, Select, Spin, Empty } from 'antd'
import { getStatsSummary } from '../../api/stats'
import SummaryCards from './SummaryCards'
import CompletionTrend from './CompletionTrend'
import CategoryPie from './CategoryPie'
import CompletionRing from './CompletionRing'
import type { StatsSummary } from '../../types'

/**
 * 数据统计主页面 — [REQ_TASK_MGMT_009]
 * 7 项统计指标 + 折线图 + 饼图 + 环形图。
 */
export default function StatsView() {
  const [data, setData] = useState<StatsSummary | null>(null)
  const [range, setRange] = useState('week')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getStatsSummary(range)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" tip="加载统计数据..." /></div>
  }

  if (!data) {
    return <Empty description="暂无统计数据" />
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>数据统计</h2>
        <Select
          value={range}
          style={{ width: 120 }}
          onChange={setRange}
          options={[
            { value: 'week', label: '本周' },
            { value: 'month', label: '本月' },
            { value: 'quarter', label: '本季度' },
          ]}
        />
      </div>

      {/* 数字卡片 */}
      <SummaryCards data={data} />

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <CompletionTrend />
        </Col>
        <Col xs={24} lg={8}>
          <CompletionRing data={data} />
        </Col>
        <Col xs={24} lg={12}>
          <CategoryPie data={data} />
        </Col>
      </Row>
    </div>
  )
}
