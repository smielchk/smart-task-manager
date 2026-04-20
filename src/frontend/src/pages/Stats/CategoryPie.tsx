import { Card, Empty, Spin } from 'antd'
import ReactECharts from 'echarts-for-react'
import type { StatsSummary } from '../../types'

/**
 * 分类分布饼图 — [REQ_TASK_MGMT_009]
 */
export default function CategoryPie({ data }: { data: StatsSummary }) {
  if (!data.category_distribution || data.category_distribution.length === 0) {
    return <Card title="分类分布"><Empty description="暂无分类数据" /></Card>
  }

  const option = {
    title: { text: '分类分布', left: 'center' },
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: data.category_distribution.map((item) => ({
          name: item.name,
          value: item.count,
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: { formatter: '{b}\n{d}%' },
      },
    ],
  }

  return (
    <Card>
      <ReactECharts option={option} style={{ height: 300 }} />
    </Card>
  )
}
