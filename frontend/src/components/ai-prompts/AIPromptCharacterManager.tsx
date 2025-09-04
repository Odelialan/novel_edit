'use client'

import { useEffect, useState } from 'react'
import { Card, Tabs, Form, Input, Button, Space, message, Typography, Breadcrumb } from 'antd'
import { EditOutlined, SaveOutlined, CopyOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { TextArea } = Input
const { TabPane } = Tabs
const { Title, Text } = Typography

interface CharacterPromptData {
  [key: string]: any
}

interface AIPromptCharacterManagerProps {
  novelId?: string
  onBack?: () => void
}

export default function AIPromptCharacterManager({ novelId, onBack }: AIPromptCharacterManagerProps) {
  const { token } = useAuthStore()
  const [characterPrompts, setCharacterPrompts] = useState<CharacterPromptData>({})
  const [loading, setLoading] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<{ key: string; value: string; character: string } | null>(null)
  const [activeCharacter, setActiveCharacter] = useState<string>('女主角')
  
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

  const characterTypes = [
    { key: '女主角', label: '女主角' },
    { key: '男主角', label: '男主角' },
    { key: '女二', label: '女二' },
    { key: '男二', label: '男二' },
    { key: '配角', label: '配角' },
    { key: '反派', label: '反派' }
  ]

  useEffect(() => {
    loadCharacterPrompts()
  }, [novelId, token])

  const loadCharacterPrompts = async () => {
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
          setCharacterPrompts(result.data?.prompts?.character || {})
        }
      }
    } catch (error) {
      message.error('加载角色提示词失败')
    } finally {
      setLoading(false)
    }
  }

  const saveCharacterPrompt = async (character: string, key: string, value: string) => {
    try {
      const scope = novelId ? 'novel' : 'global'
      const url = `/api/utils/prompts?scope=${scope}${novelId ? `&novel_id=${encodeURIComponent(novelId)}` : ''}`
      
      const payload = { character: { [character]: { [key]: value } } }
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      
      if (response.ok) {
        message.success('保存成功')
        loadCharacterPrompts()
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

  const renderPromptEditor = (key: string, value: string, character: string) => (
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
            onClick={() => setEditingPrompt({ key, value, character })}
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
            rows={8}
            style={{ marginBottom: 8 }}
          />
          <Space>
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={() => saveCharacterPrompt(character, key, editingPrompt.value)}
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
          maxHeight: 300, 
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

  const renderCharacterTab = (character: string) => {
    const characterData = characterPrompts[character]
    if (!characterData) return <Text type="secondary">暂无数据</Text>
    
    return (
      <div>
        <Title level={4}>{character}提示词</Title>
        {Object.entries(characterData).map(([key, value]) => 
          renderPromptEditor(key, value as string, character)
        )}
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
          <span>角色设计提示词管理</span>
        </div>
      }
      loading={loading}
    >
      <Breadcrumb 
        style={{ marginBottom: 16 }}
        items={[
          { title: 'AI提示词管理' },
          { title: '角色设计' },
          { title: activeCharacter }
        ]}
      />

      <Tabs 
        defaultActiveKey="女主角" 
        onChange={setActiveCharacter}
        items={characterTypes.map(char => ({
          key: char.key,
          label: char.label,
          children: renderCharacterTab(char.key)
        }))}
      />
    </Card>
  )
}
