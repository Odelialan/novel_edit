'use client'

import { useMemo, useState, useEffect } from 'react'
import { Card, Button, InputNumber, Space, Typography, message, Collapse } from 'antd'
import { ReadOutlined, SaveOutlined, FileTextOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { Text, Paragraph } = Typography


interface ChapterSummaryPanelProps {
  novelId: string
  getText: () => string
  currentChapter?: {
    order: number
    title: string
  } | null
}

export default function ChapterSummaryPanel({ novelId, getText, currentChapter }: ChapterSummaryPanelProps) {
  const { token } = useAuthStore()
  const [maxSentences, setMaxSentences] = useState<number>(5)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState('')
  const [summaryExists, setSummaryExists] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])

  // 当章节切换时，加载对应的概要
  useEffect(() => {
    if (currentChapter?.order) {
      loadChapterSummary(currentChapter.order)
    }
  }, [currentChapter?.order])

  const loadChapterSummary = async (chapterNumber: number) => {
    try {
      const res = await fetch(`/api/ai/chapter-summary/${chapterNumber}`, { headers })
      const j = await res.json()
      if (res.ok && j.ok) {
        setSummary(j.data?.summary || '')
        setSummaryExists(j.data?.exists || false)
      }
    } catch (error) {
      console.error('加载概要失败:', error)
    }
  }

  const generate = async () => {
    const text = getText?.() || ''
    if (!text.trim()) { 
      message.info('请先输入或选择章节内容')
      return 
    }
    try {
      setLoading(true)
      const res = await fetch('/api/ai/summarize', { 
        method: 'POST', 
        headers, 
        body: JSON.stringify({ 
          text, 
          max_sentences: maxSentences,
          summary_type: 'chapter',
          novel_id: novelId,
          chapter_number: currentChapter?.order
        }) 
      })
      const j = await res.json()
      if (res.ok && j.ok) {
        const newSummary = j.data?.result_summary || ''
        setSummary(newSummary)
        setSummaryExists(true)
        message.success('概要生成成功')
      } else {
        message.error(j.error?.msg || '生成失败')
      }
    } catch {
      message.error('生成失败')
    } finally { 
      setLoading(false) 
    }
  }

  const saveSummary = async () => {
    if (!currentChapter?.order) {
      message.error('无法确定当前章节编号')
      return
    }
    
    if (!summary.trim()) {
      message.error('概要内容为空，无法保存')
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/ai/chapter-summary/save', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          novel_id: novelId,
          chapter_number: currentChapter.order,
          summary_content: summary
        })
      })
      const j = await res.json()
      if (res.ok && j.ok) {
        setSummaryExists(true)
        message.success(`概要已保存到 ${j.data?.file_path}`)
      } else {
        message.error(j.error?.msg || '保存失败')
      }
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const getStatusText = () => {
    if (!currentChapter?.order) return '请先选择章节'
    if (!summaryExists) return '尚未生成概要'
    return `已保存到 summaries/chapter_${currentChapter.order}_summary.md`
  }

  return (
    <Card 
      title={
        <span>
          <ReadOutlined className="mr-2" />
          章节概要
        </span>
      } 
      size="small" 
      extra={
        <Space>
          <Text type="secondary">句数</Text>
          <InputNumber 
            size="small" 
            min={1} 
            max={10} 
            value={maxSentences} 
            onChange={(v) => typeof v === 'number' && setMaxSentences(v)} 
          />
          <Button 
            size="small" 
            type="primary" 
            onClick={generate} 
            loading={loading}
          >
            生成
          </Button>
          {summary && (
            <Button 
              size="small" 
              icon={<SaveOutlined />}
              onClick={saveSummary} 
              loading={saving}
            >
              保存
            </Button>
          )}
        </Space>
      }
    >
      <div className="space-y-3">
        {/* 状态提示 */}
        <div className="text-xs text-gray-500 flex items-center">
          <FileTextOutlined className="mr-1" />
          {getStatusText()}
        </div>

        {/* 概要内容区域 */}
        <Collapse 
          activeKey={isExpanded ? ['summary'] : []} 
          onChange={(keys) => setIsExpanded(keys.includes('summary'))}
          size="small"
          ghost
          items={[
            {
              key: 'summary',
              label: (
                <span className="text-sm">
                  概要内容 {summary && `(${summary.length} 字符)`}
                </span>
              ),
              children: summary ? (
                <Paragraph className="whitespace-pre-wrap text-sm mb-0">
                  {summary}
                </Paragraph>
              ) : (
                <Text type="secondary" className="text-sm">
                  点击生成以获取本章概要（3-5句建议）。
                </Text>
              )
            }
          ]}
        />
      </div>
    </Card>
  )
}


