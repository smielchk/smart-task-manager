import { Card } from 'antd'
import ReactECharts from 'echarts-for-react'
import type { StatsSummary } from '../../types'

/**
 * 完成率环形图 — [REQ_TASK_MGMT_009]
 */
export default function CompletionRing({ data }: { data: StatsSummary }) {
  const completed = data.completed
  const remaining = data.total - completed

  const option = {
    title: {
      text: `${data.completion_rate.toFixed(1)}%`,
      left: 'center',
      top: 'center',
      textStyle: { fontSize: 28, fontWeight: 'bold', color: '#52c41a' },
    },
    tooltip: {
      trigger: 'item' as const,
      formatter: '{b}: {c} ({d}%)',
    },
    series: [
      {
        type: 'pie',
        radius: ['65%', '80%'],
        avoidLabelOverlap: false,
        label: { show: false },
        data: [
          {
            value: completed,
            name: '已完成',
            itemStyle: { color: '#52c41a' },
          },
          {
            value: remaining > 0 ? remaining : 0,
            name: '未完成',
            itemStyle: { color: '#f0f0f0' },
          },
        ],
      },
    ],
  }

  return (
    <Card title="完成率">
      <ReactECharts option={option} style={{ height: 250 }} />
      <div style={{ textAlign: 'center', marginTop: -20 }}>
        <span style={{ color: '#52c41a' }}>● 已完成 {completed}</span>
        {' / '}
        <span style={{ color: '#999' }}>● 未完成 {remaining}</span>
      </div>
    </Card>
  )
}
