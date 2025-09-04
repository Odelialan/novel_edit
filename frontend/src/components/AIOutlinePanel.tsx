'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, Button, Space, Typography, Alert, App } from 'antd'
import { RobotOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import MonacoEditorComponent from './MonacoEditor'

const { Title, Text } = Typography

interface AIOutlinePanelProps {
  novelId: string
  outlineType?: string
  onApplied?: () => void
}

interface NovelInfo {
  genre?: string
  length?: string
  tags?: string[]
  heroine_role?: string
  hero_role?: string
}

export default function AIOutlinePanel({ novelId, outlineType, onApplied }: AIOutlinePanelProps) {
  const { token } = useAuthStore()
  const { message } = App.useApp()
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])
  const [loading, setLoading] = useState(false)
  const [novelInfo, setNovelInfo] = useState<NovelInfo>({})
  const [selectedPromptType, setSelectedPromptType] = useState<string>(outlineType || 'story_background')
  const [output, setOutput] = useState<string>('')

  const outlineTypes = [
    { key: 'story_background', label: '故事背景设定', description: '生成小说的世界观、地理环境、社会制度等背景设定' },
    { key: 'power_system', label: '力量体系', description: '生成小说的修炼体系、技能系统、限制规则等' },
    { key: 'history_background', label: '历史背景', description: '生成小说的重要历史事件、历史人物、历史影响等' },
    { key: 'story_timeline', label: '故事时间线', description: '生成小说的整体时间跨度、关键时间节点、时间管理等' },
    { key: 'story_location', label: '故事发生地点', description: '生成小说的主要场景、地理特征、人文环境等' },
    { key: 'main_plot', label: '故事主线', description: '生成小说的核心冲突、情节发展、主题思想等' },
    { key: 'story_summary', label: '故事内容简介', description: '生成小说的整体概述、核心主题、故事框架等内容简介' },
    { key: 'volume_summary', label: '分卷内容简介', description: '生成小说的分卷规划、每卷内容、分卷关联等' },
    { key: 'chapter_summary', label: '分章内容简介', description: '生成小说的章节规划、每章内容、章节关联等' }
  ]

  useEffect(() => {
    loadNovelInfo()
  }, [novelId])

  useEffect(() => {
    if (outlineType) {
      setSelectedPromptType(outlineType)
    }
  }, [outlineType])

  const loadNovelInfo = async () => {
    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelId)}`, { headers })
      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          const novel = result.data?.novel_info
          const meta = novel?.meta || {}
          setNovelInfo({
            genre: meta?.genre || '',
            length: meta?.target_length || '',
            tags: meta?.tags || [],
            heroine_role: meta?.heroine_role || '',
            hero_role: meta?.hero_role || ''
          })
        }
      }
    } catch (error) {
      message.error('加载小说信息失败')
    }
  }

  const generateOutline = async () => {
    try {
      setLoading(true)

      // 调用AI大纲生成API，直接使用自动读取的信息
      const response = await fetch('/api/ai/outline', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          novel_id: novelId,
          outline_type: selectedPromptType,
          user_prompt: ''  // 暂时不使用用户输入
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          setOutput(result.data?.result_text || '')
          message.success('大纲生成成功')
        } else {
          message.error(result.error?.msg || '生成失败')
        }
      } else {
        message.error('生成请求失败')
      }
    } catch (error) {
      message.error('生成失败')
    } finally {
      setLoading(false)
    }
  }

  const saveToOutline = async () => {
    if (!output.trim()) {
      message.error('没有可保存的内容')
      return
    }

    try {
      const currentType = outlineTypes.find(t => t.key === selectedPromptType)
      const title = currentType ? currentType.label : 'AI生成大纲'

      // 生成安全的文件名：例如 故事背景设定-2025-08-31-19-20-00.md
      const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
      const safeBase = `${title}-${ts}`.replace(/[^\u4e00-\u9fa5A-Za-z0-9\-_.]/g, '-')
      const path = `outlines/${safeBase}.md`

      const response = await fetch('/api/sync/push', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          novel_id: novelId,
          path,
          content: output,
          timestamp: new Date().toISOString()
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          message.success('保存到大纲成功')
          onApplied?.()
        } else {
          message.error(result.error?.msg || '保存失败')
        }
      } else {
        const text = await response.text()
        message.error(`保存失败：${text || response.status}`)
      }
    } catch (error) {
      message.error('保存失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-50 p-3 rounded border border-green-200">
        <div className="text-sm text-green-800 font-medium mb-2">✅ 自动读取信息</div>
        <div className="text-xs text-green-700 space-y-1">
          <div>• 故事类型：{novelInfo.genre || '（自动生成）'}</div>
          <div>• 篇幅体量：{novelInfo.length || '（自动生成）'}</div>
          <div>• 作品标签：{novelInfo.tags?.join('、') || '（自动生成）'}</div>
          <div>• 女主身份：{novelInfo.heroine_role || '（自动生成）'}</div>
          <div>• 男主身份：{novelInfo.hero_role || '（自动生成）'}</div>
        </div>
      </div>

      <div className="bg-blue-50 p-3 rounded border border-blue-200">
        <div className="text-sm text-blue-800 font-medium mb-2">🤖 生成类型</div>
        <div className="text-sm text-blue-700">
          {outlineTypes.find(t => t.key === selectedPromptType)?.label}
        </div>
      </div>

      <div className="space-y-3">
        <Button
          type="primary"
          icon={<RobotOutlined />}
          onClick={generateOutline}
          loading={loading}
          size="large"
          className="w-full"
        >
          生成大纲
        </Button>
        
        {output && (
          <Button
            icon={<SaveOutlined />}
            onClick={saveToOutline}
            className="w-full"
          >
            保存到大纲
          </Button>
        )}
      </div>

      {output && (
        <div style={{ marginTop: 24, maxHeight: 520, overflow: 'auto' }}>
          <Title level={4}>生成结果</Title>
          <MonacoEditorComponent
            value={output}
            onChange={setOutput}
            language="markdown"
            readOnly={false}
            novelId={novelId}
            chapterId="outline"
          />
        </div>
      )}
    </div>
  )
}
