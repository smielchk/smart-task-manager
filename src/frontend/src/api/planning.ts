import apiClient from './client'
import type { DailyPlan } from '../types'

/** 规划 API — [REQ_TASK_MGMT_006] */

export async function getDailyPlan(date?: string) {
  const { data } = await apiClient.get('/planning/daily', { params: { date } })
  return data.data as DailyPlan
}

export async function getWeeklyPlan(weekStart?: string) {
  const { data } = await apiClient.get('/planning/weekly', { params: { week_start: weekStart } })
  return data.data
}

export async function regeneratePlan(type: 'daily' | 'weekly') {
  const { data } = await apiClient.post('/planning/regenerate', { type })
  return data.data
}
