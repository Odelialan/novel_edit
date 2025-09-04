'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, Tabs, Form, Input, Button, Space, message, Modal, Popconfirm, Tag, Select, Divider, Typography, Breadcrumb } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined, SaveOutlined, CopyOutlined, ArrowRightOutlined, SettingOutlined, ReloadOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { TextArea } = Input
const { TabPane } = Tabs
const { Title, Text } = Typography

interface OutlinePromptData {
  [key: string]: any
}

interface AIPromptOutlineManagerProps {
  novelId?: string
  onPromptSelect?: (prompt: string, type: string) => void
  onBack?: () => void
}

export default function AIPromptOutlineManager({ novelId, onPromptSelect }: AIPromptOutlineManagerProps) {
  const { token, isAuthenticated } = useAuthStore()
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])
  const [loading, setLoading] = useState(false)
  const [outlinePrompts, setOutlinePrompts] = useState<OutlinePromptData>({})
  const [editingPrompt, setEditingPrompt] = useState<{ key: string; value: string; type: string } | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [newPromptKey, setNewPromptKey] = useState('')
  const [newPromptValue, setNewPromptValue] = useState('')
  const [newPromptType, setNewPromptType] = useState('story_background')
  const [currentView, setCurrentView] = useState<'main' | 'story_background' | 'power_system' | 'history_background' | 'story_timeline' | 'story_location' | 'main_plot' | 'volume_summary'>('main')
  
  const outlineTypes = [
    { key: 'story_background', label: '故事背景设定' },
    { key: 'power_system', label: '力量体系' },
    { key: 'history_background', label: '历史背景' },
    { key: 'story_timeline', label: '故事时间线' },
    { key: 'story_location', label: '故事发生地点' },
    { key: 'main_plot', label: '故事主线' },
    { key: 'volume_summary', label: '分卷内容简介' }
  ]

  // 检查认证状态
  if (!isAuthenticated || !token) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>请先登录</h2>
        <p>您需要先登录才能管理AI提示词</p>
      </div>
    )
  }

  useEffect(() => { 
    if (currentView === 'main') {
      loadOutlinePrompts() 
    }
  }, [token, currentView])

  const loadOutlinePrompts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/utils/prompts?scope=global', { headers })
      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          setOutlinePrompts(result.data?.prompts?.outline_writing || result.data?.prompts?.outline || {})
        }
      }
    } catch (error) {
      message.error('加载大纲提示词失败')
    } finally {
      setLoading(false)
    }
  }

  const saveOutlinePrompt = async (type: string, key: string, value: string) => {
    try {
      const response = await fetch('/api/utils/prompts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          scope: 'global',
          prompts: {
            outline: {
              [type]: {
                [key]: value
              }
            }
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          message.success('保存成功')
          setEditingPrompt(null)
          loadOutlinePrompts()
        } else {
          message.error(result.error?.msg || '保存失败')
        }
      } else {
        message.error('保存失败')
      }
    } catch (error) {
      message.error('保存失败')
    }
  }

  const deleteOutlinePrompt = async (type: string, key: string) => {
    try {
      const currentPrompts = { ...outlinePrompts }
      if (currentPrompts[type] && currentPrompts[type][key]) {
        delete currentPrompts[type][key]
      }

      const response = await fetch('/api/utils/prompts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          scope: 'global',
          prompts: {
            outline: currentPrompts
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          message.success('删除成功')
          loadOutlinePrompts()
        } else {
          message.error(result.error?.msg || '删除失败')
        }
      } else {
        message.error('删除失败')
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  const addNewPrompt = async () => {
    if (!newPromptKey.trim() || !newPromptValue.trim()) {
      message.error('请填写完整的提示词信息')
      return
    }

    try {
      const currentPrompts = { ...outlinePrompts }
      if (!currentPrompts[newPromptType]) {
        currentPrompts[newPromptType] = {}
      }
      currentPrompts[newPromptType][newPromptKey] = newPromptValue

      const response = await fetch('/api/utils/prompts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          scope: 'global',
          prompts: {
            outline: currentPrompts
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          message.success('添加成功')
          setIsModalVisible(false)
          setNewPromptKey('')
          setNewPromptValue('')
          setNewPromptType('story_background')
          loadOutlinePrompts()
        } else {
          message.error(result.error?.msg || '添加失败')
        }
      } else {
        message.error('添加失败')
      }
    } catch (error) {
      message.error('添加失败')
    }
  }

  const renderPromptEditor = (type: string, key: string, value: string) => (
    <div key={`${type}-${key}`} style={{ marginBottom: 16, padding: 16, border: '1px solid #d9d9d9', borderRadius: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Tag color="blue">{key}</Tag>
        <Space>
          <Button 
            size="small" 
            icon={<EditOutlined />} 
            onClick={() => setEditingPrompt({ key, value, type })}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个提示词吗？"
            onConfirm={() => deleteOutlinePrompt(type, key)}
            okText="确定"
            cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      </div>
      <div style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4, maxHeight: 200, overflow: 'auto' }}>
        <Text style={{ whiteSpace: 'pre-wrap' }}>{value}</Text>
      </div>
    </div>
  )

  const renderOutlineTypePage = (type: string, label: string) => {
    const prompts = outlinePrompts[type] || {}
    
    return (
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <SettingOutlined className="mr-2" />
            <span>AI提示词 · {label}</span>
          </div>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadOutlinePrompts} loading={loading}>
              刷新
            </Button>
            <Button icon={<ArrowRightOutlined />} onClick={() => setCurrentView('main')}>
              返回
            </Button>
          </Space>
        }
        loading={loading}
      >
        <Breadcrumb 
          style={{ marginBottom: 16 }}
          items={[
            { title: 'AI提示词管理' },
            { title: '大纲生成' },
            { title: label }
          ]}
        />

        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            全局大纲提示词（所有小说可见）
          </Text>
        </div>

        <Title level={4}>{label}提示词</Title>
        {Object.entries(prompts).length > 0 ? (
          Object.entries(prompts).map(([key, value]) => 
            renderPromptEditor(type, key, value as string)
          )
        ) : (
          <Text type="secondary">暂无{label}提示词数据</Text>
        )}

        {editingPrompt && editingPrompt.type === type && (
          <Modal
            title={`编辑${label}提示词`}
            open={!!editingPrompt}
            onOk={() => saveOutlinePrompt(type, editingPrompt.key, editingPrompt.value)}
            onCancel={() => setEditingPrompt(null)}
            width={800}
          >
            <Form layout="vertical">
              <Form.Item label="提示词名称">
                <Input value={editingPrompt.key} disabled />
              </Form.Item>
              <Form.Item label="提示词内容">
                <TextArea
                  value={editingPrompt.value}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, value: e.target.value })}
                  rows={15}
                  placeholder="请输入提示词内容..."
                />
              </Form.Item>
            </Form>
          </Modal>
        )}
      </Card>
    )
  }

  if (currentView !== 'main') {
    const currentType = outlineTypes.find(t => t.key === currentView)
    if (currentType) {
      return renderOutlineTypePage(currentView, currentType.label)
    }
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <SettingOutlined className="mr-2" />
          <span>AI提示词 · 大纲生成</span>
        </div>
      }
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadOutlinePrompts} loading={loading}>
            刷新
          </Button>
        </Space>
      }
      loading={loading}
    >
      <Breadcrumb 
        style={{ marginBottom: 16 }}
        items={[
          { title: 'AI提示词管理' },
          { title: '大纲生成' }
        ]}
      />

      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          全局大纲提示词（所有小说可见）
        </Text>
      </div>

      <Tabs defaultActiveKey="story_background">
        {outlineTypes.map(type => (
          <TabPane 
            tab={type.label} 
            key={type.key}
          >
            <div style={{ marginBottom: 16 }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => {
                  setNewPromptType(type.key)
                  setIsModalVisible(true)
                }}
              >
                添加{type.label}提示词
              </Button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">
                当前{type.label}提示词数量：{Object.keys(outlinePrompts[type.key] || {}).length}
              </Text>
            </div>

            {outlinePrompts[type.key] ? (
              Object.entries(outlinePrompts[type.key]).map(([key, value]) => 
                renderPromptEditor(type.key, key, value as string)
              )
            ) : (
              <Text type="secondary">暂无{type.label}提示词数据</Text>
            )}

            <div style={{ marginTop: 16 }}>
              <Button 
                type="link" 
                icon={<ArrowRightOutlined />} 
                onClick={() => setCurrentView(type.key as any)}
              >
                进入{type.label}管理页面
              </Button>
            </div>
          </TabPane>
        ))}
      </Tabs>

      <Modal
        title="添加新提示词"
        open={isModalVisible}
        onOk={addNewPrompt}
        onCancel={() => {
          setIsModalVisible(false)
          setNewPromptKey('')
          setNewPromptValue('')
        }}
        width={800}
      >
        <Form layout="vertical">
          <Form.Item label="提示词类型">
            <Select
              value={newPromptType}
              onChange={setNewPromptType}
              options={outlineTypes.map(t => ({ label: t.label, value: t.key }))}
            />
          </Form.Item>
          <Form.Item label="提示词名称">
            <Input
              value={newPromptKey}
              onChange={(e) => setNewPromptKey(e.target.value)}
              placeholder="请输入提示词名称..."
            />
          </Form.Item>
          <Form.Item label="提示词内容">
            <TextArea
              value={newPromptValue}
              onChange={(e) => setNewPromptValue(e.target.value)}
              rows={15}
              placeholder="请输入提示词内容..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {editingPrompt && (
        <Modal
          title={`编辑提示词`}
          open={!!editingPrompt}
          onOk={() => saveOutlinePrompt(editingPrompt.type, editingPrompt.key, editingPrompt.value)}
          onCancel={() => setEditingPrompt(null)}
          width={800}
        >
          <Form layout="vertical">
            <Form.Item label="提示词名称">
              <Input value={editingPrompt.key} disabled />
            </Form.Item>
            <Form.Item label="提示词内容">
              <TextArea
                value={editingPrompt.value}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, value: e.target.value })}
                rows={15}
                placeholder="请输入提示词内容..."
              />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </Card>
  )
}
