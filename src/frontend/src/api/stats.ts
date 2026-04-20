import apiClient from './client'
import type { StatsSummary } from '../types'

/** 统计 API — [REQ_TASK_MGMT_009] */

export async function getStatsSummary(range = 'week', startDate?: string, endDate?: string) {
  const { data } = await apiClient.get('/stats/summary', {
    params: { range, start_date: startDate, end_date: endDate },
  })
  return data.data as StatsSummary
}

export async function getStatsTrends(days = 7) {
  const { data } = await apiClient.get('/stats/trends', { params: { days } })
  return data.data as { date: string; count: number }[]
}
