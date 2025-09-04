'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, Form, Select, Button, Space, message, Input, Typography } from 'antd'
import { SendOutlined, UserOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { TextArea } = Input
const { Text } = Typography

interface CharacterItem {
  id: string
  name: string
  aliases: string[]
  gender?: string
  age?: number
  appearance?: string
  personality?: string
  relationships: Array<{ target: string; relation: string }>
  notes?: string
  novel_id: string
  created_at: string
  updated_at: string
  role_type?: string
  profile?: Record<string, any>
}

interface Props {
  novelId: string
  onApplied?: () => void
}

const ROLE_OPTIONS = [
  { label: '女主角', value: '女主角' },
  { label: '男主角', value: '男主角' },
  { label: '女二', value: '女二' },
  { label: '男二', value: '男二' },
  { label: '女三', value: '女三' },
  { label: '男三', value: '男三' },
  { label: '配角', value: '配角' }
]

export default function AICharacterPanel({ novelId, onApplied }: Props) {
  const { token } = useAuthStore()
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])
  const [form] = Form.useForm()
  const [items, setItems] = useState<CharacterItem[]>([])
  const [loading, setLoading] = useState(false)
  const [lastLog, setLastLog] = useState<string>('')

  useEffect(() => { loadCharacters() }, [novelId])

  const loadCharacters = async () => {
    try {
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/characters`, { headers })
      const j = await res.json()
      if (res.ok && j.ok) {
        setItems(j.data?.characters || [])
      }
    } catch {
      message.error('角色列表加载失败')
    }
  }

  const characterOptions = items.map((c) => ({ label: `${c.name}${c.role_type ? `（${c.role_type}）` : ''}`, value: c.id }))

  const mergeCharacter = (orig: CharacterItem, patch: any): CharacterItem => {
    const out: CharacterItem = { ...orig }
    // 顶层字段若为空则补齐
    out.role_type = out.role_type || patch.role_type
    out.appearance = out.appearance || patch.appearance
    out.personality = out.personality || patch.personality
    // profile 内各子键按需补齐
    const src = { ...(orig.profile || {}) }
    const add = (patch.profile || {}) as Record<string, any>
    for (const k of ['身份职业','家庭关系','早年经历','观念信仰','优点','缺点','成就','社会阶层','习惯嗜好']) {
      if (!src[k] && add[k]) src[k] = add[k]
    }
    out.profile = src
    return out
  }

  const run = async () => {
    try {
      const v = await form.validateFields()
      const ids: string[] = v.characters || []
      if (!ids.length) return message.warning('请先勾选角色')
      setLoading(true)
      let success = 0
      for (const id of ids) {
        const orig = items.find(i => i.id === id)
        if (!orig) continue
        const seed = {
          name: orig.name,
          aliases: orig.aliases,
          gender: orig.gender,
          age: orig.age,
          appearance: orig.appearance,
          personality: orig.personality,
          role_type: orig.role_type || v.role_type,
          profile: orig.profile
        }
        const resp = await fetch('/api/ai/character/generate', {
          method: 'POST', headers, body: JSON.stringify({ novel_id: novelId, role_type: v.role_type || orig.role_type, seed, story_info: v.story_info || '' })
        })
        const jr = await resp.json()
        if (resp.ok && jr.ok) {
          const patched = mergeCharacter(orig, jr.data?.profile || {})
          const put = await fetch(`/api/novels/${encodeURIComponent(novelId)}/characters/${encodeURIComponent(id)}`, {
            method: 'PUT', headers, body: JSON.stringify({
              name: patched.name,
              aliases: patched.aliases,
              gender: patched.gender,
              age: patched.age,
              appearance: patched.appearance,
              personality: patched.personality,
              relationships: patched.relationships || [],
              notes: patched.notes,
              role_type: patched.role_type,
              profile: patched.profile
            })
          })
          const j2 = await put.json()
          if (put.ok && j2.ok) success += 1
        }
      }
      setLastLog(`已补齐 ${success}/${ids.length} 个角色`)
      if (success > 0) {
        message.success(lastLog || '补齐完成')
        await loadCharacters()
        onApplied?.()
      }
    } catch {
      // 忽略
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="AI 生成角色设定" extra={<Button type="primary" icon={<SendOutlined />} onClick={run} loading={loading}>生成并补齐</Button>}>
      <Form form={form} layout="vertical">
        <Form.Item name="role_type" label="角色类型（若角色本身为空，则使用此处）">
          <Select options={ROLE_OPTIONS} allowClear placeholder="选择角色类型" />
        </Form.Item>
        <Form.Item name="characters" label="勾选角色（多选）" rules={[{ required: true, message: '请选择要补齐的角色' }]}>
          <Select mode="multiple" options={characterOptions} placeholder="从角色列表勾选" />
        </Form.Item>
        <Form.Item name="story_info" label="故事信息/标签（可选）">
          <TextArea rows={3} placeholder="有助于AI匹配设定，例如：古代言情/仙侠/校园等" />
        </Form.Item>
        {lastLog ? <Text type="secondary">{lastLog}</Text> : null}
      </Form>
    </Card>
  )
}


