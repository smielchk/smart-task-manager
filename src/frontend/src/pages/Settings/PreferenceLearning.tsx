import { useState, useEffect } from 'react'
import { Card, Descriptions, Tag, Button, Popconfirm, message, Empty, Progress, Typography } from 'antd'
import { getPreferences, resetPreferences } from '../../api/preferences'
import type { UserPreference } from '../../api/preferences'

const { Text, Title } = Typography

/**
 * AI 偏好学习展示与手动修正 — [REQ_TASK_MGMT_010]
 */
export default function PreferenceLearning() {
  const [pref, setPref] = useState<UserPreference | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchPref = async () => {
    setLoading(true)
    try {
      const data = await getPreferences()
      setPref(data)
    } catch {
      // 错误已在拦截器中处理
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPref()
  }, [])

  const handleReset = async () => {
    try {
      await resetPreferences()
      message.success('学习数据已重置')
      fetchPref()
    } catch {
      // 错误已在拦截器中处理
    }
  }

  if (loading) return <Card title="🧠 AI 偏好学习" loading />

  if (!pref) return <Card title="🧠 AI 偏好学习"><Empty description="暂无学习数据" /></Card>

  // 学习进度（7 天冷启动）
  const learningProgress = Math.min(100, Math.round((pref.days_of_data / 7) * 100))
  const isColdStart = pref.days_of_data < 7

  return (
    <Card title="🧠 AI 偏好学习">
      {isColdStart && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            📊 学习进行中（已收集 {pref.days_of_data}/7 天数据），{pref.days_of_data < 7 ? '满 7 天后将启用个性化推荐' : '个性化推荐已启用'}
          </Text>
          <Progress percent={learningProgress} size="small" style={{ marginTop: 4 }} />
        </div>
      )}

      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="高效时段">
          {pref.productive_hours && pref.productive_hours.length > 0 ? (
            pref.productive_hours.map((h) => <Tag key={h}>{h}</Tag>)
          ) : (
            <Text type="secondary">尚未学习</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="分类偏好">
          {pref.category_preference ? (
            Object.entries(pref.category_preference).map(([k, v]) => (
              <Tag key={k}>{k}: {(v as number * 100).toFixed(0)}%</Tag>
            ))
          ) : (
            <Text type="secondary">尚未学习</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="常用标签">
          {pref.tag_preference ? (
            Object.entries(pref.tag_preference)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 10)
              .map(([k, v]) => (
                <Tag key={k}>#{k} ({v})</Tag>
              ))
          ) : (
            <Text type="secondary">尚未学习</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="完成速度">
          {pref.completion_speed ? (
            Object.entries(pref.completion_speed).map(([k, v]) => (
              <Tag key={k}>{k}: {Math.round(v as number / 60)}小时</Tag>
            ))
          ) : (
            <Text type="secondary">尚未学习</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="拖延模式">
          {pref.procrastination_pattern ? (
            <span>
              提前: {((pref.procrastination_pattern.ahead as number) * 100).toFixed(0)}% |
              按时: {((pref.procrastination_pattern.ontime as number) * 100).toFixed(0)}% |
              逾期: {((pref.procrastination_pattern.overdue as number) * 100).toFixed(0)}%
            </span>
          ) : (
            <Text type="secondary">尚未学习</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="累计学习天数">
          <Text strong>{pref.days_of_data} 天</Text>
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Popconfirm
          title="确认重置所有 AI 学习数据？"
          description="重置后将回退到系统默认值，所有学习数据将丢失。"
          onConfirm={handleReset}
        >
          <Button danger>重置学习数据</Button>
        </Popconfirm>
      </div>
    </Card>
  )
}
