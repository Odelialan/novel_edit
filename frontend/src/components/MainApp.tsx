'use client'

import { useState } from 'react'
import { Layout, Menu, Button, Typography, Space, Avatar, Dropdown, App } from 'antd'
import { 
  BookOutlined, 
  UserOutlined, 
  SettingOutlined, 
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CloudServerOutlined,
  RobotOutlined,
  TrophyOutlined,
  ToolOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import NovelList from './NovelList'
import ChapterEditor from './ChapterEditor'
import OutlineManager from './OutlineManager'
import TimelinePanel from './TimelinePanel'
import WorldMapPanel from './WorldMapPanel'
import PowerSystemPanel from './PowerSystemPanel'
import AIWorldPanel from './AIWorldPanel'
import TunnelManager from './TunnelManager'
import AIPromptManager from './AIPromptManager'
import AIPromptExpandSettings from './ai-prompts/AIPromptExpandSettings'
import AIPromptPolishSettings from './ai-prompts/AIPromptPolishSettings'
import AIPromptSummarySettings from './ai-prompts/AIPromptSummarySettings'
import AIPromptWorldSettings from './ai-prompts/AIPromptWorldSettings'
import AIPromptCharacterSettings from './ai-prompts/AIPromptCharacterSettings'
import AIPromptInspirationSettings from './ai-prompts/AIPromptInspirationSettings'
import AIInspiration from './AIInspiration'
import CharacterManager from './CharacterManager'
import GlobalWritingTracker from './GlobalWritingTracker'
import NovelDashboard from './NovelDashboard'
import { useAuthStore } from '@/store/authStore'
import AIPromptOverview from './ai-prompts/AIPromptOverview'
import AIPromptOutlineWriting from './ai-prompts/AIPromptOutlineWriting'

const { Header, Sider, Content } = Layout
const { Title } = Typography

interface Novel {
  id: string
  title: string
  slug: string
  updated_at: string
  meta: any
}

export default function MainApp() {
  const { message } = App.useApp()
  const [collapsed, setCollapsed] = useState(false)
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null)
  const [currentView, setCurrentView] = useState<
    'novels' | 'editor' | 'characters' | 'outlines' | 'timeline' | 'world' | 'power' | 'ai-world' | 'tunnel' | 'writing-tracker' | 'dashboard' |
    'prompts' | 'inspiration' | 'system-maintenance' |
    'prompts-expand' | 'prompts-polish' | 'prompts-summary' | 'prompts-world' | 'prompts-character' | 'prompts-overview' |
    'prompts-outline-writing' | 'prompts-outline'
  >('novels')
  const { logout, user, token } = useAuthStore()

  const handleSelectNovel = (novel: Novel) => {
    setSelectedNovel(novel)
    setCurrentView('editor')
  }

  const handleCreateNovel = () => {
    setSelectedNovel(null)
    setCurrentView('novels')
  }

  const handleLogout = () => {
    logout()
    message.success('已退出登录')
  }

  const handleClearAllCache = async () => {
    try {
      // 使用 message.loading 的返回值来关闭加载消息
      const hideLoading = message.loading('正在清理所有缓存...', 0)
      
      // 获取所有小说ID
      const novelsResponse = await fetch('/api/novels', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (novelsResponse.ok) {
        const novelsData = await novelsResponse.json()
        if (novelsData.ok && novelsData.data && novelsData.data.novels) {
          const novels = novelsData.data.novels
          let cleanedCount = 0
          
          for (const novel of novels) {
            try {
              const clearResponse = await fetch(`/api/sync/clear-cache?novel_id=${encodeURIComponent(novel.id)}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              })
              
              if (clearResponse.ok) {
                cleanedCount++
              }
            } catch (e) {
              console.error(`清理小说 ${novel.id} 缓存失败:`, e)
            }
          }
          
          // 关闭加载消息
          hideLoading()
          message.success(`缓存清理完成！已清理 ${cleanedCount} 个小说的缓存`)
        } else {
          hideLoading()
          message.error('获取小说列表失败')
        }
      } else {
        hideLoading()
        message.error('获取小说列表失败')
      }
    } catch (e) {
      console.error('清理缓存失败:', e)
      message.error('清理缓存失败')
    }
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置'
    },
    {
      type: 'divider' as const
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ]

  const renderContent = () => {
    switch (currentView) {
      case 'novels':
        return (
          <NovelList
            onSelectNovel={handleSelectNovel}
            onCreateNovel={handleCreateNovel}
          />
        )
      case 'editor':
        return selectedNovel ? (
          <ChapterEditor
            novelId={selectedNovel.id}
            novelTitle={selectedNovel.title}
          />
        ) : (
          <div className="text-center py-12">
            <Title level={4} className="text-gray-500">
              请先选择一个小说进行编辑
            </Title>
          </div>
        )
      case 'characters':
        return selectedNovel ? (
          <CharacterManager novelId={selectedNovel.id} />
        ) : (
          <div className="text-center py-12">
            <Title level={4} className="text-gray-500">
              请先选择一个小说管理角色
            </Title>
          </div>
        )
      case 'outlines':
        return selectedNovel ? (
          <OutlineManager novelId={selectedNovel.id} />
        ) : (
          <div className="text-center py-12">
            <Title level={4} className="text-gray-500">
              请先选择一个小说管理大纲
            </Title>
          </div>
        )
      case 'timeline':
        return selectedNovel ? (
          <TimelinePanel novelId={selectedNovel.id} />
        ) : (
          <div className="text-center py-12">
            <Title level={4} className="text-gray-500">
              请先选择一个小说管理时间线
            </Title>
          </div>
        )
      case 'world':
        return selectedNovel ? (
          <WorldMapPanel novelId={selectedNovel.id} />
        ) : (
          <div className="text-center py-12">
            <Title level={4} className="text-gray-500">
              请先选择一个小说管理世界观
            </Title>
          </div>
        )
      case 'prompts-outline-writing':
        return (
          <div className="max-w-4xl mx-auto">
            <AIPromptOutlineWriting novelId={selectedNovel?.id} />
          </div>
        )
      // 大纲生成入口已取消
      case 'power':
        return selectedNovel ? (
          <PowerSystemPanel novelId={selectedNovel.id} />
        ) : (
          <div className="text-center py-12">
            <Title level={4} className="text-gray-500">
              请先选择一个小说管理力量体系
            </Title>
          </div>
        )
      case 'ai-world':
        return selectedNovel ? (
          <AIWorldPanel novelId={selectedNovel.id} />
        ) : (
          <div className="text-center py-12">
            <Title level={4} className="text-gray-500">
              请先选择一个小说使用AI生成
            </Title>
          </div>
        )
      case 'writing-tracker':
        return (
          <div className="max-w-6xl mx-auto">
            <GlobalWritingTracker />
          </div>
        )
      case 'tunnel':
        return (
          <div className="max-w-3xl mx-auto">
            <TunnelManager />
          </div>
        )
      case 'prompts':
        return (
          <div className="max-w-4xl mx-auto">
            <AIPromptManager />
          </div>
        )
      case 'prompts-expand':
        return (<div className="max-w-4xl mx-auto"><AIPromptExpandSettings /></div>)
      case 'prompts-polish':
        return (<div className="max-w-4xl mx-auto"><AIPromptPolishSettings /></div>)
      case 'prompts-summary':
        return (<div className="max-w-4xl mx-auto"><AIPromptSummarySettings /></div>)
      case 'prompts-world':
        return (<div className="max-w-4xl mx-auto"><AIPromptWorldSettings /></div>)
      case 'prompts-character':
        return (<div className="max-w-4xl mx-auto"><AIPromptCharacterSettings /></div>)
      case 'prompts-overview':
        return (
          <div className="max-w-4xl mx-auto">
            <AIPromptOverview />
          </div>
        )
      case 'inspiration':
        return (
          <div className="max-w-4xl mx-auto">
            <AIInspiration />
          </div>
        )
      case 'system-maintenance':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow p-6">
              <Title level={3} className="mb-6">
                <ToolOutlined className="mr-2" />
                系统维护
              </Title>
              
              <div className="space-y-6">
                <div className="border rounded-lg p-4">
                  <Title level={4} className="mb-4">
                    <DeleteOutlined className="mr-2 text-red-500" />
                    缓存管理
                  </Title>
                  <p className="text-gray-600 mb-4">
                    清理系统缓存可以解决文件同步问题，释放存储空间，提高系统性能。
                  </p>
                  <Button 
                    type="primary" 
                    danger 
                    icon={<DeleteOutlined />}
                    onClick={handleClearAllCache}
                    size="large"
                  >
                    清理所有小说缓存
                  </Button>
                  <div className="mt-2 text-sm text-gray-500">
                    将清理所有小说的 deleted、.versions、.cache、temp、tmp 等缓存目录
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <Title level={4} className="mb-4">
                    <ToolOutlined className="mr-2 text-blue-500" />
                    系统信息
                  </Title>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">当前用户：</span>
                      <span>{user?.email || '未知'}</span>
                    </div>
                    <div>
                      <span className="font-medium">登录时间：</span>
                      <span>{new Date().toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'dashboard':
        return selectedNovel ? (
          <div className="max-w-4xl mx-auto">
            <NovelDashboard novelId={selectedNovel.id} />
          </div>
        ) : (
          <div className="text-center py-12">
            <Title level={4} className="text-gray-500">
              请先选择一个小说查看总览
            </Title>
          </div>
        )
      default:
        return null
    }
  }

  const menuItems = [
    {
      key: 'novels',
      icon: <BookOutlined />,
      label: '小说管理',
      onClick: () => {
        setCurrentView('novels')
        setSelectedNovel(null)
      }
    },
    {
      key: 'system-maintenance',
      icon: <ToolOutlined />,
      label: '系统维护',
      children: [
        { 
          key: 'clear-cache', 
          icon: <DeleteOutlined />,
          label: '清理所有缓存', 
          onClick: handleClearAllCache 
        }
      ]
    },
    {
      key: 'writing-tracker',
      icon: <TrophyOutlined />,
      label: '写作目标追踪',
      onClick: () => setCurrentView('writing-tracker')
    },
    {
      key: 'tunnel',
      icon: <CloudServerOutlined />,
      label: '内网穿透',
      onClick: () => setCurrentView('tunnel')
    },
    {
      key: 'prompts',
      icon: <RobotOutlined />,
      label: 'AI 提示词',
      children: [
        { key: 'prompts-expand', label: '扩写', onClick: () => setCurrentView('prompts-expand') },
        { key: 'prompts-polish', label: '润色', onClick: () => setCurrentView('prompts-polish') },
        { key: 'prompts-summary', label: '章节概要', onClick: () => setCurrentView('prompts-summary') },
        { key: 'prompts-world', label: '世界观', onClick: () => setCurrentView('prompts-world') },
        { key: 'prompts-outline-writing', label: '大纲编写', onClick: () => setCurrentView('prompts-outline-writing') },
        // 大纲生成入口移除，避免重复
        { key: 'prompts-character', label: '角色设计', onClick: () => setCurrentView('prompts-character') },
        { key: 'prompts-all', label: '总览', onClick: () => setCurrentView('prompts-overview') },
      ]
    },
    {
      key: 'inspiration',
      icon: <RobotOutlined />,
      label: 'AI 灵感',
      onClick: () => setCurrentView('inspiration')
    },
    ...(selectedNovel ? [
      {
        key: 'editor',
        icon: <BookOutlined />,
        label: `编辑: ${selectedNovel.title}`,
        onClick: () => setCurrentView('editor')
      },
      {
        key: 'dashboard',
        icon: <BookOutlined />,
        label: '小说总览',
        onClick: () => setCurrentView('dashboard')
      },
      {
        key: 'outlines',
        icon: <BookOutlined />,
        label: '大纲管理',
        children: [
          { key: 'outlines-main', label: '大纲管理', onClick: () => setCurrentView('outlines') },
          { key: 'outlines-timeline', label: '时间线管理', onClick: () => setCurrentView('timeline') },
          { key: 'outlines-world', label: '世界观管理', onClick: () => setCurrentView('world') },
          { key: 'outlines-power', label: '力量体系', onClick: () => setCurrentView('power') },
          { key: 'outlines-ai', label: 'AI生成', onClick: () => setCurrentView('ai-world') }
        ]
      },
      {
        key: 'characters',
        icon: <UserOutlined />,
        label: '角色管理',
        onClick: () => setCurrentView('characters')
      }
    ] : [])
  ]

  return (
    <Layout className="min-h-screen">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        className="bg-white border-r"
        width={280}
      >
        <div className="p-4 border-b">
          <Title level={4} className="!mb-0 text-center">
            {collapsed ? 'NE' : 'Novel Edit'}
          </Title>
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[currentView]}
          items={menuItems}
          className="border-0"
        />
      </Sider>

      <Layout>
        <Header className="bg-white border-b px-4 flex items-center justify-between">
          <div className="flex items-center">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="mr-4"
            />
            
            {selectedNovel && (
              <div className="flex items-center">
                <BookOutlined className="mr-2 text-blue-600" />
                <Title level={4} className="!mb-0">
                  {selectedNovel.title}
                </Title>
              </div>
            )}
          </div>

          <Space>
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button type="text" className="flex items-center">
                <Avatar icon={<UserOutlined />} className="mr-2" />
                {user?.email || '用户'}
              </Button>
            </Dropdown>
          </Space>
        </Header>

        <Content className="p-6 bg-gray-50 overflow-auto">
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  )
} 