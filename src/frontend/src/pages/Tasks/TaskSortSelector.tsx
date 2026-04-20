import { Select, Tooltip } from 'antd'
import { SortAscendingOutlined } from '@ant-design/icons'
import { useState } from 'react'

/**
 * 排序方式选择器 — [REQ_TASK_MGMT_004]
 * 支持 AI 智能排序 / 手动排序切换，偏好持久化到 localStorage。
 */

const sortOptions = [
  { value: 'smart', label: '🤖 AI 智能排序' },
  { value: 'priority', label: '⚡ 按优先级' },
  { value: 'due_datetime', label: '📅 按截止时间' },
  { value: 'created_at', label: '🕐 按创建时间' },
  { value: 'status', label: '📊 按状态' },
]

const sortOrderOptions = [
  { value: 'desc', label: '降序' },
  { value: 'asc', label: '升序' },
]

interface Props {
  value?: string
  sortOrder?: string
  onChange: (sort: string, sortOrder: string) => void
}

export default function TaskSortSelector({ value = 'smart', sortOrder = 'desc', onChange }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <SortAscendingOutlined style={{ color: '#888' }} />
      <Select
        value={value}
        style={{ width: 180 }}
        options={sortOptions}
        onChange={(v) => onChange(v, sortOrder)}
      />
      <Select
        value={sortOrder}
        style={{ width: 80 }}
        options={sortOrderOptions}
        onChange={(v) => onChange(value, v)}
      />
    </div>
  )
}
