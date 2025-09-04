'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, Segmented, Form, Input, Button, Space, message } from 'antd'
import { SettingOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

export default function AIPromptWorldSettings() {
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
        if (result.ok) {
          const data = result.data?.prompts || {}
          form.setFieldsValue({ world_random: data.world?.random, world_targeted: data.world?.targeted })
        }
      }
    } catch { message.error('加载提示词失败') }
    finally { setLoading(false) }
  }

  const save = async () => {
    try {
      const values = await form.validateFields()
      const structured = { world: { random: values.world_random, targeted: values.world_targeted } }
      
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
        if (result.ok) message.success('已保存')
        else message.error(result.error?.msg || '保存失败')
      }
    } catch {}
  }

  return (
    <Card
      title={<span><SettingOutlined className="mr-2" />AI 提示词 · 世界观</span>}
      extra={
        <Space>
          <Segmented options={[{ label: '全局', value: 'global' }, { label: '小说', value: 'novel' }]} value={scope} onChange={(v) => setScope(v as any)} />
          {scope === 'novel' && (
            <Input placeholder="小说ID（slug）" value={novelId} onChange={(e) => setNovelId(e.target.value)} />
          )}
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={save}>保存</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item name="world_random" label="随机元素">
          <Input.TextArea autoSize={{ minRows: 12, maxRows: 60 }} />
        </Form.Item>
        <Form.Item name="world_targeted" label="定向细化">
          <Input.TextArea autoSize={{ minRows: 12, maxRows: 60 }} />
        </Form.Item>
      </Form>
    </Card>
  )
}


