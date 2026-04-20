import apiClient from './client'

/** 偏好 API — [REQ_TASK_MGMT_010] */

export interface UserPreference {
  user_id: number
  active_hours: Record<string, number> | null
  productive_hours: string[] | null
  category_preference: Record<string, number> | null
  tag_preference: Record<string, number> | null
  completion_speed: Record<string, number> | null
  procrastination_pattern: Record<string, number> | null
  manual_overrides: Record<string, unknown> | null
  days_of_data: number
  updated_at: string
}

export async function getPreferences() {
  const { data } = await apiClient.get('/preferences')
  return data.data as UserPreference
}

export async function updatePreference(field: string, value: unknown) {
  const { data } = await apiClient.put('/preferences', { field, value })
  return data.data as UserPreference
}

export async function resetPreferences() {
  const { data } = await apiClient.post('/preferences/reset')
  return data.data
}
