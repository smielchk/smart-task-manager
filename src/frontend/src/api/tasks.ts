import apiClient from './client'
import type { Task, TaskCreate, TaskUpdate, PaginatedResult } from '../types'

// 获取任务列表
export async function getTasks(params: {
  sort?: string
  sort_order?: string
  status?: string
  category_id?: number
  tag_id?: number
  keyword?: string
  include_deleted?: boolean
  page?: number
  page_size?: number
}): Promise<PaginatedResult<Task>> {
  const { data } = await apiClient.get('/tasks', { params })
  return data.data
}

// 创建任务
export async function createTask(task: TaskCreate): Promise<Task> {
  const { data } = await apiClient.post('/tasks', task)
  return data.data
}

// 获取任务详情
export async function getTask(id: number): Promise<Task> {
  const { data } = await apiClient.get(`/tasks/${id}`)
  return data.data
}

// 更新任务
export async function updateTask(id: number, task: TaskUpdate): Promise<Task> {
  const { data } = await apiClient.put(`/tasks/${id}`, task)
  return data.data
}

// 删除任务（软删除）
export async function deleteTask(id: number): Promise<void> {
  await apiClient.delete(`/tasks/${id}`)
}

// 更新任务状态
export async function updateTaskStatus(id: number, status: string): Promise<Task> {
  const { data } = await apiClient.patch(`/tasks/${id}/status`, { status })
  return data.data
}

// 恢复任务
export async function restoreTask(id: number): Promise<Task> {
  const { data } = await apiClient.post(`/tasks/${id}/restore`)
  return data.data
}

// NLP 解析
export async function parseNLP(input: string, timezone: string = 'Asia/Shanghai') {
  const { data } = await apiClient.post('/tasks/parse-nlp', { input_text: input, timezone })
  return data.data
}

// 智能排序
export async function getSmartSort(params?: { category_id?: number; status?: string }) {
  const { data } = await apiClient.get('/tasks/smart-sort', { params })
  return data.data
}

// 待推送提醒
export async function getPendingReminders() {
  const { data } = await apiClient.get('/tasks/pending-reminders')
  return data.data
}
