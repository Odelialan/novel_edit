'use client'

import { useState, useEffect } from 'react'
import { Card, Tabs, Space, Typography, message } from 'antd'
import { 
  ReadOutlined, 
  ThunderboltOutlined, 
  FileTextOutlined, 
  EditOutlined 
} from '@ant-design/icons'
import ChapterSummaryPanel from './ChapterSummaryPanel'
import FullNovelSummaryPanel from './FullNovelSummaryPanel'
import AIPanel from './AIPanel'
import AIParagraphExpandPanel from './AIParagraphExpandPanel'
import AIRewritePanel from './AIRewritePanel'

const { Title } = Typography

interface SimplifiedAISidebarProps {
  novelId: string
  chapterContent: string
  currentChapter?: {
    order: number
    title: string
  } | null
  onAppendResult?: (text: string) => void
}

export default function SimplifiedAISidebar({ 
  novelId, 
  chapterContent, 
  currentChapter, 
  onAppendResult
}: SimplifiedAISidebarProps) {
  const [activeTab, setActiveTab] = useState('summary')

  // 获取选中文本的函数
  const getSelectedText = () => {
    // 尝试从全局编辑器API获取选中文本
    if (typeof window !== 'undefined' && (window as any).__editorApi) {
      return (window as any).__editorApi.getSelectedText() || ''
    }
    return ''
  }

  const handleAppendResult = (text: string) => {
    if (onAppendResult) {
      onAppendResult(text)
    } else {
      message.success('文本已准备插入，请手动复制到编辑器中')
    }
  }

  const tabItems = [
    {
      key: 'summary',
      label: (
        <span>
          <ReadOutlined className="mr-1" />
          章节概要
        </span>
      ),
      children: (
        <ChapterSummaryPanel 
          novelId={novelId} 
          getText={() => chapterContent} 
          currentChapter={currentChapter}
        />
      )
    },
    {
      key: 'full_summary',
      label: (
        <span>
          <FileTextOutlined className="mr-1" />
          全文概要
        </span>
      ),
      children: (
        <FullNovelSummaryPanel 
          novelId={novelId}
        />
      )
    },
    {
      key: 'sentence',
      label: (
        <span>
          <ThunderboltOutlined className="mr-1" />
          句子成段
        </span>
      ),
      children: (
        <AIPanel 
          novelId={novelId} 
          onAppendResult={handleAppendResult} 
        />
      )
    },
    {
      key: 'paragraph',
      label: (
        <span>
          <FileTextOutlined className="mr-1" />
          段落成文
        </span>
      ),
      children: (
        <AIParagraphExpandPanel 
          novelId={novelId} 
          onAppendResult={handleAppendResult}
          selectedText={getSelectedText()}
        />
      )
    },
    {
      key: 'rewrite',
      label: (
        <span>
          <EditOutlined className="mr-1" />
          改写润色
        </span>
      ),
      children: (
        <AIRewritePanel 
          novelId={novelId} 
          editorApi={{
            getSelectedText: getSelectedText,
            replaceSelection: (text: string) => {
              if (typeof window !== 'undefined' && (window as any).__editorApi) {
                (window as any).__editorApi.replaceSelection(text)
              }
            },
            insertAtCursor: (text: string) => {
              if (typeof window !== 'undefined' && (window as any).__editorApi) {
                (window as any).__editorApi.insertAtCursor(text)
              }
            }
          }} 
        />
      )
    }
  ]

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <FileTextOutlined className="mr-2" />
          <span>AI 写作助手</span>
        </div>
      }
      className="h-full"
      styles={{ body: { height: 'calc(100% - 60px)', padding: 0, overflow: 'hidden' } }}
    >
      <div className="h-full overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="h-full"
          tabPosition="top"
          size="small"
          style={{ height: '100%' }}
        />
      </div>
    </Card>
  )
}
