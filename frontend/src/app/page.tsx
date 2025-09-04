'use client'

import { useState, useEffect } from 'react'
import { Layout, Button, Typography, Card, Space } from 'antd'
import { BookOutlined, LoginOutlined, UserOutlined } from '@ant-design/icons'
import LoginForm from '@/components/LoginForm'
import MainApp from '@/components/MainApp'
import { useAuthStore } from '@/store/authStore'

const { Header, Content } = Layout
const { Title, Paragraph } = Typography

export default function Home() {
  const { isAuthenticated, checkAuth } = useAuthStore()
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isAuthenticated) {
    return <MainApp />
  }

  return (
    <Layout className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOutlined className="text-2xl text-blue-600" />
            <Title level={3} className="!mb-0 text-gray-800">
              小说写作云端平台
            </Title>
          </div>
          <Space>
            <Button 
              type="primary" 
              icon={<LoginOutlined />}
              onClick={() => setShowLogin(true)}
            >
              登录
            </Button>
          </Space>
        </div>
      </Header>

      <Content className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <Title level={1} className="text-gray-800 mb-4">
              专业的小说创作平台
            </Title>
            <Paragraph className="text-lg text-gray-600 max-w-2xl mx-auto">
              支持多设备同步、AI辅助写作、角色管理和版本控制的现代化小说创作工具
            </Paragraph>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="text-center">
              <BookOutlined className="text-4xl text-blue-600 mb-4" />
              <Title level={4}>智能写作</Title>
              <Paragraph>
                AI扩写、润色、总结，让创作更加高效和流畅
              </Paragraph>
            </Card>

            <Card className="text-center">
              <UserOutlined className="text-4xl text-green-600 mb-4" />
              <Title level={4}>角色管理</Title>
              <Paragraph>
                完整的角色档案管理，构建丰富的故事世界
              </Paragraph>
            </Card>

            <Card className="text-center">
              <LoginOutlined className="text-4xl text-purple-600 mb-4" />
              <Title level={4}>多设备同步</Title>
              <Paragraph>
                支持iPad、iPhone、电脑等多设备无缝写作体验
              </Paragraph>
            </Card>
          </div>

          <div className="text-center">
            <Button 
              type="primary" 
              size="large"
              icon={<LoginOutlined />}
              onClick={() => setShowLogin(true)}
              className="px-8 py-4 h-auto text-lg"
            >
              开始创作之旅
            </Button>
          </div>
        </div>
      </Content>

      <LoginForm 
        visible={showLogin} 
        onClose={() => setShowLogin(false)} 
      />
    </Layout>
  )
} 