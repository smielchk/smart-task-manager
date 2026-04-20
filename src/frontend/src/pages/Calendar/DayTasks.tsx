import { useState, useEffect } from 'react'
import { Button, Empty, List, Tag, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { getTasks } from '../../api/tasks'
import PriorityBadge from '../../components/Task/PriorityBadge'
import type { Task } from '../../types'

const { Title, Text } = Typography

/**
 * 日期任务列表弹窗 — [REQ_TASK_MGMT_008]
 * 点击日历日期后展示当天任务。
 */
export default function DayTasks({
  date,
  tasks,
  onClose,
  onTaskClick,
}: {
  date: Dayjs
  tasks: Task[]
  onClose: () => void
  onTaskClick?: (task: Task) => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Title level={5} style={{ margin: 0 }}>
          {date.format('YYYY年MM月DD日')} 的任务
        </Title>
        <Button size="small" onClick={onClose}>关闭</Button>
      </div>
      {tasks.length === 0 ? (
        <Empty description="当天没有任务" />
      ) : (
        <List
          size="small"
          dataSource={tasks}
          renderItem={(task) => (
            <List.Item
              onClick={() => onTaskClick?.(task)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                <PriorityBadge priority={task.priority} />
                <Text strong style={{ flex: 1 }}>{task.title}</Text>
                {task.due_datetime && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(task.due_datetime).format('HH:mm')}
                  </Text>
                )}
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  )
}
