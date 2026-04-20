import { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'
import KanbanColumn from './KanbanColumn'
import KanbanHeader from './KanbanHeader'
import TaskDetail from '../Tasks/TaskDetail'
import { getTasks, updateTaskStatus } from '../../api/tasks'
import type { Task } from '../../types'

/**
 * 看板主页面 — [REQ_TASK_MGMT_007]
 * 三列看板视图：待办 / 进行中 / 已完成
 * 支持拖拽任务卡片在列间移动以更新状态。
 */
export default function KanbanView() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [detailTask, setDetailTask] = useState<Task | null>(null)

  const fetchAllTasks = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getTasks({ sort: 'smart', page: 1, page_size: 200 })
      setTasks(result.items)
    } catch {
      // 错误已在拦截器中处理
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllTasks()
  }, [fetchAllTasks])

  const handleDrop = useCallback(async (_e: React.DragEvent, status: string) => {
    // status 可能是中文标题，需要映射
    const statusMap: Record<string, string> = {
      '待办': 'pending',
      '进行中': 'in_progress',
      '已完成': 'completed',
      '已取消': 'cancelled',
    }
    // 实际在 KanbanColumn 里 title 是英文 status 或中文，这里统一处理
    // 因为 onDrop 直接传 title，我们在 KanbanView 用英文映射
  }, [])

  // 重写拖拽处理：使用 dataTransfer 中的 taskId
  const handleColumnDrop = useCallback(async (e: React.DragEvent, newStatus: string) => {
    const taskId = parseInt(e.dataTransfer.getData('taskId'), 10)
    if (!taskId) return

    const statusMap: Record<string, string> = {
      '待办': 'pending',
      '进行中': 'in_progress',
      '已完成': 'completed',
    }

    const mappedStatus = statusMap[newStatus] || newStatus
    try {
      await updateTaskStatus(taskId, mappedStatus)
      message.success('状态已更新')
      fetchAllTasks()
    } catch {
      // 错误已在拦截器中处理
    }
  }, [fetchAllTasks])

  const pending = tasks.filter((t) => t.status === 'pending')
  const inProgress = tasks.filter((t) => t.status === 'in_progress')
  const completed = tasks.filter((t) => t.status === 'completed')
  const cancelled = tasks.filter((t) => t.status === 'cancelled')

  return (
    <div>
      <h2>看板视图</h2>
      <KanbanHeader counts={{ pending: pending.length, in_progress: inProgress.length, completed: completed.length, cancelled: cancelled.length }} />

      <div style={{ display: 'flex', gap: 16 }}>
        <KanbanColumn
          title="待办"
          tasks={pending}
          color="#8c8c8c"
          onDrop={handleColumnDrop}
          onCardClick={setDetailTask}
        />
        <KanbanColumn
          title="进行中"
          tasks={inProgress}
          color="#1890ff"
          onDrop={handleColumnDrop}
          onCardClick={setDetailTask}
        />
        <KanbanColumn
          title="已完成"
          tasks={completed}
          color="#52c41a"
          onDrop={handleColumnDrop}
          onCardClick={setDetailTask}
        />
      </div>

      <TaskDetail
        open={!!detailTask}
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onStatusChange={fetchAllTasks}
      />
    </div>
  )
}
