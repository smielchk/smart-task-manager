import { useEffect, useState } from 'react'
import { Card, Empty, Spin, Select } from 'antd'
import ReactECharts from 'echarts-for-react'
import { getStatsTrends } from '../../api/stats'

/**
 * 完成趋势折线图 — [REQ_TASK_MGMT_009]
 */
export default function CompletionTrend() {
  const [data, setData] = useState<{ date: string; count: number }[]>([])
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getStatsTrends(days)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [days])

  const option = {
    title: { text: '任务完成趋势', left: 'center' },
    tooltip: { trigger: 'axis' as const },
    xAxis: {
      type: 'category' as const,
      data: data.map((d) => d.date.slice(5)), // MM-DD
    },
    yAxis: { type: 'value' as const, name: '完成任务数' },
    series: [
      {
        name: '完成任务数',
        type: 'line',
        data: data.map((d) => d.count),
        smooth: true,
        areaStyle: { opacity: 0.3 },
        itemStyle: { color: '#1890ff' },
      },
    ],
    grid: { left: 60, right: 20, top: 50, bottom: 30 },
  }

  return (
    <Card
      title="完成趋势"
      extra={
        <Select
          value={days}
          style={{ width: 100 }}
          onChange={setDays}
          options={[
            { value: 7, label: '近 7 天' },
            { value: 30, label: '近 30 天' },
          ]}
        />
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : data.length === 0 ? (
        <Empty description="暂无趋势数据" />
      ) : (
        <ReactECharts option={option} style={{ height: 300 }} />
      )}
    </Card>
  )
}
