import apiClient from './client'

/** AI 健康检查 API — [REQ_TASK_MGMT_012] */

export interface AIHealthStatus {
  available: boolean
  model: string | null
  base_url: string | null
  latency_ms: number | null
  reason?: string
  checked_at: string
}

export async function getAIHealth() {
  const { data } = await apiClient.get('/health/ai')
  return data.data as AIHealthStatus
}
