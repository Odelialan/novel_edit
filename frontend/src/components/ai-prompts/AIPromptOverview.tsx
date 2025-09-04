'use client'

import { useEffect, useState } from 'react'
import { Card, Form, Input, Button, Space, message, Typography, Breadcrumb } from 'antd'
import { SettingOutlined, SaveOutlined, ReloadOutlined, EditOutlined, CopyOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { TextArea } = Input
const { Title, Text } = Typography

interface StylePromptData {
  [key: string]: any
}

interface AIPromptOverviewProps {
  novelId?: string
  onBack?: () => void
}

export default function AIPromptOverview({ novelId, onBack }: AIPromptOverviewProps) {
  const { token } = useAuthStore()
  const [stylePrompts, setStylePrompts] = useState<StylePromptData>({})
  const [loading, setLoading] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<{ key: string; value: string } | null>(null)
  
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    loadStylePrompts()
  }, [token])

  const loadStylePrompts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/utils/prompts?scope=global', { headers })
      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          setStylePrompts(result.data?.prompts?.styles || {})
        }
      }
    } catch (error) {
      message.error('加载风格提示词失败')
    } finally {
      setLoading(false)
    }
  }

  const saveStylePrompt = async (key: string, value: string) => {
    try {
      const payload = { styles: { [key]: value } }
      
      const response = await fetch('/api/utils/prompts?scope=global', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      
      if (response.ok) {
        message.success('保存成功')
        loadStylePrompts()
        setEditingPrompt(null)
      } else {
        message.error('保存失败')
      }
    } catch (error) {
      message.error('保存失败')
    }
  }

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt)
    message.success('已复制到剪贴板')
  }

  const renderPromptEditor = (key: string, value: string) => (
    <div key={key} style={{ marginBottom: 16, padding: 16, border: '1px solid #d9d9d9', borderRadius: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong style={{ color: '#1890ff' }}>{key}</Text>
        <Space>
          <Button 
            size="small" 
            icon={<CopyOutlined />} 
            onClick={() => copyPrompt(value)}
          >
            复制
          </Button>
          <Button 
            size="small" 
            icon={<EditOutlined />} 
            onClick={() => setEditingPrompt({ key, value })}
          >
            编辑
          </Button>
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
              onClick={() => saveStylePrompt(key, editingPrompt.value)}
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
          fontSize: '12px',
          lineHeight: '1.6'
        }}>
          {value}
        </div>
      )}
    </div>
  )

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <SettingOutlined className="mr-2" />
          <span>AI提示词 · 总览</span>
        </div>
      }
              extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadStylePrompts} loading={loading}>
              刷新
            </Button>
            {onBack && (
              <Button icon={<ReloadOutlined />} onClick={onBack}>
                返回
              </Button>
            )}
          </Space>
        }
      loading={loading}
    >
      <Breadcrumb 
        style={{ marginBottom: 16 }}
        items={[
          { title: 'AI提示词管理' },
          { title: '总览' }
        ]}
      />

      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          全局风格提示词（所有小说可见）
        </Text>
      </div>

      <Title level={4}>风格提示词</Title>
      {Object.entries(stylePrompts).length > 0 ? (
        Object.entries(stylePrompts).map(([key, value]) => 
          renderPromptEditor(key, value as string)
        )
      ) : (
        <Text type="secondary">暂无风格提示词数据</Text>
      )}
    </Card>
  )
}
