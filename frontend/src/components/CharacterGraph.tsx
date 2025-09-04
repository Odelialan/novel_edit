'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Card, Typography, message } from 'antd'
import { TeamOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { Text } = Typography

interface CharacterNode {
  id: string
  name: string
  relationships?: Array<{ target: string, relation: string }>
}

interface CharacterGraphProps {
  novelId: string
}

export default function CharacterGraph({ novelId }: CharacterGraphProps) {
  const { token } = useAuthStore()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}` }), [token])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/characters`, { headers })
        const j = await res.json()
        if (!res.ok || !j.ok) return
        const list: CharacterNode[] = j.data?.characters || []
        drawGraph(list)
      } catch { message.error('加载角色失败') }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novelId])

  const drawGraph = (nodes: CharacterNode[]) => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    if (!ctx) return
    const width = cvs.width
    const height = cvs.height
    ctx.clearRect(0, 0, width, height)

    // 简化：圆形布局
    const R = Math.min(width, height) * 0.4
    const cx = width / 2
    const cy = height / 2
    const n = nodes.length || 1

    const idToPos = new Map<string, { x: number, y: number }>()
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / n
      const x = cx + R * Math.cos(angle)
      const y = cy + R * Math.sin(angle)
      idToPos.set(node.id, { x, y })
    })

    // 画边
    ctx.strokeStyle = '#c0c4cc'
    ctx.lineWidth = 1
    nodes.forEach(node => {
      const src = idToPos.get(node.id)
      if (!src) return
      ;(node.relationships || []).forEach(rel => {
        const dst = idToPos.get(rel.target)
        if (!dst) return
        ctx.beginPath()
        ctx.moveTo(src.x, src.y)
        ctx.lineTo(dst.x, dst.y)
        ctx.stroke()
      })
    })

    // 画点和标签
    nodes.forEach(node => {
      const p = idToPos.get(node.id)
      if (!p) return
      ctx.beginPath()
      ctx.fillStyle = '#1677ff'
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.font = '12px sans-serif'
      ctx.fillStyle = '#333'
      const label = node.name || node.id
      ctx.fillText(label, p.x + 8, p.y - 8)
    })
  }

  return (
    <Card size="small" title={<span><TeamOutlined className="mr-2" />角色关系图</span>}>
      <canvas ref={canvasRef} width={480} height={360} className="w-full border rounded" />
      <Text type="secondary" className="text-xs">最小可用可视化：圆形布局 + 简单连线</Text>
    </Card>
  )
}


