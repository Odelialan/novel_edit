'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, Button, List, Typography, Space, App } from 'antd'
import { DragOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { Text } = Typography

export interface ChapterItem {
  id: string
  title: string
  order: number
}

interface ChapterReorderProps {
  novelId: string
  chapters: ChapterItem[]
  onReordered?: () => void
}

export default function ChapterReorder({ novelId, chapters, onReordered }: ChapterReorderProps) {
  const { token } = useAuthStore()
  const { message } = App.useApp()
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])
  const [items, setItems] = useState<ChapterItem[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const sorted = [...chapters].sort((a, b) => a.order - b.order)
    setItems(sorted)
  }, [chapters])

  const onDragStart = (id: string) => setDraggingId(id)
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault()
  const onDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return
    const current = [...items]
    const fromIdx = current.findIndex(i => i.id === draggingId)
    const toIdx = current.findIndex(i => i.id === targetId)
    if (fromIdx < 0 || toIdx < 0) return
    const [moved] = current.splice(fromIdx, 1)
    current.splice(toIdx, 0, moved)
    setItems(current)
    setDraggingId(null)
  }

  const saveOrder = async () => {
    try {
      setSaving(true)
      // 依次提交 PUT 更新章节的 order，标题保持不变
      let idx = 1
      for (const it of items) {
        await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters/${encodeURIComponent(it.id)}`, {
          method: 'PUT', headers, body: JSON.stringify({ order: idx, title: it.title })
        })
        idx += 1
      }
      message.success('排序已保存')
      onReordered?.()
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const reloadFromProps = () => setItems([...chapters].sort((a, b) => a.order - b.order))

  return (
    <Card size="small" title={<span><DragOutlined className="mr-2" />章节排序</span>} extra={
      <Space>
        <Button size="small" icon={<ReloadOutlined />} onClick={reloadFromProps}>重置</Button>
        <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={saveOrder}>保存顺序</Button>
      </Space>
    }>
      <List
        dataSource={items}
        renderItem={(it) => (
          <List.Item>
            <div
              className={`w-full flex items-center gap-3 p-2 rounded border ${draggingId===it.id?'bg-blue-50 border-blue-300':'border-transparent hover:border-gray-200'}`}
              draggable
              onDragStart={() => onDragStart(it.id)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(it.id)}
            >
              <DragOutlined className="text-gray-400" />
              <Text strong className="w-16 text-right">{String(items.indexOf(it)+1).padStart(3,'0')}</Text>
              <Text className="flex-1">{it.title}</Text>
            </div>
          </List.Item>
        )}
      />
      <div className="text-xs text-gray-400 mt-2">提示：拖拽行以调整顺序，点击“保存顺序”生效。</div>
    </Card>
  )
}


