import { useState, useEffect, useCallback } from 'react'
import { Button, Switch, Pagination, Empty, message, Tooltip } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import TaskFilter, { type TaskFilterValues } from './TaskFilter'
import TaskSortSelector from './TaskSortSelector'
import TaskForm from './TaskForm'
import TaskDetail from './TaskDetail'
import SmartCreate from './SmartCreate'
import ParsePreview from './ParsePreview'
import TaskCard from '../../components/Task/TaskCard'
import { getTasks } from '../../api/tasks'
import { getCategories, getTags } from '../../api/categories'
import type { Task, Category, Tag, ParsedTask, PaginatedResult } from '../../types'
import AIStatusIndicator from '../../components/AI/AIStatusIndicator'

/**
 * 任务列表主页面 — [REQ_TASK_MGMT_001] [REQ_TASK_MGMT_002] [REQ_TASK_MGMT_004]
 */
export default function TaskList() {
  // 列表数据
  const [tasks, setTasks] = useState<Task[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(false)

  // 筛选和排序
  const [filter, setFilter] = useState<TaskFilterValues>({
    keyword: '',
    status: [],
    category_id: null,
    tag_id: null,
  })
  const [sort, setSort] = useState(() => localStorage.getItem('task_sort') || 'smart')
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('task_sort_order') || 'desc')

  // 分类和标签
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  // 弹窗状态
  const [formOpen, setFormOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null)
  const [parsePreviewOpen, setParsePreviewOpen] = useState(false)
  const [includeDeleted, setIncludeDeleted] = useState(false)

  // 加载分类和标签
  useEffect(() => {
    getCategories(true).then(setCategories).catch(() => {})
    getTags(true).then(setTags).catch(() => {})
  }, [])

  // 加载任务列表
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const result: PaginatedResult<Task> = await getTasks({
        sort,
        sort_order: sortOrder,
        status: filter.status.join(',') || undefined,
        category_id: filter.category_id || undefined,
        tag_id: filter.tag_id || undefined,
        keyword: filter.keyword || undefined,
        include_deleted: includeDeleted || undefined,
        page,
        page_size: pageSize,
      })
      setTasks(result.items)
      setTotal(result.total)
    } catch {
      // 错误已在拦截器中处理
    } finally {
      setLoading(false)
    }
  }, [sort, sortOrder, filter, includeDeleted, page, pageSize])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // 排序变更时持久化
  const handleSortChange = (newSort: string, newSortOrder: string) => {
    localStorage.setItem('task_sort', newSort)
    localStorage.setItem('task_sort_order', newSortOrder)
    setSort(newSort)
    setSortOrder(newSortOrder)
    setPage(1)
  }

  // 筛选变更时重置页码
  const handleFilterChange = (newFilter: TaskFilterValues) => {
    setFilter(newFilter)
    setPage(1)
  }

  // NLP 解析成功
  const handleParsed = (parsed: ParsedTask) => {
    setParsedTask(parsed)
    setParsePreviewOpen(true)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>任务列表</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <AIStatusIndicator />
          <Tooltip title="显示回收站任务">
            <Switch
              checkedChildren={<DeleteOutlined />}
              unCheckedChildren="回收站"
              checked={includeDeleted}
              onChange={setIncludeDeleted}
            />
          </Tooltip>
        </div>
      </div>

      {/* 智能创建入口 */}
      <SmartCreate
        onParsed={handleParsed}
        onManualCreate={() => { setEditTask(null); setFormOpen(true) }}
      />

      {/* 筛选栏 */}
      <TaskFilter categories={categories} tags={tags} values={filter} onChange={handleFilterChange} />

      {/* 排序选择器 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <TaskSortSelector value={sort} sortOrder={sortOrder} onChange={handleSortChange} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditTask(null); setFormOpen(true) }}>
          新建任务
        </Button>
      </div>

      {/* 任务列表 */}
      {tasks.length === 0 ? (
        <Empty description={includeDeleted ? '回收站为空' : '暂无任务，试试用自然语言创建吧！'} />
      ) : (
        <div>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => setDetailTask(task)}
            />
          ))}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Pagination
              current={page}
              total={total}
              pageSize={pageSize}
              showSizeChanger={false}
              showTotal={(t) => `共 ${t} 条`}
              onChange={setPage}
            />
          </div>
        </div>
      )}

      {/* 任务表单抽屉 */}
      <TaskForm
        open={formOpen}
        task={editTask}
        onClose={() => setFormOpen(false)}
        onSuccess={fetchTasks}
      />

      {/* 任务详情抽屉 */}
      <TaskDetail
        open={!!detailTask}
        task={detailTask}
        includeDeleted={includeDeleted}
        onClose={() => setDetailTask(null)}
        onStatusChange={fetchTasks}
      />

      {/* AI 解析预览 */}
      <ParsePreview
        visible={parsePreviewOpen}
        parsedTask={parsedTask}
        onClose={() => { setParsePreviewOpen(false); setParsedTask(null) }}
        onSuccess={fetchTasks}
      />
    </div>
  )
}
