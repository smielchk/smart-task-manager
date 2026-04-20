import React, { useState } from 'react'
import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { Tag } from '../../types'

/**
 * 任务筛选栏 — [REQ_TASK_MGMT_001]
 * 支持按分类、标签、状态、关键词筛选。
 */
export interface TaskFilterValues {
  keyword: string
  status: string[]
  category_id: number | null
  tag_id: number | null
}

interface Props {
  categories: { id: number; name: string; icon: string }[]
  tags: Tag[]
  values: TaskFilterValues
  onChange: (values: TaskFilterValues) => void
}

export default function TaskFilter({ categories, tags, values, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
      <Input
        placeholder="搜索任务..."
        prefix={<SearchOutlined />}
        allowClear
        style={{ width: 240 }}
        value={values.keyword}
        onChange={(e) => onChange({ ...values, keyword: e.target.value })}
      />
      <select
        style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #d9d9d9' }}
        value={values.status.join(',') || ''}
        onChange={(e) =>
          onChange({
            ...values,
            status: e.target.value ? e.target.value.split(',') : [],
          })
        }
      >
        <option value="">全部状态</option>
        <option value="pending">待办</option>
        <option value="in_progress">进行中</option>
        <option value="completed">已完成</option>
        <option value="cancelled">已取消</option>
      </select>
      <select
        style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #d9d9d9' }}
        value={values.category_id || ''}
        onChange={(e) => onChange({ ...values, category_id: e.target.value ? Number(e.target.value) : null })}
      >
        <option value="">全部分类</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon} {c.name}
          </option>
        ))}
      </select>
      <select
        style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #d9d9d9' }}
        value={values.tag_id || ''}
        onChange={(e) => onChange({ ...values, tag_id: e.target.value ? Number(e.target.value) : null })}
      >
        <option value="">全部标签</option>
        {tags.map((t) => (
          <option key={t.id} value={t.id}>
            #{t.name}
          </option>
        ))}
      </select>
    </div>
  )
}
