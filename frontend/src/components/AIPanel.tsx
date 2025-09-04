'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, Button, Space, Input, Select, message } from 'antd'
import { ThunderboltOutlined, SendOutlined, ClearOutlined, DownloadOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { TextArea } = Input

interface AIPanelProps {
  novelId: string
  onAppendResult?: (text: string) => void
}

export default function AIPanel({ novelId, onAppendResult }: AIPanelProps) {
  const { token } = useAuthStore()
  const [promptTemplate, setPromptTemplate] = useState('请从这个点子出发，根据小说已有内容，扩展为一个完整的片段或剧情大纲。')
  const [inputSummary, setInputSummary] = useState('')
  const [style, setStyle] = useState('默认')
  const [isStreaming, setIsStreaming] = useState(false)
  const [result, setResult] = useState('')
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const loadPrompt = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` }
        // 先尝试小说级
        let res = await fetch(`/api/utils/prompts?scope=novel&novel_id=${encodeURIComponent(novelId)}`, { headers })
        let tpl: string | undefined
        if (res.ok) {
          const result = await res.json()
          if (result.ok) tpl = result.data?.prompts?.expand
        }
        if (!tpl) {
          res = await fetch('/api/utils/prompts?scope=global', { headers })
          if (res.ok) {
            const result = await res.json()
            if (result.ok) tpl = result.data?.prompts?.expand
          }
        }
        if (tpl) setPromptTemplate(tpl)
      } catch {}
    }
    loadPrompt()
  }, [novelId, token])

  const startStream = async () => {
    if (!inputSummary.trim()) {
      message.warning('请输入待扩写内容')
      return
    }
    try {
      setIsStreaming(true)
      setResult('')
      const controller = new AbortController()
      controllerRef.current = controller
      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          novel_id: novelId,
          prompt_template: promptTemplate,
          input_summary: inputSummary,
          style,
          max_tokens: 1000
        }),
        signal: controller.signal
      })
      if (!response.ok || !response.body) {
        message.error('流式请求失败')
        setIsStreaming(false)
        return
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6)
            if (payload === '[DONE]') break
            setResult(prev => prev + payload)
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') message.error('生成失败')
    } finally {
      setIsStreaming(false)
      controllerRef.current = null
    }
  }

  const stopStream = () => {
    controllerRef.current?.abort()
  }

  const clearAll = () => {
    setResult('')
    setInputSummary('')
  }

  const appendToEditor = () => {
    if (!result) return
    onAppendResult?.('\n' + result + '\n')
    message.success('已插入到章节')
  }

  return (
    <Card
      title={<span><ThunderboltOutlined className="mr-2" />句子成段</span>}
      extra={
        <Space>
          <Button type="primary" icon={<SendOutlined />} onClick={startStream} loading={isStreaming}>
            句子成段
          </Button>
          <Button danger onClick={stopStream} disabled={!isStreaming}>停止</Button>
          <Button icon={<ClearOutlined />} onClick={clearAll}>清空</Button>
          <Button icon={<DownloadOutlined />} onClick={appendToEditor} disabled={!result}>插入到章节</Button>
        </Space>
      }
      className="h-full"
      styles={{ body: { height: 'calc(100% - 60px)' } }}
    >
      <div className="space-y-3">
        <Select
          value={style}
          onChange={setStyle}
          style={{ width: '100%' }}
          options={[
            { label: '默认', value: '默认' },
            { label: '文艺', value: '文艺' },
            { label: '热血', value: '热血' },
            { label: '轻松', value: '轻松' },
          ]}
        />
        <Input
          value={promptTemplate}
          onChange={(e) => setPromptTemplate(e.target.value)}
          placeholder="提示词模板"
        />
        <TextArea
          rows={5}
          value={inputSummary}
          onChange={(e) => setInputSummary(e.target.value)}
          placeholder="输入一个点子或句子，扩展为完整片段..."
        />
        <TextArea
          rows={12}
          value={result}
          readOnly
          placeholder="句子成段结果将显示在此"
        />
      </div>
    </Card>
  )
}


