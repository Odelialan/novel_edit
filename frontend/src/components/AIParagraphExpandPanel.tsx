'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, Button, Space, Input, Select, message, Typography } from 'antd'
import { ThunderboltOutlined, SendOutlined, ClearOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { TextArea } = Input
const { Title } = Typography

interface AIParagraphExpandPanelProps {
  novelId: string
  onAppendResult?: (text: string) => void
  selectedText?: string // 当前选中的文本
}

export default function AIParagraphExpandPanel({ novelId, onAppendResult, selectedText }: AIParagraphExpandPanelProps) {
  const { token } = useAuthStore()
  const [promptTemplate, setPromptTemplate] = useState('请将以下简短剧情扩展为一整篇完整的剧情，丰富情节发展、人物互动和场景描述，使其更加生动详细。')
  const [inputSummary, setInputSummary] = useState('')
  const [style, setStyle] = useState('默认')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState('')

  useEffect(() => {
    const loadPrompt = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` }
        // 先尝试小说级
        let res = await fetch(`/api/utils/prompts?scope=novel&novel_id=${encodeURIComponent(novelId)}`, { headers })
        let tpl: string | undefined
        if (res.ok) {
          const result = await res.json()
          if (result.ok) tpl = result.data?.prompts?.expand?.paragraph
        }
        if (!tpl) {
          res = await fetch('/api/utils/prompts?scope=global', { headers })
          if (res.ok) {
            const result = await res.json()
            if (result.ok) tpl = result.data?.prompts?.expand?.paragraph
          }
        }
        if (tpl) setPromptTemplate(tpl)
      } catch (error) {
        console.error('加载提示词失败:', error)
      }
    }
    loadPrompt()
  }, [novelId, token])

  // 当有选中文本时，自动填入
  useEffect(() => {
    if (selectedText && selectedText.trim()) {
      setInputSummary(selectedText.trim())
    }
  }, [selectedText])

  const generateParagraph = async () => {
    if (!inputSummary.trim()) {
      message.warning('请输入待扩展的剧情梗概')
      return
    }

    try {
      setIsLoading(true)
      setResult('')
      
      const response = await fetch('/api/ai/expand', {
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
          max_tokens: 2000 // 段落成文需要更多token
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          setResult(result.data.result_text)
          message.success('段落扩展完成')
        } else {
          message.error(result.error?.msg || '生成失败')
        }
      } else {
        message.error('请求失败')
      }
    } catch (e: any) {
      message.error('生成失败')
    } finally {
      setIsLoading(false)
    }
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

  const useSelectedText = () => {
    if (selectedText && selectedText.trim()) {
      setInputSummary(selectedText.trim())
      message.success('已获取选中文本')
    } else {
      message.warning('请先在编辑器中选择文本')
    }
  }

  return (
    <Card
      title={<span><FileTextOutlined className="mr-2" />段落成文</span>}
      extra={
        <Space>
          <Button type="primary" icon={<SendOutlined />} onClick={generateParagraph} loading={isLoading}>
            扩展为完整剧情
          </Button>
          <Button icon={<ClearOutlined />} onClick={clearAll}>清空</Button>
          <Button icon={<DownloadOutlined />} onClick={appendToEditor} disabled={!result}>插入到章节</Button>
        </Space>
      }
      className="h-full"
      styles={{ body: { height: 'calc(100% - 60px)' } }}
    >
      <div className="space-y-3">
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <div className="text-sm text-blue-800 font-medium mb-1">💡 段落成文功能</div>
          <div className="text-xs text-blue-700">
            将简短的剧情梗概扩展为完整的剧情段落，适合快速展开故事情节。
          </div>
        </div>

        <div className="flex space-x-2">
          <Select
            value={style}
            onChange={setStyle}
            style={{ width: 120 }}
            size="small"
            options={[
              { label: '默认', value: '默认' },
              { label: '文艺', value: '文艺' },
              { label: '热血', value: '热血' },
              { label: '轻松', value: '轻松' },
              { label: '悬疑', value: '悬疑' },
              { label: '言情', value: '言情' }
            ]}
          />
          <Button size="small" onClick={useSelectedText} disabled={!selectedText}>
            获取选中文本
          </Button>
        </div>

        <div>
          <div className="text-sm font-medium mb-1">提示词模板：</div>
          <Input
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
            placeholder="段落扩展提示词"
            size="small"
          />
        </div>

        <div>
          <div className="text-sm font-medium mb-1">简短剧情梗概：</div>
          <TextArea
            rows={4}
            value={inputSummary}
            onChange={(e) => setInputSummary(e.target.value)}
            placeholder="输入简短的剧情梗概，如：主角在图书馆遇到了神秘女子..."
          />
        </div>

        <div>
          <div className="text-sm font-medium mb-1">扩展结果：</div>
          <TextArea
            rows={15}
            value={result}
            readOnly
            placeholder="段落扩展结果将显示在此"
            className="bg-gray-50"
          />
        </div>
      </div>
    </Card>
  )
}
