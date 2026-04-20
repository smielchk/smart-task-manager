import { useState, useEffect } from 'react'
import { List, Tag, Typography, Empty } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { getTasks } from '../../api/tasks'
import PriorityBadge from '../../components/Task/PriorityBadge'
import TaskDetail from '../Tasks/TaskDetail'
import type { Task } from '../../types'

const { Text } = Typography

/**
 * 周视图 — [REQ_TASK_MGMT_008]
 * 以 7 列展示本周每天的任务列表。
 */
export default function WeekView() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [currentWeekStart, setCurrentWeekStart] = useState(dayjs().startOf('week'))

  useEffect(() => {
    getTasks({ page: 1, page_size: 500 }).then((result) => setTasks(result.items)).catch(() => {})
  }, [])

  // 获取本周 7 天
  const weekDays = Array.from({ length: 7 }, (_, i) => currentWeekStart.add(i, 'day'))

  // 按日期分组
  const tasksByDate = new Map<string, Task[]>()
  tasks.forEach((task) => {
    if (task.due_datetime) {
      const dateKey = dayjs(task.due_datetime).format('YYYY-MM-DD')
      const list = tasksByDate.get(dateKey) || []
      list.push(task)
      tasksByDate.set(dateKey, list)
    }
  })

  const isToday = (date: Dayjs) => date.isSame(dayjs(), 'day')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <a onClick={() => setCurrentWeekStart(currentWeekStart.subtract(7, 'day'))}>← 上一周</a>
          <a onClick={() => setCurrentWeekStart(dayjs().startOf('week'))}>本周</a>
          <a onClick={() => setCurrentWeekStart(currentWeekStart.add(7, 'day'))}>下一周 →</a>
        </div>
        <Text type="secondary">
          {currentWeekStart.format('YYYY年MM月DD日')} — {currentWeekStart.add(6, 'day').format('MM月DD日')}
        </Text>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {weekDays.map((day) => {
          const dateKey = day.format('YYYY-MM-DD')
          const dayTasks = tasksByDate.get(dateKey) || []

          return (
            <div
              key={dateKey}
              style={{
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                padding: 8,
                minHeight: 200,
                background: isToday(day) ? '#e6f7ff' : '#fafafa',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 8, fontWeight: isToday(day) ? 'bold' : 'normal' }}>
                <div style={{ fontSize: 12, color: '#888' }}>{day.format('ddd')}</div>
                <div style={{ fontSize: 18 }}>{day.format('DD')}</div>
              </div>
              {dayTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setDetailTask(task)}
                  style={{
                    padding: '2px 6px',
                    margin: '2px 0',
                    borderRadius: 4,
                    background: task.status === 'completed' ? '#f6ffed' : '#fff',
                    cursor: 'pointer',
                    borderLeft: `3px solid ${{ P0: '#f5222d', P1: '#fa8c16', P2: '#1890ff', P3: '#d9d9d9' }[task.priority]}`,
                    fontSize: 12,
                  }}
                >
                  <Text ellipsis style={{ fontSize: 12 }}>{task.title}</Text>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <TaskDetail
        open={!!detailTask}
        task={detailTask}
        onClose={() => setDetailTask(null)}
      />
    </div>
  )
}
