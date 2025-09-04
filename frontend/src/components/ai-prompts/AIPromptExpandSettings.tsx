'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, Segmented, Form, Input, Button, Space, message } from 'antd'
import { SettingOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

export default function AIPromptExpandSettings() {
  const { token } = useAuthStore()
  const [scope, setScope] = useState<'global' | 'novel'>('global')
  const [novelId, setNovelId] = useState<string>('')
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])

  useEffect(() => { load() }, [scope, novelId])

  const load = async () => {
    if (scope === 'novel' && !novelId) { form.resetFields(); return }
    setLoading(true)
    try {
      const params = new URLSearchParams({ scope })
      if (scope === 'novel') params.set('novel_id', novelId)
      const res = await fetch(`/api/utils/prompts?${params.toString()}`, { headers })
      if (res.ok) {
        const result = await res.json()
        console.log('API Response:', result) // 调试信息
        if (result.ok) {
          const data = result.data?.prompts || {}
          console.log('Prompts data:', data) // 调试信息
          console.log('Expand data:', data.expand) // 调试信息
          
          // 设置表单值
          const formData = {
            expand_sentence: data.expand?.sentence || '',
            expand_paragraph: data.expand?.paragraph || '',
          }
          console.log('Setting form data:', formData) // 调试信息
          form.setFieldsValue(formData)
          
          // 如果没有数据，显示提示
          if (!data.expand?.sentence && !data.expand?.paragraph) {
            message.info('未找到提示词数据，将使用默认值')
          }
        } else {
          message.error(result.error?.msg || '加载失败')
        }
      } else {
        message.error('请求失败')
      }
    } catch (error) {
      console.error('Load error:', error) // 调试信息
      message.error('加载提示词失败')
    } finally { 
      setLoading(false) 
    }
  }

  const save = async () => {
    try {
      const values = await form.validateFields()
      console.log('Saving values:', values) // 调试信息
      
      const structured = { 
        expand: { 
          sentence: values.expand_sentence, 
          paragraph: values.expand_paragraph 
        } 
      }
      
      // 构建查询参数
      const params = new URLSearchParams({ scope })
      if (scope === 'novel' && novelId) {
        params.set('novel_id', novelId)
      }
      
      const res = await fetch(`/api/utils/prompts?${params.toString()}`, { 
        method: 'POST', 
        headers, 
        body: JSON.stringify(structured)
      })
      
      if (res.ok) {
        const result = await res.json()
        if (result.ok) {
          message.success('已保存')
          // 重新加载以确保数据同步
          await load()
        } else {
          message.error(result.error?.msg || '保存失败')
        }
      } else {
        message.error('保存请求失败')
      }
    } catch (error) {
      console.error('Save error:', error) // 调试信息
      message.error('保存失败')
    }
  }

  return (
    <Card
      title={<span><SettingOutlined className="mr-2" />AI 提示词 · 扩写</span>}
      extra={
        <Space>
          <Segmented 
            options={[{ label: '全局', value: 'global' }, { label: '小说', value: 'novel' }]} 
            value={scope} 
            onChange={(v) => setScope(v as any)} 
          />
          {scope === 'novel' && (
            <Input 
              placeholder="小说ID（slug）" 
              value={novelId} 
              onChange={(e) => setNovelId(e.target.value)} 
            />
          )}
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={save}>保存</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item 
          name="expand_sentence" 
          label="句子扩写"
          rules={[{ required: true, message: '请输入句子扩写提示词' }]}
        >
          <Input.TextArea 
            autoSize={{ minRows: 12, maxRows: 60 }} 
            placeholder="请输入句子扩写的AI提示词模板..."
          />
        </Form.Item>
        <Form.Item 
          name="expand_paragraph" 
          label="段落扩写"
          rules={[{ required: true, message: '请输入段落扩写提示词' }]}
        >
          <Input.TextArea 
            autoSize={{ minRows: 12, maxRows: 60 }} 
            placeholder="请输入段落扩写的AI提示词模板..."
          />
        </Form.Item>
      </Form>
    </Card>
  )
}


