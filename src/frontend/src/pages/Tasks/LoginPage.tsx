import { useState } from 'react'
import { Form, Input, Button, Card, Typography, Tabs, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { login, register, checkRegistration } from '../../api/auth'
import { useAuthStore } from '../../store'

const { Title, Text } = Typography

/**
 * 登录/注册页面 — [REQ_TASK_MGMT_011]
 * 首次访问显示注册Tab，已有用户后隐藏注册入口。
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [allowRegister, setAllowRegister] = useState(true)
  const [activeTab, setActiveTab] = useState('login')

  // 检查是否允许注册（已有用户则隐藏注册入口）
  useState(() => {
    checkRegistration()
      .then((data) => setAllowRegister(data?.allow_registration ?? true))
      .catch(() => setAllowRegister(true))
  })

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const result = await login(values.username, values.password)
      setAuth(result.token, values.username)
      message.success('登录成功')
      navigate('/tasks')
    } catch {
      // 错误已在拦截器中处理
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const result = await register(values.username, values.password)
      setAuth(result.token, values.username)
      message.success('注册成功')
      navigate('/tasks')
    } catch {
      // 错误已在拦截器中处理
    } finally {
      setLoading(false)
    }
  }

  const passwordRules = [
    { required: true, message: '请输入密码' },
    { min: 8, message: '密码至少 8 个字符' },
    { pattern: /[a-zA-Z]/, message: '密码需包含字母' },
    { pattern: /[0-9]/, message: '密码需包含数字' },
  ]

  const loginForm = (
    <Form onFinish={handleLogin} autoComplete="off" size="large">
      <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
        <Input prefix={<UserOutlined />} placeholder="用户名" />
      </Form.Item>
      <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
        <Input.Password prefix={<LockOutlined />} placeholder="密码" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          登录
        </Button>
      </Form.Item>
    </Form>
  )

  const registerForm = (
    <Form onFinish={handleRegister} autoComplete="off" size="large">
      <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }, { min: 3, message: '用户名至少 3 个字符' }]}>
        <Input prefix={<UserOutlined />} placeholder="用户名" />
      </Form.Item>
      <Form.Item name="password" rules={passwordRules}>
        <Input.Password prefix={<LockOutlined />} placeholder="密码（至少8位，含字母和数字）" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          注册
        </Button>
      </Form.Item>
    </Form>
  )

  const tabItems = [
    { key: 'login', label: '登录', children: loginForm },
  ]
  if (allowRegister) {
    tabItems.push({ key: 'register', label: '注册', children: registerForm })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card style={{ width: 420, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>🤖 智能任务管理器</Title>
          <Text type="secondary">AI 驱动的任务管理工具</Text>
        </div>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          centered
        />
      </Card>
    </div>
  )
}
