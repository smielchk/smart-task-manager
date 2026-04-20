import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import AppLayout from './components/Layout/AppLayout'
import AuthGuard from './components/Layout/AuthGuard'
import LoginPage from './pages/Tasks/LoginPage'
import TaskList from './pages/Tasks/TaskList'
import KanbanView from './pages/Kanban'
import CalendarView from './pages/Calendar'
import PlanningView from './pages/Planning'
import StatsView from './pages/Stats'
import SettingsView from './pages/Settings'
import { useSettingsStore } from './store/settingsStore'

// 路由配置
const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/tasks" replace /> },
      { path: 'tasks', element: <TaskList /> },
      { path: 'kanban', element: <KanbanView /> },
      { path: 'calendar', element: <CalendarView /> },
      { path: 'planning', element: <PlanningView /> },
      { path: 'stats', element: <StatsView /> },
      { path: 'settings', element: <SettingsView /> },
    ],
  },
])

export default function App() {
  const { theme: appTheme } = useSettingsStore()

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: appTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  )
}
