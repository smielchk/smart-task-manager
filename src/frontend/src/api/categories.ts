import apiClient from './client'

export async function getCategories(includeCounts = false) {
  const { data } = await apiClient.get('/categories', { params: { include_counts: includeCounts } })
  return data.data
}

export async function createCategory(name: string, icon = '📋') {
  const { data } = await apiClient.post('/categories', { name, icon })
  return data.data
}

export async function updateCategory(id: number, update: { name?: string; icon?: string }) {
  const { data } = await apiClient.put(`/categories/${id}`, update)
  return data.data
}

export async function deleteCategory(id: number) {
  const { data } = await apiClient.delete(`/categories/${id}`)
  return data.data
}

export async function getTags(includeCounts = false) {
  const { data } = await apiClient.get('/tags', { params: { include_counts: includeCounts } })
  return data.data
}

export async function createTag(name: string) {
  const { data } = await apiClient.post('/tags', { name })
  return data.data
}

export async function updateTag(id: number, name: string) {
  const { data } = await apiClient.put(`/tags/${id}`, { name })
  return data.data
}

export async function deleteTag(id: number) {
  const { data } = await apiClient.delete(`/tags/${id}`)
  return data.data
}

export async function mergeTags(sourceId: number, targetId: number) {
  const { data } = await apiClient.post('/tags/merge', { source_id: sourceId, target_id: targetId })
  return data.data
}
