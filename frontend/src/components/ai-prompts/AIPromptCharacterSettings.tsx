'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, Tabs, Form, Input, Button, Space, Typography, Breadcrumb, App } from 'antd'
import { SettingOutlined, SaveOutlined, ReloadOutlined, EditOutlined, CopyOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { TextArea } = Input
const { Title, Text } = Typography

interface CharacterPromptData {
  [key: string]: any
}

export default function AIPromptCharacterSettings() {
  const { token, isAuthenticated } = useAuthStore()
  const { message } = App.useApp()
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])
  const [loading, setLoading] = useState(false)
  const [characterPrompts, setCharacterPrompts] = useState<CharacterPromptData>({})
  const [editingPrompt, setEditingPrompt] = useState<{ key: string; value: string; character: string } | null>(null)
  const [activeCharacter, setActiveCharacter] = useState<string>('女主角')
  
  // 添加调试信息
  console.log('AIPromptCharacterSettings 认证状态:', {
    isAuthenticated,
    token: token ? `${token.substring(0, 20)}...` : 'null',
    headers
  })
  
  const characterTypes = [
    { key: '女主角', label: '女主角' },
    { key: '男主角', label: '男主角' },
    { key: '女二', label: '女二' },
    { key: '男二', label: '男二' },
    { key: '配角', label: '配角' },
    { key: '反派', label: '反派' }
  ]

  // 检查认证状态
  if (!isAuthenticated || !token) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>请先登录</h2>
        <p>您需要先登录才能管理AI提示词</p>
        <p>认证状态: {isAuthenticated ? '已认证' : '未认证'}</p>
        <p>Token: {token ? '存在' : '不存在'}</p>
      </div>
    )
  }

  useEffect(() => { 
    loadCharacterPrompts() 
  }, [token])

  const loadCharacterPrompts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/utils/prompts?scope=global', { headers })
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
      console.log('=== 保存提示词开始 ===')
      console.log('参数:', { character, key, value })
      console.log('认证状态:', { isAuthenticated, token: token ? '存在' : '不存在' })
      
      // 检查认证状态
      if (!token) {
        console.error('❌ Token不存在，无法发送请求')
        message.error('请先登录')
        return
      }
      
      // 构建正确的payload格式 - 只更新指定的字段
      const payload = { 
        character: { 
          [character]: { 
            [key]: value 
          } 
        } 
      }
      
      console.log('=== Payload详细信息 ===')
      console.log('character:', character)
      console.log('key:', key)
      console.log('value:', value)
      console.log('payload结构:', JSON.stringify(payload, null, 2))
      console.log('payload类型:', typeof payload)
      console.log('payload长度:', JSON.stringify(payload).length)
      
      // 使用绝对URL直接请求后端，绕过前端代理
      const url = 'http://localhost:8000/api/utils/prompts?scope=global'
      
      console.log('保存提示词请求:', {
        url,
        method: 'POST',
        headers,
        payload
      })
      
      console.log('✅ Token存在，开始发送请求')
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      
      console.log('保存提示词响应:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        url: response.url
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ 保存提示词成功:', result)
        message.success('保存成功')
        loadCharacterPrompts()
        setEditingPrompt(null)
      } else {
        const errorText = await response.text()
        console.error('❌ 保存失败:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        })
        message.error(`保存失败: ${response.status} ${response.statusText}`)
      }
    } catch (error: any) {
      console.error('❌ 保存提示词异常:', error)
      message.error(`保存异常: ${error.message}`)
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
    
    // 如果characterData是字符串，直接显示
    if (typeof characterData === 'string') {
      return (
        <div>
          <Title level={4}>{character}提示词</Title>
          {renderPromptEditor('default', characterData, character)}
        </div>
      )
    }
    
    // 如果characterData是对象，按原来的方式处理
    if (typeof characterData === 'object' && characterData !== null) {
      return (
        <div>
          <Title level={4}>{character}提示词</Title>
          {Object.entries(characterData).map(([key, value]) => 
            renderPromptEditor(key, value as string, character)
          )}
        </div>
      )
    }
    
    // 其他情况，显示错误信息
    return <Text type="secondary">数据格式错误</Text>
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <SettingOutlined className="mr-2" />
          <span>AI提示词 · 角色设计</span>
        </div>
      }
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadCharacterPrompts} loading={loading}>
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

