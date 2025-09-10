'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, Button, Space, Typography, Breadcrumb, Tabs, Input, Modal, Form, Select, App } from 'antd'
import { SettingOutlined, ReloadOutlined, ArrowLeftOutlined, PlusOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { Title, Text } = Typography
const { TextArea } = Input
const { TabPane } = Tabs

interface OutlineWritingPromptData {
  [key: string]: {
    random: string
    targeted: string
  }
}

interface AIPromptOutlineWritingProps {
  novelId?: string
  onBack?: () => void
}

export default function AIPromptOutlineWriting({ novelId, onBack }: AIPromptOutlineWritingProps) {
  const { message } = App.useApp()
  const { token, isAuthenticated } = useAuthStore()
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])
  const [loading, setLoading] = useState(false)
  const [outlineWritingPrompts, setOutlineWritingPrompts] = useState<OutlineWritingPromptData>({})
  const [editingPrompt, setEditingPrompt] = useState<{ key: string; type: string; value: string } | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [newPromptKey, setNewPromptKey] = useState('')
  const [newPromptValue, setNewPromptValue] = useState('')
  const [newPromptType, setNewPromptType] = useState('random')
  const [activeTab, setActiveTab] = useState<string>('story_background')
  
  const outlineWritingTypes = [
    { key: 'story_background', label: '故事背景设定' },
    { key: 'power_system', label: '力量体系' },
    { key: 'history_background', label: '历史背景' },
    { key: 'story_timeline', label: '故事发生时间' },
    { key: 'story_location', label: '故事发生地点' },
    { key: 'main_plot', label: '故事主线' },
    { key: 'story_summary', label: '故事内容简介' },
    { key: 'volume_summary', label: '分卷内容简介' },
    { key: 'chapter_summary', label: '分章内容简介' }
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
    loadOutlineWritingPrompts()
  }, [token])

  const loadOutlineWritingPrompts = async () => {
    try {
      setLoading(true)
      const scope = novelId ? 'novel' : 'global'
      const url = novelId 
        ? `/api/utils/prompts?scope=${scope}&novel_id=${encodeURIComponent(novelId)}`
        : `/api/utils/prompts?scope=${scope}`
      
      const response = await fetch(url, { headers })
      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          const outlineData = result.data?.prompts?.outline || {}
          console.log('大纲提示词数据:', outlineData)
          // 将outline数据转换为outline_writing格式
          const outlineWritingData = {}
          Object.keys(outlineData).forEach(key => {
            outlineWritingData[key] = {
              random: outlineData[key],
              targeted: outlineData[key] // 使用相同的内容作为targeted
            }
          })
          setOutlineWritingPrompts(outlineWritingData)
        }
      }
    } catch (error) {
      message.error('加载大纲编写提示词失败')
    } finally {
      setLoading(false)
    }
  }

  const saveOutlineWritingPrompt = async (key: string, type: string, value: string) => {
    try {
      const scope = novelId ? 'novel' : 'global'
      const url = novelId 
        ? `/api/utils/prompts?scope=${scope}&novel_id=${encodeURIComponent(novelId)}`
        : `/api/utils/prompts?scope=${scope}`
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          category: 'outline_writing',
          key,
          type,
          value
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          message.success('保存成功')
          setEditingPrompt(null)
          loadOutlineWritingPrompts()
        } else {
          message.error(result.message || '保存失败')
        }
      } else {
        message.error('保存失败')
      }
    } catch (error) {
      message.error('保存失败')
    }
  }

  const addNewPrompt = async () => {
    if (!newPromptKey || !newPromptValue) {
      message.error('请填写完整信息')
      return
    }

    try {
      const scope = novelId ? 'novel' : 'global'
      const url = novelId 
        ? `/api/utils/prompts?scope=${scope}&novel_id=${encodeURIComponent(novelId)}`
        : `/api/utils/prompts?scope=${scope}`
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          category: 'outline_writing',
          key: newPromptKey,
          type: newPromptType,
          value: newPromptValue
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          message.success('添加成功')
          setIsModalVisible(false)
          setNewPromptKey('')
          setNewPromptValue('')
          setNewPromptType('random')
          loadOutlineWritingPrompts()
        } else {
          message.error(result.message || '添加失败')
        }
      } else {
        message.error('添加失败')
      }
    } catch (error) {
      message.error('添加失败')
    }
  }

  const renderPromptEditor = (key: string, type: string, value: string) => {
    const isEditing = editingPrompt?.key === key && editingPrompt?.type === type
    
    if (isEditing) {
      return (
        <div key={`${key}-${type}`} style={{ marginBottom: 16, padding: 16, border: '1px solid #d9d9d9', borderRadius: 6 }}>
          <div style={{ marginBottom: 8 }}>
            <Text strong>{type === 'random' ? '随机生成' : '定向生成'}</Text>
          </div>
          <TextArea
            rows={8}
            value={editingPrompt.value}
            onChange={(e) => setEditingPrompt({ ...editingPrompt, value: e.target.value })}
            style={{ marginBottom: 8 }}
          />
          <Space>
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={() => saveOutlineWritingPrompt(key, type, editingPrompt.value)}
            >
              保存
            </Button>
            <Button onClick={() => setEditingPrompt(null)}>
              取消
            </Button>
          </Space>
        </div>
      )
    }

    return (
      <div key={`${key}-${type}`} style={{ marginBottom: 16, padding: 16, border: '1px solid #d9d9d9', borderRadius: 6 }}>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>{type === 'random' ? '随机生成' : '定向生成'}</Text>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => setEditingPrompt({ key, type, value })}
          >
            编辑
          </Button>
        </div>
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: 12, 
          borderRadius: 4, 
          maxHeight: 200, 
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          fontSize: '12px'
        }}>
          {value}
        </div>
      </div>
    )
  }

  const renderOutlineWritingTab = (outlineWritingType: string) => {
    const outlineWritingData = outlineWritingPrompts[outlineWritingType]
    if (!outlineWritingData) return <Text type="secondary">暂无数据</Text>
    
    return (
      <div>
        <Title level={4}>{outlineWritingTypes.find(t => t.key === outlineWritingType)?.label}提示词</Title>
        {renderPromptEditor(outlineWritingType, 'random', outlineWritingData.random || '')}
        {renderPromptEditor(outlineWritingType, 'targeted', outlineWritingData.targeted || '')}
      </div>
    )
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {onBack && (
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={onBack}
              style={{ marginRight: 8 }}
            />
          )}
          <SettingOutlined className="mr-2" />
          <span>AI提示词 · 大纲编写</span>
        </div>
      }
      extra={
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
            添加新提示词
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadOutlineWritingPrompts} loading={loading}>
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
          { title: '大纲编写' },
          { title: outlineWritingTypes.find(t => t.key === activeTab)?.label }
        ]}
      />

      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          {novelId ? '小说级大纲编写提示词（仅当前小说可见）' : '全局大纲编写提示词（所有小说可见）'}
        </Text>
      </div>

      <Tabs 
        defaultActiveKey="story_background" 
        onChange={setActiveTab}
        items={outlineWritingTypes.map(type => ({
          key: type.key,
          label: type.label,
          children: renderOutlineWritingTab(type.key)
        }))}
      />

      {/* 添加新提示词对话框 */}
      <Modal
        title="添加新提示词"
        open={isModalVisible}
        onOk={addNewPrompt}
        onCancel={() => setIsModalVisible(false)}
        okText="添加"
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="提示词类型" required>
            <Select
              value={newPromptType}
              onChange={setNewPromptType}
              options={[
                { label: '随机生成', value: 'random' },
                { label: '定向生成', value: 'targeted' }
              ]}
            />
          </Form.Item>
          <Form.Item label="提示词内容" required>
            <TextArea
              rows={8}
              value={newPromptValue}
              onChange={(e) => setNewPromptValue(e.target.value)}
              placeholder="请输入提示词内容..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
