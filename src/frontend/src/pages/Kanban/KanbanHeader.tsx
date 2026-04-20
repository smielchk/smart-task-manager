import { Statistic, Row, Col } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, SyncOutlined, StopOutlined } from '@ant-design/icons'

/**
 * 看板统计摘要 — [REQ_TASK_MGMT_007]
 */
export default function KanbanHeader({ counts }: { counts: { pending: number; in_progress: number; completed: number; cancelled: number } }) {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={6}>
        <Statistic
          title="待办"
          value={counts.pending}
          prefix={<ClockCircleOutlined style={{ color: '#8c8c8c' }} />}
        />
      </Col>
      <Col span={6}>
        <Statistic
          title="进行中"
          value={counts.in_progress}
          prefix={<SyncOutlined style={{ color: '#1890ff' }} />}
        />
      </Col>
      <Col span={6}>
        <Statistic
          title="已完成"
          value={counts.completed}
          prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
        />
      </Col>
      <Col span={6}>
        <Statistic
          title="已取消"
          value={counts.cancelled}
          prefix={<StopOutlined style={{ color: '#faad14' }} />}
        />
      </Col>
    </Row>
  )
}
