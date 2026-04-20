import { useState, useEffect } from 'react'
import { Calendar, Badge, Button } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { getTasks } from '../../api/tasks'
import DayTasks from './DayTasks'
import TaskDetail from '../Tasks/TaskDetail'
import PriorityBadge from '../../components/Task/PriorityBadge'
import type { Task } from '../../types'

/**
 * 月视图 — [REQ_TASK_MGMT_008]
 * 自定义日期单元格渲染，展示任务优先级色块。
 */
export default function MonthView() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null)
  const [detailTask, setDetailTask] = useState<Task | null>(null)

  useEffect(() => {
    getTasks({ page: 1, page_size: 500 }).then((result) => setTasks(result.items)).catch(() => {})
  }, [])

  // 按日期分组任务
  const tasksByDate = new Map<string, Task[]>()
  tasks.forEach((task) => {
    if (task.due_datetime) {
      const dateKey = dayjs(task.due_datetime).format('YYYY-MM-DD')
      const list = tasksByDate.get(dateKey) || []
      list.push(task)
      tasksByDate.set(dateKey, list)
    }
  })

  // 优先级颜色映射
  const priorityColorMap: Record<string, string> = {
    P0: '#f5222d',
    P1: '#fa8c16',
    P2: '#1890ff',
    P3: '#d9d9d9',
  }

  const cellRender = (date: Dayjs) => {
    const dateKey = date.format('YYYY-MM-DD')
    const dayTasks = tasksByDate.get(dateKey)

    if (!dayTasks || dayTasks.length === 0) return null

    return (
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 4 }}>
        {dayTasks.slice(0, 3).map((task) => (
          <div
            key={task.id}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: priorityColorMap[task.priority] || '#d9d9d9',
            }}
            title={`${task.priority} ${task.title}`}
          />
        ))}
        {dayTasks.length > 3 && (
          <span style={{ fontSize: 10, color: '#888' }}>+{dayTasks.length - 3}</span>
        )}
      </div>
    )
  }

  const handleSelect = (date: Dayjs) => {
    const dateKey = date.format('YYYY-MM-DD')
    const dayTasks = tasksByDate.get(dateKey) || []
    if (dayTasks.length > 0) {
      setSelectedDate(date)
    }
  }

  return (
    <div>
      <Calendar
        fullscreen
        cellRender={(date, info) => {
          if (info.type === 'date') return cellRender(date)
          return null
        }}
        onSelect={handleSelect}
      />

      {selectedDate && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1050, background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', width: 480 }}>
          <DayTasks
            date={selectedDate}
            tasks={tasksByDate.get(selectedDate.format('YYYY-MM-DD')) || []}
            onClose={() => setSelectedDate(null)}
            onTaskClick={setDetailTask}
          />
        </div>
      )}

      <TaskDetail
        open={!!detailTask}
        task={detailTask}
        onClose={() => setDetailTask(null)}
      />
    </div>
  )
}
