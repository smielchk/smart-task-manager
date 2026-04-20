import apiClient from './client'

export async function login(username: string, password: string) {
  const { data } = await apiClient.post('/auth/login', { username, password })
  return data.data
}

export async function register(username: string, password: string) {
  const { data } = await apiClient.post('/auth/register', { username, password })
  return data.data
}

export async function checkRegistration() {
  const { data } = await apiClient.get('/auth/check')
  return data.data
}
