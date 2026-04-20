import React from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Typography } from 'antd'
import {
  CheckSquareOutlined,
  KanbanOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import { useAuthStore, useSettingsStore } from '../store'
import ThemeToggle from '../components/Task/ThemeToggle'

const { Sider, Content, Header } = Layout
const { Title } = Typography

const menuItems = [
  { key: '/tasks', icon: <CheckSquareOutlined />, label: '任务列表' },
  { key: '/kanban', icon: <KanbanOutlined />, label: '看板视图' },
  { key: '/calendar', icon: <CalendarOutlined />, label: '日历视图' },
  { key: '/planning', icon: <ScheduleOutlined />, label: '时间规划' },
  { key: '/stats', icon: <BarChartOutlined />, label: '数据统计' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { username, logout } = useAuthStore()
  const { theme } = useSettingsStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={220}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <RobotOutlined style={{ fontSize: 28, color: '#1890ff' }} />
          <Title level={5} style={{ color: 'white', margin: '8px 0 0' }}>
            智能任务管理器
          </Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout style={{ marginLeft: 220 }}>
        <Header
          style={{
            padding: '0 24px',
            background: theme === 'dark' ? '#141414' : '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <span style={{ fontWeight: 500 }}>欢迎, {username}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ThemeToggle />
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
              退出
            </Button>
          </div>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
