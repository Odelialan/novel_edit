'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, Tabs, Form, Input, Button, Space, message, Modal, Popconfirm, Tag, Select, Divider, Typography } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined, SaveOutlined, CopyOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import AIPromptCharacterManager from './ai-prompts/AIPromptCharacterManager'
import AIPromptOutlineManager from './ai-prompts/AIPromptOutlineManager'
import AIPromptOutlineSettings from './ai-prompts/AIPromptOutlineSettings'
import AIPromptOverview from './ai-prompts/AIPromptOverview'
import AIPromptOutlineWriting from './ai-prompts/AIPromptOutlineWriting'

const { TextArea } = Input
const { TabPane } = Tabs
const { Title, Text } = Typography

interface PromptData {
  [key: string]: any
}

interface AIPromptManagerProps {
  novelId?: string
  onPromptSelect?: (prompt: string, type: string) => void
}

export default function AIPromptManager({ novelId, onPromptSelect }: AIPromptManagerProps) {
  const { token } = useAuthStore()
  const [prompts, setPrompts] = useState<PromptData>({})
  const [loading, setLoading] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<{ key: string; value: string; type: string } | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [newPromptKey, setNewPromptKey] = useState('')
  const [newPromptValue, setNewPromptValue] = useState('')
  const [newPromptType, setNewPromptType] = useState('expand')
  const [currentView, setCurrentView] = useState<'main' | 'character' | 'outline' | 'overview' | 'outline_writing'>('main')
  
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])

  useEffect(() => {
    if (currentView === 'main') {
      loadPrompts()
    }
  }, [novelId, token, currentView])

  const loadPrompts = async () => {
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
          setPrompts(result.data?.prompts || {})
        }
      }
    } catch (error) {
      message.error('加载提示词失败')
    } finally {
      setLoading(false)
    }
  }

  const savePrompt = async (key: string, value: string, type: string) => {
    try {
      const scope = novelId ? 'novel' : 'global'
      const url = `/api/utils/prompts?scope=${scope}${novelId ? `&novel_id=${encodeURIComponent(novelId)}` : ''}`
      
      const payload = type === 'character' 
        ? { character: { [key]: value } }
        : { [type]: { [key]: value } }
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      
      if (response.ok) {
        message.success('保存成功')
        loadPrompts()
        setEditingPrompt(null)
      } else {
        message.error('保存失败')
      }
    } catch (error) {
      message.error('保存失败')
    }
  }

  const deletePrompt = async (key: string, type: string) => {
    try {
      const scope = novelId ? 'novel' : 'global'
      const url = `/api/utils/prompts?scope=${scope}${novelId ? `&novel_id=${encodeURIComponent(novelId)}` : ''}&prompt_keys=${encodeURIComponent(key)}`
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers
      })
      
      if (response.ok) {
        message.success('删除成功')
        loadPrompts()
      } else {
        message.error('删除失败')
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  const addNewPrompt = async () => {
    if (!newPromptKey.trim() || !newPromptValue.trim()) {
      message.warning('请填写完整的提示词信息')
      return
    }
    
    try {
      const scope = novelId ? 'novel' : 'global'
      const url = `/api/utils/prompts?scope=${scope}${novelId ? `&novel_id=${encodeURIComponent(novelId)}` : ''}`
      
      const payload = newPromptType === 'character' 
        ? { character: { [newPromptKey]: newPromptValue } }
        : { [newPromptType]: { [newPromptKey]: newPromptValue } }
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      
      if (response.ok) {
        message.success('添加成功')
        loadPrompts()
        setIsModalVisible(false)
        setNewPromptKey('')
        setNewPromptValue('')
        setNewPromptType('expand')
      } else {
        message.error('添加失败')
      }
    } catch (error) {
      message.error('添加失败')
    }
  }

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt)
    message.success('已复制到剪贴板')
  }

  const renderPromptEditor = (key: string, value: string, type: string) => (
    <div key={key} style={{ marginBottom: 16, padding: 16, border: '1px solid #d9d9d9', borderRadius: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Tag color="blue">{key}</Tag>
        <Space>
          <Button 
            size="small" 
            icon={<CopyOutlined />} 
            onClick={() => copyPrompt(value)}
          >
            复制
          </Button>
          {onPromptSelect && (
            <Button 
              size="small" 
              type="primary" 
              onClick={() => onPromptSelect(value, type)}
            >
              使用
            </Button>
          )}
          <Button 
            size="small" 
            icon={<EditOutlined />} 
            onClick={() => setEditingPrompt({ key, value, type })}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个提示词吗？"
            onConfirm={() => deletePrompt(key, type)}
            okText="确定"
            cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      </div>
      
      {editingPrompt?.key === key ? (
        <div>
          <TextArea
            value={editingPrompt.value}
            onChange={(e) => setEditingPrompt({ ...editingPrompt, value: e.target.value })}
            rows={6}
            style={{ marginBottom: 8 }}
          />
          <Space>
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={() => savePrompt(key, editingPrompt.value, type)}
            >
              保存
            </Button>
            <Button onClick={() => setEditingPrompt(null)}>
              取消
            </Button>
          </Space>
        </div>
      ) : (
        <div style={{ 
          background: '#f5f5f5', 
          padding: 12, 
          borderRadius: 4, 
          maxHeight: 200, 
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          fontSize: '12px'
        }}>
          {value}
        </div>
      )}
    </div>
  )

  const renderPromptSection = (title: string, data: any, type: string) => {
    if (!data) return null
    
    // 如果data是字符串，直接显示
    if (typeof data === 'string') {
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px 24px 16px 24px', flexShrink: 0, borderBottom: '1px solid #f0f0f0' }}>
            <Title level={4} style={{ margin: 0 }}>{title}</Title>
          </div>
          <div className="ai-prompt-scrollbar" style={{ 
            flex: 1,
            overflowY: 'auto', 
            overflowX: 'hidden',
            padding: '24px'
          }}>
            {renderPromptEditor('default', data, type)}
          </div>
        </div>
      )
    }
    
    // 如果data不是对象，返回null
    if (typeof data !== 'object') return null
    
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 24px 16px 24px', flexShrink: 0, borderBottom: '1px solid #f0f0f0' }}>
          <Title level={4} style={{ margin: 0 }}>{title}</Title>
        </div>
        <div className="ai-prompt-scrollbar" style={{ 
          flex: 1,
          overflowY: 'auto', 
          overflowX: 'hidden',
          padding: '24px'
        }}>
          {Object.entries(data).map(([key, value]) => 
            renderPromptEditor(key, value as string, type)
          )}
        </div>
      </div>
    )
  }

  // 渲染角色设计页面
  if (currentView === 'character') {
    return (
      <AIPromptCharacterManager 
        novelId={novelId}
        onBack={() => setCurrentView('main')}
      />
    )
  }

  if (currentView === 'outline') {
    return (
      <AIPromptOutlineManager 
        novelId={novelId}
        onBack={() => setCurrentView('main')}
      />
    )
  }

  if (currentView === 'outline_writing') {
    return (
      <AIPromptOutlineWriting 
        novelId={novelId}
        onBack={() => setCurrentView('main')}
      />
    )
  }

  // 渲染总览页面
  if (currentView === 'overview') {
    return (
      <AIPromptOverview 
        novelId={novelId}
        onBack={() => setCurrentView('main')}
      />
    )
  }

  // 渲染主页面
  return (
    <div
      className="ai-prompt-root"
      style={{
        height: '100%',            // 依赖父级（MainApp Content + wrapper）的高度
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
        maxWidth: '1200px',        // 适中的最大宽度，不限制太严格
        margin: '0 auto',          // 居中显示
        width: '100%'              // 充分利用可用空间
      }}
    >
      <Card
        title="AI提示词管理"
        loading={loading}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
        styles={{
          body: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            minHeight: 0
          }
        }}
      >
        <div style={{ padding: '16px 24px', flexShrink: 0, borderBottom: '1px solid #f0f0f0' }}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setIsModalVisible(true)}
          >
            添加新提示词
          </Button>
          <Text style={{ marginLeft: 16, color: '#666' }}>
            {novelId ? '小说级提示词（仅当前小说可见）' : '全局提示词（所有小说可见）'}
          </Text>
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Tabs 
            defaultActiveKey="expand"
            style={{ height: '100%' }}
            tabBarStyle={{ marginBottom: 0, padding: '0 24px' }}
          >
        <TabPane tab="扩写提示词" key="expand">
          {renderPromptSection('扩写提示词', prompts.expand, 'expand')}
        </TabPane>
        
        <TabPane tab="润色提示词" key="polish">
          {renderPromptSection('润色提示词', prompts.polish, 'polish')}
        </TabPane>
        
        <TabPane tab="章节概要" key="summary">
          {renderPromptSection('章节概要提示词', prompts.summary, 'summary')}
        </TabPane>
        
        <TabPane tab="全文概要" key="full_summary">
          {renderPromptSection('全文概要提示词', prompts.full_summary, 'full_summary')}
        </TabPane>
        
        <TabPane tab="世界观提示词" key="world">
          {renderPromptSection('世界观提示词', prompts.world, 'world')}
        </TabPane>
        
        <TabPane tab="灵感提示词" key="inspiration">
          {renderPromptSection('灵感提示词', prompts.inspiration, 'inspiration')}
        </TabPane>
        
        <TabPane 
          tab={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              角色设计
              <Button 
                type="text" 
                size="small" 
                icon={<ArrowRightOutlined />} 
                onClick={() => setCurrentView('character')}
                style={{ marginLeft: 8 }}
              >
                进入
              </Button>
            </div>
          } 
          key="character"
        >
          <div style={{ height: 'calc(100% - 40px)', overflow: 'hidden' }}>
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Title level={4}>角色设计提示词管理</Title>
              <Text type="secondary">点击上方"进入"按钮进入角色设计管理页面</Text>
              <br />
              <Button 
                type="primary" 
                icon={<ArrowRightOutlined />} 
                onClick={() => setCurrentView('character')}
                style={{ marginTop: 16 }}
              >
                进入角色设计管理
              </Button>
            </div>
          </div>
        </TabPane>
        
        <TabPane tab="大纲编写" key="outline_writing">
          <div className="ai-prompt-scrollbar" style={{ height: '100%', overflow: 'auto' }}>
            <AIPromptOutlineWriting 
              novelId={novelId}
              onBack={() => setCurrentView('main')}
            />
          </div>
        </TabPane>
        
        <TabPane 
          tab={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              大纲生成
              <Button 
                type="text" 
                size="small" 
                icon={<ArrowRightOutlined />} 
                onClick={() => setCurrentView('outline')}
                style={{ marginLeft: 8 }}
              >
                进入
              </Button>
            </div>
          } 
          key="outline"
        >
          <div className="ai-prompt-scrollbar" style={{ height: '100%', overflow: 'auto' }}>
            {(currentView as string) === 'outline' ? (
              <AIPromptOutlineSettings 
                novelId={novelId} 
                onBack={() => setCurrentView('main')}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Title level={4}>大纲生成提示词管理</Title>
                <Text type="secondary">点击上方"进入"按钮进入大纲生成管理页面</Text>
                <br />
                <Button 
                  type="primary" 
                  icon={<ArrowRightOutlined />} 
                  onClick={() => setCurrentView('outline')}
                  style={{ marginTop: 16 }}
                >
                  进入大纲生成管理
                </Button>
              </div>
            )}
          </div>
        </TabPane>
        
        <TabPane 
          tab={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              总览
              <Button 
                type="text" 
                size="small" 
                icon={<ArrowRightOutlined />} 
                onClick={() => setCurrentView('overview')}
                style={{ marginLeft: 8 }}
              >
                进入
              </Button>
            </div>
          } 
          key="overview"
        >
          <div className="ai-prompt-scrollbar" style={{ height: '100%', overflow: 'auto' }}>
            {(currentView as string) === 'overview' ? (
              <AIPromptOverview 
                novelId={novelId} 
                onBack={() => setCurrentView('main')}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Title level={4}>AI提示词总览</Title>
                <Text type="secondary">点击上方"进入"按钮查看风格提示词总览</Text>
                <br />
                <Button 
                  type="primary" 
                  icon={<ArrowRightOutlined />} 
                  onClick={() => setCurrentView('overview')}
                  style={{ marginTop: 16 }}
                >
                  进入总览页面
                </Button>
              </div>
            )}
          </div>
        </TabPane>
          </Tabs>
        </div>
      </Card>

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
                { label: '扩写提示词', value: 'expand' },
                { label: '润色提示词', value: 'polish' },
                { label: '章节概要提示词', value: 'summary' },
                { label: '全文概要提示词', value: 'full_summary' },
                { label: '世界观提示词', value: 'world' },
                { label: '灵感提示词', value: 'inspiration' },
                { label: '风格提示词', value: 'styles' }
              ]}
            />
          </Form.Item>
          
          <Form.Item label="提示词键名" required>
            <Input
              value={newPromptKey}
              onChange={(e) => setNewPromptKey(e.target.value)}
              placeholder="请输入提示词键名，如：sentence、paragraph等"
            />
          </Form.Item>
          
          <Form.Item label="提示词内容" required>
            <TextArea
              value={newPromptValue}
              onChange={(e) => setNewPromptValue(e.target.value)}
              rows={8}
              placeholder="请输入提示词内容，支持Markdown格式"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}


