import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store'

/**
 * 路由守卫 — [REQ_TASK_MGMT_011]
 * 未登录用户重定向到登录页面。
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
