'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, Tabs, Form, Input, Select, Button, Space, message } from 'antd'
import { EditOutlined, HighlightOutlined, SendOutlined, DownloadOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { TextArea } = Input

interface EditorApi {
  getSelectedText: () => string
  replaceSelection: (text: string) => void
  insertAtCursor: (text: string) => void
}

interface AIRewritePanelProps {
  novelId: string
  editorApi?: EditorApi | null
}

export default function AIRewritePanel({ novelId, editorApi }: AIRewritePanelProps) {
  const { token } = useAuthStore()
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])
  const [activeKey, setActiveKey] = useState<'expand' | 'polish'>('expand')
  const [form] = Form.useForm()
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [characterOptions, setCharacterOptions] = useState<{label:string,value:string}[]>([])
  const [charactersMap, setCharactersMap] = useState<Record<string, any>>({})
  const [outlineOptions, setOutlineOptions] = useState<{label:string,value:string}[]>([])

  useEffect(() => { loadDefault(); loadCharacters(); loadOutlines(); loadNovelMeta() }, [activeKey, novelId])

  const loadDefault = async () => {
    try {
      let res = await fetch('/api/utils/prompts?scope=global', { headers: { 'Authorization': headers['Authorization'] as string } })
      let data: any
      if (res.ok) { const j = await res.json(); if (j.ok) data = j.data?.prompts }
      const defaults = activeKey === 'expand' ? { sentence: data?.expand?.sentence, paragraph: data?.expand?.paragraph } : { sentence: data?.polish?.sentence, paragraph: data?.polish?.paragraph }
      form.setFieldsValue({ mode: 'sentence', other: '', pov: '第三人称', input: (editorApi?.getSelectedText?.() || ''), style: data?.styles?.current || '' })
      ;(form as any).__defaults = defaults
      ;(form as any).__style = data?.styles?.current || ''
    } catch (error) {
      console.error('加载提示词失败:', error)
    }
  }

  const loadCharacters = async () => {
    try {
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/characters`, { headers: { 'Authorization': headers['Authorization'] as string } })
      if (res.ok) { const j = await res.json(); if (j.ok) {
        const list = (j.data?.characters || [])
        setCharacterOptions(list.map((c: any) => ({ label: c.name, value: c.name })))
        const map: Record<string, any> = {}
        list.forEach((c: any) => { map[c.name] = c })
        setCharactersMap(map)
      }}
    } catch {}
  }

  const loadOutlines = async () => {
    try {
      const res = await fetch(`/api/sync/pull?novel_id=${encodeURIComponent(novelId)}`, { headers: { 'Authorization': headers['Authorization'] as string } })
      if (res.ok) {
        const j = await res.json()
        if (j.ok) {
          const files = j.data?.files || {}
          const outlines = Object.keys(files).filter((p) => p.startsWith('outlines/') && (p.endsWith('.md') || p.endsWith('.txt')))
          setOutlineOptions(outlines.map(p => ({ label: p.replace(/^outlines\//,''), value: p })))
        }
      }
    } catch {}
  }

  const loadOutlineContentTo = async (path: string | undefined, field: 'story' | 'world') => {
    if (!path) return
    try {
      const res = await fetch(`/api/sync/download/${encodeURIComponent(novelId)}/${encodeURIComponent(path)}`, { headers: { 'Authorization': headers['Authorization'] as string } })
      if (res.ok) { const j = await res.json(); if (j.ok) form.setFieldsValue({ [field]: j.data?.content || '' }) }
    } catch {}
  }

  const loadNovelMeta = async () => {
    try {
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}`, { headers: { 'Authorization': headers['Authorization'] as string } })
      if (res.ok) { const j = await res.json(); if (j.ok) {
        const meta = j.data?.novel_info?.meta || {}
        const defaultWorld = [meta.genre, meta.description].filter(Boolean).join(' | ')
        if (defaultWorld) form.setFieldsValue({ world: defaultWorld })
      }}
    } catch {}
  }

  const run = async () => {
    try {
      const v = await form.validateFields()
      setLoading(true)
      const defaults = (form as any).__defaults || {}
      const baseTpl = v.mode === 'sentence' ? defaults.sentence : defaults.paragraph
      const input = v.input || editorApi?.getSelectedText?.() || ''
      const contextHead = [
        v.story ? `故事简介与标签：${v.story}` : '',
        (v.characters && v.characters.length) ? `角色选择：${v.characters.join('、')}` : '',
        v.characterInfo ? `角色简介与标签：${v.characterInfo}` : '',
        v.world ? `世界背景：${v.world}` : ''
      ].filter(Boolean).join('\n')
      if (!(input || '').trim()) { message.warning('请输入文本或选择编辑器文本'); setLoading(false); return }

      // 角色详情自动拼接
      let composedCharInfo = v.characterInfo || ''
      if ((!composedCharInfo || !composedCharInfo.trim()) && v.characters?.length) {
        const lines: string[] = []
        v.characters.forEach((name: string) => {
          const c = charactersMap[name]
          if (c) {
            const parts: string[] = []
            if (c.gender) parts.push(`性别:${c.gender}`)
            if (c.age) parts.push(`年龄:${c.age}`)
            if (c.personality) parts.push(`性格:${c.personality}`)
            if (c.appearance) parts.push(`外貌:${c.appearance}`)
            if (c.notes) parts.push(`备注:${c.notes}`)
            lines.push(`${name}（${parts.join('，')}）`)
          } else {
            lines.push(name)
          }
        })
        composedCharInfo = lines.join('\n')
      }

      // 占位符替换（兼容花括号/方括号/带斜杠的写法）
      const applyPlaceholders = (tplStr: string) => {
        const safe = (tplStr || '')
        return safe
          // 风格
          .split('[STYLE]').join(v.style || (form as any).__style || '')
          .split('{STYLE}').join(v.style || (form as any).__style || '')
          // 原始文本
          .split('{ORIGINAL_PARAGRAPH}').join(input)
          .split('{ORIGINAL_TEXT}').join(input)
          // 故事/角色/世界
          .split('{STORY_INFO}').join(v.story || '')
          .split('{outline}').join(v.story || '')
          .split('{plot}').join('（自动生成）')
          .split('{CHARACTER_INFO}').join(composedCharInfo || '')
          .split('{character_design}').join(composedCharInfo || '')
          .split('{main_characters_profile}').join(composedCharInfo || '')
          .split('{world}').join(v.world || '')
          // 类型/体量
          .split('[TYPE]').join(v.type || '（自动生成）')
          .split('{novel_type}').join(v.type || '（自动生成）')
          .split('[SHORT / MID / LONG]').join(v.scale || '（自动生成）')
          .split('{SHORT/ MID/ LONG}').join(v.scale || '（自动生成）')
      }
      const tplAppliedCore = applyPlaceholders(baseTpl)
      const extra = [v.other ? `其他要求：${v.other}` : '', v.pov ? `人称规范：${v.pov}` : ''].filter(Boolean).join('\n')
      const tplApplied = [tplAppliedCore, contextHead, extra].filter(Boolean).join('\n\n')

      if (activeKey === 'expand') {
        const res = await fetch('/api/ai/expand', { method: 'POST', headers, body: JSON.stringify({ novel_id: novelId, prompt_template: tplApplied, input_summary: input, style: (v.style || (form as any).__style || 'default'), max_tokens: v.mode === 'sentence' ? 200 : 1000 }) })
        const j = await res.json(); if (res.ok && j.ok) setOutput(j.data?.result_text || ''); else message.error(j.error?.msg || '扩写失败')
      } else {
        const res = await fetch('/api/ai/polish', { method: 'POST', headers, body: JSON.stringify({ text: `${tplApplied}`, preserve_content: true, style: (v.style || (form as any).__style || 'default') }) })
        const j = await res.json(); if (res.ok && j.ok) setOutput(j.data?.result_text || ''); else message.error(j.error?.msg || '润色失败')
      }
    } catch {} finally { setLoading(false) }
  }

  const applyToEditor = () => {
    if (!output) return
    if (editorApi?.getSelectedText?.()) editorApi.replaceSelection(output)
    else editorApi?.insertAtCursor?.(`\n${output}\n`)
    message.success('已写入编辑器')
  }

  return (
    <Card title="改写润色" extra={<Space>
      <Button type="primary" icon={<SendOutlined />} onClick={run} loading={loading}>生成</Button>
      <Button icon={<DownloadOutlined />} onClick={applyToEditor} disabled={!output}>写入编辑器</Button>
    </Space>}>
      <Tabs activeKey={activeKey} onChange={(k) => setActiveKey(k as any)} items={[
        { key: 'expand', label: <span><EditOutlined className="mr-1" />扩写</span>, children: (
          <Form form={form} layout="vertical" initialValues={{ mode: 'sentence', pov: '第三人称' }}>
            <Form.Item name="mode" label="模式">
              <Select options={[{ label: '句子', value: 'sentence' }, { label: '段落', value: 'paragraph' }]} />
            </Form.Item>
            <Form.Item name="style" label="写作风格（Style）">
              <TextArea rows={2} placeholder="若留空，将使用全局默认风格" />
            </Form.Item>
            <Form.Item name="pov" label="人称规范">
              <Select options={[{label:'第一人称',value:'第一人称'},{label:'第二人称',value:'第二人称'},{label:'第三人称',value:'第三人称'}]} />
            </Form.Item>
            <Form.Item name="characters" label="角色选择（可多选）">
              <Select mode="multiple" options={characterOptions} placeholder="从角色库选择，可留空" />
            </Form.Item>
            <Form.Item label="故事简介与标签（可选）">
              <Space.Compact className="w-full">
                <Select
                  placeholder="从大纲中选择"
                  onChange={(v) => loadOutlineContentTo(v as string, 'story')}
                  options={outlineOptions}
                  className="min-w-[220px]"
                />
                <Form.Item name="story" noStyle>
                  <TextArea rows={3} placeholder="从大纲中选择或手动填写" />
                </Form.Item>
              </Space.Compact>
            </Form.Item>
            <Form.Item name="characterInfo" label="角色简介与标签（可选）" getValueFromEvent={(...args) => args[0]}>
              <TextArea rows={3} placeholder="自动读取所选角色的信息（性格/动机/备注等）" />
            </Form.Item>
            <Form.Item label="世界背景（可选）">
              <Space.Compact className="w-full">
                <Select
                  placeholder="从大纲中选择"
                  onChange={(v) => loadOutlineContentTo(v as string, 'world')}
                  options={outlineOptions}
                  className="min-w-[220px]"
                />
                <Form.Item name="world" noStyle>
                  <TextArea rows={3} placeholder="从大纲选择或自动读取小说标签（已自动填充可编辑）" />
                </Form.Item>
              </Space.Compact>
            </Form.Item>
            <Form.Item name="other" label="其他要求（仅需填写此类约束项）">
              <TextArea rows={3} placeholder="例如：现代背景融合仙侠，不超过现代科技；仙侠占比>70%。" />
            </Form.Item>
            <Form.Item name="input" label="输入文本（留空则使用编辑器选区）">
              <TextArea rows={4} placeholder="在此粘贴句子/段落，或直接在左侧编辑器选区" />
            </Form.Item>
          </Form>
        )},
        { key: 'polish', label: <span><HighlightOutlined className="mr-1" />润色</span>, children: (
          <Form form={form} layout="vertical" initialValues={{ mode: 'sentence', pov: '第三人称' }}>
            <Form.Item name="mode" label="模式">
              <Select options={[{ label: '句子', value: 'sentence' }, { label: '段落', value: 'paragraph' }]} />
            </Form.Item>
            <Form.Item name="style" label="写作风格（Style）">
              <TextArea rows={2} placeholder="若留空，将使用全局默认风格" />
            </Form.Item>
            <Form.Item name="pov" label="人称规范">
              <Select options={[{label:'第一人称',value:'第一人称'},{label:'第二人称',value:'第二人称'},{label:'第三人称',value:'第三人称'}]} />
            </Form.Item>
            <Form.Item name="characters" label="角色选择（可多选）">
              <Select mode="multiple" options={characterOptions} placeholder="从角色库选择，可留空" />
            </Form.Item>
            <Form.Item label="故事简介与标签（可选）">
              <Space.Compact className="w-full">
                <Select placeholder="从大纲中选择" onChange={(v) => loadOutlineContentTo(v as string, 'story')} options={outlineOptions} className="min-w-[220px]" />
                <Form.Item name="story" noStyle>
                  <TextArea rows={3} placeholder="从大纲中选择或手动填写" />
                </Form.Item>
              </Space.Compact>
            </Form.Item>
            <Form.Item name="characterInfo" label="角色简介与标签（可选）">
              <TextArea rows={3} placeholder="自动读取所选角色的信息（性格/动机/备注等）" />
            </Form.Item>
            <Form.Item label="世界背景（可选）">
              <Space.Compact className="w-full">
                <Select placeholder="从大纲中选择" onChange={(v) => loadOutlineContentTo(v as string, 'world')} options={outlineOptions} className="min-w-[220px]" />
                <Form.Item name="world" noStyle>
                  <TextArea rows={3} placeholder="从大纲选择或自动读取小说标签（已自动填充可编辑）" />
                </Form.Item>
              </Space.Compact>
            </Form.Item>
            <Form.Item name="other" label="其他要求（仅需填写此类约束项）">
              <TextArea rows={3} placeholder="例如：现代背景融合仙侠，不超过现代科技；仙侠占比>70%。" />
            </Form.Item>
            <Form.Item name="input" label="输入文本（留空则使用编辑器选区）">
              <TextArea rows={4} placeholder="在此粘贴句子/段落，或直接在左侧编辑器选区" />
            </Form.Item>
          </Form>
        )}
      ]} />

      <div className="mt-3">
        <TextArea rows={8} value={output} readOnly placeholder="生成结果显示在此" />
      </div>
    </Card>
  )
}


