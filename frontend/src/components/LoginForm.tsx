'use client'

import { useState } from 'react'
import { Modal, Form, Input, Button, Tabs, Typography, App } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { Text } = Typography

interface LoginFormProps {
  visible: boolean
  onClose: () => void
}

export default function LoginForm({ visible, onClose }: LoginFormProps) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('login')
  const { login, setup } = useAuthStore()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      // 验证邮箱是否匹配
      const success = await login(values.email, values.password)
      if (success) {
        message.success('登录成功！')
        onClose()
        form.resetFields()
      } else {
        message.error('邮箱或密码错误，请重试')
      }
    } catch (error) {
      message.error('登录失败，请检查网络连接')
    } finally {
      setLoading(false)
    }
  }

  const handleSetup = async (values: { email: string; password: string; confirmPassword: string }) => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      const success = await setup(values.email, values.password)
      if (success) {
        message.success('初始化成功！请登录')
        setActiveTab('login')
        form.resetFields()
      } else {
        message.error('初始化失败，可能已经设置过用户')
      }
    } catch (error) {
      message.error('初始化失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const tabItems = [
    {
      key: 'login',
      label: '登录',
      children: (
        <Form
          form={form}
          onFinish={handleLogin}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="请输入邮箱地址"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
              size="large"
            >
              登录
            </Button>
          </Form.Item>

          <div className="text-center">
            <Text type="secondary">
              首次使用？
              <Button 
                type="link" 
                size="small"
                onClick={() => setActiveTab('setup')}
              >
                初始化系统
              </Button>
            </Text>
          </div>
        </Form>
      )
    },
    {
      key: 'setup',
      label: '初始化',
      children: (
        <Form
          form={form}
          onFinish={handleSetup}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="请输入邮箱地址"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码（至少6位）"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认密码"
            rules={[{ required: true, message: '请确认密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请再次输入密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
              size="large"
            >
              初始化系统
            </Button>
          </Form.Item>

          <div className="text-center">
            <Text type="secondary">
              已有账号？
              <Button 
                type="link" 
                size="small"
                onClick={() => setActiveTab('login')}
              >
                直接登录
              </Button>
            </Text>
          </div>
        </Form>
      )
    }
  ]

  return (
    <Modal
      title="用户认证"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={400}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </Modal>
  )
} 