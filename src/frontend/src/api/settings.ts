import apiClient from './client'
import type { UserSettings } from '../types'

/** 设置 API — [REQ_TASK_MGMT_011] */

export async function getSettings() {
  const { data } = await apiClient.get('/settings')
  return data.data as UserSettings
}

export async function updateSettings(settings: Partial<UserSettings>) {
  const { data } = await apiClient.put('/settings', settings)
  return data.data as UserSettings
}
