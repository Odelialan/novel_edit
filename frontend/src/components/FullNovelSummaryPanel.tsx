'use client'

import { useState, useMemo } from 'react'
import { Card, Button, InputNumber, message, Space, Collapse } from 'antd'
import { FileTextOutlined, SaveOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { Panel } = Collapse

interface FullNovelSummaryPanelProps {
  novelId: string
}

export default function FullNovelSummaryPanel({ novelId }: FullNovelSummaryPanelProps) {
  const { token } = useAuthStore()
  const [maxSentences, setMaxSentences] = useState<number>(10)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState('')
  const [isExpanded, setIsExpanded] = useState(true)
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])

  const generate = async () => {
    if (!novelId) {
      message.error('缺少小说ID')
      return
    }
    
    try {
      setLoading(true)
      const res = await fetch('/api/ai/full-novel-summary', { 
        method: 'POST', 
        headers, 
        body: JSON.stringify({ 
          novel_id: novelId,
          max_sentences: maxSentences
        }) 
      })
      const j = await res.json()
      if (res.ok && j.ok) {
        const newSummary = j.data?.result_summary || ''
        setSummary(newSummary)
        message.success('全文概要生成成功')
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
    if (!summary.trim()) {
      message.error('概要内容为空，无法保存')
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/ai/full-novel-summary/save', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          novel_id: novelId,
          summary_content: summary
        })
      })
      const j = await res.json()
      if (res.ok && j.ok) {
        message.success(`全文概要已保存到 ${j.data?.file_path}`)
      } else {
        message.error(j.error?.msg || '保存失败')
      }
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>
            <FileTextOutlined className="mr-2" />
            全文概要
          </span>
          <Space>
            <span>句数</span>
            <InputNumber
              min={3}
              max={50}
              value={maxSentences}
              onChange={(value) => setMaxSentences(value || 10)}
              size="small"
              style={{ width: 80 }}
            />
            <Button 
              type="primary" 
              loading={loading}
              onClick={generate}
            >
              生成
            </Button>
            <Button 
              icon={<SaveOutlined />}
              loading={saving}
              onClick={saveSummary}
              disabled={!summary.trim()}
            >
              保存
            </Button>
          </Space>
        </div>
      }
      style={{ height: '100%' }}
      styles={{ body: { height: 'calc(100% - 57px)', overflow: 'hidden' } }}
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 16, color: '#666', fontSize: '12px' }}>
          已保存到 summaries/full_novel_summary.md
        </div>
        
        <Collapse 
          activeKey={isExpanded ? ['summary'] : []}
          onChange={(keys) => setIsExpanded(keys.includes('summary'))}
          style={{ flex: 1, overflow: 'hidden' }}
        >
          <Panel 
            header={`概要内容 (${summary.length}字符)`} 
            key="summary"
            style={{ height: '100%' }}
          >
            <div style={{ 
              height: 'calc(100vh - 300px)', 
              minHeight: '200px',
              overflow: 'auto',
              padding: '12px',
              background: '#f5f5f5',
              borderRadius: '4px',
              whiteSpace: 'pre-wrap',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              {summary || '请点击"生成"按钮生成全文概要'}
            </div>
          </Panel>
        </Collapse>
        
        <div style={{ marginTop: 16, color: '#666', fontSize: '12px' }}>
          请提供需要生成概要的章节内容。我会根据你提供的文本，提炼出关键信息，突出其中的关键冲突、转折与推进情节。
        </div>
      </div>
    </Card>
  )
}
