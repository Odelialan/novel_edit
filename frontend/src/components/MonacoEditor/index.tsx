'use client'

import { useEffect, useRef, useState } from 'react'
import Cookies from 'js-cookie'
import { Card, Button, Space, Spin, App, Dropdown } from 'antd'
import { SaveOutlined, BulbOutlined, FormatPainterOutlined, HighlightOutlined, EditOutlined, DownOutlined } from '@ant-design/icons'
import dynamic from 'next/dynamic'

// 动态导入Monaco编辑器以避免SSR问题
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <Spin size="large" />
})

interface MonacoEditorProps {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  novelId: string
  chapterId?: string
  language?: string
  theme?: string
  readOnly?: boolean
  onExposeEditorApi?: (api: {
    getSelectedText: () => string
    replaceSelection: (text: string) => void
    insertAtCursor: (text: string) => void
  }) => void
}

export default function MonacoEditorComponent({
  value,
  onChange,
  onSave,
  novelId,
  chapterId,
  language = 'markdown',
  theme = 'vs-dark',
  readOnly = false,
  onExposeEditorApi
}: MonacoEditorProps) {
  const { message } = App.useApp()
  const [isSaving, setIsSaving] = useState(false)
  const [isAIExpanding, setIsAIExpanding] = useState(false)
  const [isAIPolishing, setIsAIPolishing] = useState(false)
  const [isAISummarizing, setIsAISummarizing] = useState(false)
  const [isFormatting, setIsFormatting] = useState(false)
  const editorRef = useRef<any>(null)

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
    // 设置编辑器选项
    editor.updateOptions({
      minimap: { enabled: true },
      wordWrap: 'on',
      lineNumbers: 'on',
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      automaticLayout: true,
      scrollBeyondLastLine: false,
      folding: true,
      lineDecorationsWidth: 10,
      lineNumbersMinChars: 3,
    })

    if (onExposeEditorApi) {
      const api = {
        getSelectedText: () => {
          const sel = editor.getSelection()
          return sel ? editor.getModel()?.getValueInRange(sel) || '' : ''
        },
        replaceSelection: (text: string) => {
          const sel = editor.getSelection()
          if (sel) editor.executeEdits('replace-selection', [{ range: sel, text }])
        },
        insertAtCursor: (text: string) => {
          const pos = editor.getPosition()
          if (pos) editor.executeEdits('insert-at-cursor', [{ range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column }, text }])
        }
      }
      onExposeEditorApi(api)
    }
  }

  const handleSave = async () => {
    if (!value.trim()) {
      message.warning('内容不能为空')
      return
    }

    setIsSaving(true)
    try {
      await onSave()
      message.success('保存成功')
    } catch (error) {
      message.error('保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAIExpand = async () => {
    const model = editorRef.current
    const selection = model?.getSelection && model.getSelection()
    const selectedText = selection ? model.getModel()?.getValueInRange(selection) : ''
    const base = (selectedText && selectedText.trim()) ? selectedText : value.slice(-500)
    if (!base.trim()) { message.warning('请选择或输入一些内容作为扩写基础'); return }

    setIsAIExpanding(true)
    try {
      // 读取提示词（小说级优先，回退全局）
      let promptTemplate = '请根据以下内容进行创意扩写，保持原有的风格和情节连贯性'
      try {
        const commonHeaders = { 'Authorization': `Bearer ${Cookies.get('auth_token') || ''}` }
        let r = await fetch(`/api/utils/prompts?scope=novel&novel_id=${encodeURIComponent(novelId)}`, { headers: commonHeaders })
        if (r.ok) {
          const j = await r.json()
          if (j.ok) {
            const t = (selectedText ? j.data?.prompts?.expand?.sentence : j.data?.prompts?.expand?.paragraph)
            promptTemplate = t || promptTemplate
          }
        }
        if (!promptTemplate) {
          r = await fetch('/api/utils/prompts?scope=global', { headers: commonHeaders })
          if (r.ok) {
            const j = await r.json()
            if (j.ok) {
              const t = (selectedText ? j.data?.prompts?.expand?.sentence : j.data?.prompts?.expand?.paragraph)
              promptTemplate = t || promptTemplate
            }
          }
        }
      } catch {}

      // 占位符最小化替换，避免未解析占位符进入模型
      const appliedTemplate = (promptTemplate || '')
        .split('{ORIGINAL_PARAGRAPH}').join(base)
        .split('{ORIGINAL_TEXT}').join(base)
        .split('{STYLE}').join('默认')
        .split('{novel_type}').join('（自动生成）')
        .split('{outline}').join('（自动生成）')
        .split('{plot}').join('（自动生成）')
        .split('{character_design}').join('（自动生成）')
        .split('{main_characters_profile}').join('（自动生成）')
        .split('{SHORT/ MID/ LONG}').join('（自动生成）')

      const response = await fetch('/api/ai/expand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('auth_token') || ''}`
        },
        body: JSON.stringify({
          novel_id: novelId,
          prompt_template: appliedTemplate,
          input_summary: base,
          style: 'default',
          max_tokens: 1000
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.data?.result_text) {
          const modelInstance = editorRef.current
          const currentSelection = modelInstance?.getSelection && modelInstance.getSelection()
          if (currentSelection && selectedText) {
            modelInstance.executeEdits('ai-expand-replace', [{ range: currentSelection, text: result.data.result_text }])
          } else {
            const currentPosition = modelInstance?.getPosition()
            if (currentPosition) {
              const range = { startLineNumber: currentPosition.lineNumber, startColumn: currentPosition.column, endLineNumber: currentPosition.lineNumber, endColumn: currentPosition.column }
              modelInstance.executeEdits('ai-expand-insert', [{ range, text: '\n\n' + result.data.result_text }])
            }
          }
          message.success('AI扩写完成')
        } else {
          message.error('AI扩写失败')
        }
      } else {
        message.error('AI服务暂时不可用')
      }
    } catch (error) {
      message.error('AI扩写失败')
    } finally {
      setIsAIExpanding(false)
    }
  }

  const handleAIPolish = async () => {
    const model = editorRef.current
    const selection = model?.getSelection && model.getSelection()
    const selectedText = selection ? model.getModel()?.getValueInRange(selection) : ''
    if (!selectedText?.trim()) { message.warning('请选择需要润色的文本'); return }
    setIsAIPolishing(true)
    try {
      // 读取润色模板
      let tpl = '请保持原意，对下文进行润色提升可读性与节奏感。'
      try {
        const h = { 'Authorization': `Bearer ${Cookies.get('auth_token') || ''}` }
        let r = await fetch(`/api/utils/prompts?scope=novel&novel_id=${encodeURIComponent(novelId)}`, { headers: h })
        if (r.ok) { const j = await r.json(); if (j.ok) tpl = j.data?.prompts?.polish || tpl }
        if (!tpl) { r = await fetch('/api/utils/prompts?scope=global', { headers: h }); if (r.ok) { const j = await r.json(); if (j.ok) tpl = j.data?.prompts?.polish || tpl } }
      } catch {}
      // 占位符替换（与扩写占位符保持一致）
      const appliedTpl = (tpl || '')
        .split('{ORIGINAL_PARAGRAPH}').join(selectedText)
        .split('{ORIGINAL_TEXT}').join(selectedText)
        .split('{STYLE}').join('默认')
        .split('{novel_type}').join('（自动生成）')
        .split('{outline}').join('（自动生成）')
        .split('{plot}').join('（自动生成）')
        .split('{character_design}').join('（自动生成）')
        .split('{main_characters_profile}').join('（自动生成）')
        .split('{SHORT/ MID/ LONG}').join('（自动生成）')

      const response = await fetch('/api/ai/polish', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Cookies.get('auth_token') || ''}` },
        body: JSON.stringify({ text: `${appliedTpl}\n\n${selectedText}`, preserve_content: true, style: 'default' })
      })
      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.data?.result_text) {
          model?.executeEdits('ai-polish', [{ range: selection, text: result.data.result_text }])
          message.success('润色完成')
        } else message.error('润色失败')
      } else message.error('AI服务暂时不可用')
    } catch {
      message.error('润色失败')
    } finally { setIsAIPolishing(false) }
  }

  const handleAISummarize = async () => {
    const model = editorRef.current
    const selection = model?.getSelection && model.getSelection()
    const selectedText = selection ? model.getModel()?.getValueInRange(selection) : ''
    const text = (selectedText && selectedText.trim()) ? selectedText : value
    if (!text.trim()) { message.warning('请选择或输入文本用于总结'); return }
    setIsAISummarizing(true)
    try {
      // 读取总结模板
      let tpl = '请生成3句以内的概要，突出核心信息与推进点。'
      try {
        const h = { 'Authorization': `Bearer ${Cookies.get('auth_token') || ''}` }
        let r = await fetch(`/api/utils/prompts?scope=novel&novel_id=${encodeURIComponent(novelId)}`, { headers: h })
        if (r.ok) { const j = await r.json(); if (j.ok) tpl = j.data?.prompts?.summarize || tpl }
        if (!tpl) { r = await fetch('/api/utils/prompts?scope=global', { headers: h }); if (r.ok) { const j = await r.json(); if (j.ok) tpl = j.data?.prompts?.summarize || tpl } }
      } catch {}
      const response = await fetch('/api/ai/summarize', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Cookies.get('auth_token') || ''}` },
        body: JSON.stringify({ text: `${tpl}\n\n${text}`, max_sentences: 3 })
      })
      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.data?.result_summary) {
          const pos = model?.getPosition()
          if (pos) {
            const range = { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column }
            model?.executeEdits('ai-summarize', [{ range, text: `\n\n【概要】${result.data.result_summary}\n` }])
          }
          message.success('总结完成')
        } else message.error('总结失败')
      } else message.error('AI服务暂时不可用')
    } catch {
      message.error('总结失败')
    } finally { setIsAISummarizing(false) }
  }

  const handleFormat = async (mode = "segment") => {
    if (!value.trim()) {
      message.warning('内容不能为空')
      return
    }

    setIsFormatting(true)
    try {
      const response = await fetch('/api/utils/reformat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('auth_token') || ''}`
        },
        body: JSON.stringify({
          text: value,
          settings: {
            layout_mode: mode,  // simple: 一句话一段, segment: 分段排版（句号分割+空行）
            indent: 2,
            preserve_empty_lines: false,
            smart_spacing: true,
            ellipsis_standardization: true,
            line_break_standardization: true
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('排版API响应:', result)
        if (result.ok && result.data?.formatted_text) {
          console.log('原文长度:', value.length, '结果长度:', result.data.formatted_text.length)
          console.log('是否有变化:', result.data.diff_info?.changed)
          onChange(result.data.formatted_text)
          const changed = result.data.diff_info?.changed
          message.success(changed ? `格式化完成，修改了${result.data.diff_info?.changed_lines || 0}行` : '文本无需格式化')
        } else {
          message.error(`格式化失败: ${result.error?.msg || '未知错误'}`)
        }
      } else {
        message.error('格式化服务暂时不可用')
      }
    } catch (error) {
      message.error('格式化失败')
    } finally {
      setIsFormatting(false)
    }
  }

  return (
    <Card 
      title="章节编辑器" 
      extra={
        <Space>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'segment',
                  label: '分段排版（段落间插空行）',
                  onClick: () => handleFormat('segment')
                },
                {
                  key: 'simple', 
                  label: '简单排版（按引号和标点分段）',
                  onClick: () => handleFormat('simple')
                }
              ]
            }}
            trigger={['click']}
            disabled={readOnly || isFormatting}
          >
            <Button
              icon={<FormatPainterOutlined />}
              loading={isFormatting}
              disabled={readOnly}
            >
              自动排版 <DownOutlined />
            </Button>
          </Dropdown>
          <Button
            icon={<BulbOutlined />}
            onClick={handleAIExpand}
            loading={isAIExpanding}
            disabled={readOnly}
          >
            AI扩写
          </Button>
          <Button
            icon={<HighlightOutlined />}
            onClick={handleAIPolish}
            loading={isAIPolishing}
            disabled={readOnly}
          >
            AI润色
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={handleAISummarize}
            loading={isAISummarizing}
            disabled={readOnly}
          >
            AI总结
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={isSaving}
            disabled={readOnly}
          >
            保存
          </Button>
        </Space>
      }
      className="h-full"
      styles={{ body: { height: 'calc(100% - 60px)', padding: 0 } }}
    >
      <div className="h-full">
        <MonacoEditor
          height="100%"
          language={language}
          theme={theme}
          value={value}
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            wordWrap: 'on',
            lineNumbers: 'on',
            minimap: { enabled: true },
            fontSize: 14,
            fontFamily: 'Consolas, "Courier New", monospace',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
          }}
        />
      </div>
    </Card>
  )
}
