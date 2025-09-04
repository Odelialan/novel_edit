'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, Segmented, Form, Input, Button, Space, message } from 'antd'
import { SettingOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

export default function AIPromptInspirationSettings() {
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
          form.setFieldsValue({ inspiration: data.inspiration })
        }
      }
    } catch { message.error('加载提示词失败') }
    finally { setLoading(false) }
  }

  const save = async () => {
    try {
      const values = await form.validateFields()
      const structured = { inspiration: values.inspiration }
      
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
      title={<span><SettingOutlined className="mr-2" />AI 提示词 · 灵感</span>}
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
        <Form.Item name="inspiration" label="主体故事灵感">
          <Input.TextArea rows={5} />
        </Form.Item>
      </Form>
    </Card>
  )
}


