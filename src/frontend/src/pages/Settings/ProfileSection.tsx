import { Card, Descriptions, Typography } from 'antd'
import { useAuthStore } from '../../store'

const { Text } = Typography

/**
 * 账户信息区域 — [REQ_TASK_MGMT_011]
 */
export default function ProfileSection() {
  const { username } = useAuthStore()

  return (
    <Card title="👤 账户信息">
      <Descriptions column={1}>
        <Descriptions.Item label="用户名">
          <Text strong>{username}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="角色">
          <Text type="secondary">管理员（单用户模式）</Text>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  )
}
