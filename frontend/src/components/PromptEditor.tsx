'use client'

import { useState, useEffect } from 'react'
import { Card, Button, Space, Input, message, Typography, Tabs } from 'antd'
import { EditOutlined, CopyOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { TextArea } = Input
const { Text } = Typography

interface PromptEditorProps {
  novelId?: string
  promptType: 'world' | 'outline' | 'character' | 'expand' | 'polish' | 'summary'
  promptKey?: string
  onPromptChange?: (prompt: string) => void
}

export default function PromptEditor({ 
  novelId, 
  promptType, 
  promptKey = 'default',
  onPromptChange 
}: PromptEditorProps) {
  const { token } = useAuthStore()
  const [promptTemplate, setPromptTemplate] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPrompt()
  }, [novelId, token, promptType, promptKey])

  const loadPrompt = async () => {
    try {
      setLoading(true)
      const headers = { 'Authorization': `Bearer ${token}` }
      const scope = novelId ? 'novel' : 'global'
      const url = novelId 
        ? `/api/utils/prompts?scope=${scope}&novel_id=${encodeURIComponent(novelId)}`
        : `/api/utils/prompts?scope=${scope}`
      
      const response = await fetch(url, { headers })
      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          const prompts = result.data?.prompts || {}
          let prompt = ''
          
          switch (promptType) {
            case 'world':
              prompt = prompts.world?.random || ''
              break
            case 'outline':
              prompt = prompts.outline?.[promptKey] || ''
              break
            case 'character':
              prompt = prompts.character?.[promptKey] || ''
              break
            case 'expand':
              prompt = prompts.expand?.sentence || ''
              break
            case 'polish':
              prompt = prompts.polish?.sentence || ''
              break
            case 'summary':
              prompt = prompts.summary?.chapter || ''
              break
          }
          
          setPromptTemplate(prompt)
          onPromptChange?.(prompt)
        }
      }
    } catch (error) {
      console.error('加载提示词失败:', error)
      message.error('加载提示词失败')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setEditingPrompt(promptTemplate)
    setIsEditing(true)
  }

  const handleSave = () => {
    setPromptTemplate(editingPrompt)
    setIsEditing(false)
    onPromptChange?.(editingPrompt)
    message.success('提示词已更新')
  }

  const handleCancel = () => {
    setEditingPrompt(promptTemplate)
    setIsEditing(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(promptTemplate)
    message.success('已复制到剪贴板')
  }

  const handleReload = () => {
    loadPrompt()
  }

  if (loading) {
    return (
      <Card size="small" loading>
        <div style={{ height: 200 }} />
      </Card>
    )
  }

  if (!promptTemplate) {
    return (
      <Card size="small">
        <div className="text-center text-gray-500 py-8">
          <Text>暂无提示词模板</Text>
          <br />
          <Button size="small" onClick={handleReload} className="mt-2">
            重新加载
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card 
      size="small"
      title={
        <div className="flex justify-between items-center">
          <Text strong>提示词模板</Text>
          <Space>
            <Button 
              size="small" 
              icon={<ReloadOutlined />}
              onClick={handleReload}
            >
              刷新
            </Button>
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={handleEdit}
            >
              编辑
            </Button>
            <Button 
              size="small" 
              icon={<CopyOutlined />}
              onClick={handleCopy}
            >
              复制
            </Button>
          </Space>
        </div>
      }
    >
      {isEditing ? (
        <div>
          <TextArea
            value={editingPrompt}
            onChange={(e) => setEditingPrompt(e.target.value)}
            rows={12}
            className="mb-3"
            placeholder="请输入提示词模板..."
          />
          <Space>
            <Button 
              size="small" 
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
            >
              保存
            </Button>
            <Button 
              size="small"
              onClick={handleCancel}
            >
              取消
            </Button>
          </Space>
        </div>
      ) : (
        <div 
          className="text-xs text-gray-600 whitespace-pre-wrap max-h-64 overflow-y-auto p-2 bg-gray-50 rounded"
          style={{ minHeight: 100 }}
        >
          {promptTemplate}
        </div>
      )}
    </Card>
  )
}
