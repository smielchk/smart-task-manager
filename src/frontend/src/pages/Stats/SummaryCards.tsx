import { Row, Col, Card, Statistic } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  RiseOutlined,
  FireOutlined,
} from '@ant-design/icons'
import type { StatsSummary } from '../../types'

/**
 * 数字统计卡片 — [REQ_TASK_MGMT_009]
 * 展示本周完成数、完成率、逾期率、平均完成时长等 7 项指标。
 */
export default function SummaryCards({ data }: { data: StatsSummary }) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} sm={8} md={6}>
        <Card>
          <Statistic
            title="总任务数"
            value={data.total}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6}>
        <Card>
          <Statistic
            title="本周完成"
            value={data.week_completed}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6}>
        <Card>
          <Statistic
            title="完成率"
            value={data.completion_rate}
            suffix="%"
            precision={1}
            prefix={<RiseOutlined />}
            valueStyle={{ color: data.completion_rate >= 70 ? '#52c41a' : '#fa8c16' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6}>
        <Card>
          <Statistic
            title="逾期数"
            value={data.overdue}
            prefix={<ExclamationCircleOutlined />}
            valueStyle={{ color: data.overdue > 0 ? '#f5222d' : '#52c41a' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6}>
        <Card>
          <Statistic
            title="逾期率"
            value={data.overdue_rate}
            suffix="%"
            precision={1}
            valueStyle={{ color: data.overdue_rate > 10 ? '#f5222d' : '#52c41a' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6}>
        <Card>
          <Statistic
            title="月度完成"
            value={data.month_completed}
            prefix={<FireOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6}>
        <Card>
          <Statistic
            title="平均完成时长"
            value={data.avg_completion_hours}
            suffix="小时"
            precision={1}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6}>
        <Card>
          <Statistic
            title="已完成"
            value={data.completed}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
    </Row>
  )
}
