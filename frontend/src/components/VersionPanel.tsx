'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, List, Button, Typography, Space, Tag, App } from 'antd'
import { HistoryOutlined, RollbackOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { Text } = Typography

interface VersionInfo {
  version_id: string
  timestamp: string
  original_file: string
  snapshot_file: string
}

interface VersionPanelProps {
  novelId: string
  onRestored?: () => void
}

export default function VersionPanel({ novelId, onRestored }: VersionPanelProps) {
  const { token } = useAuthStore()
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/versions`, { headers })
      const j = await res.json()
      if (res.ok && j.ok) setVersions(j.data?.versions || [])
    } catch {
      message.error('加载版本失败')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [novelId])

  const restore = async (vid: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/versions/${encodeURIComponent(vid)}/restore`, { method: 'POST', headers })
      const j = await res.json()
      if (res.ok && j.ok) { message.success('已恢复'); onRestored?.(); await load() }
      else message.error(j.error?.msg || '恢复失败')
    } catch {
      message.error('恢复失败')
    } finally { setLoading(false) }
  }

  return (
    <Card title={<span><HistoryOutlined className="mr-2" />版本管理</span>} size="small" extra={<Button size="small" onClick={load}>刷新</Button>}>
      <List
        loading={loading}
        itemLayout="horizontal"
        dataSource={versions}
        renderItem={(v) => (
          <List.Item actions={[
            <Button key="restore" size="small" icon={<RollbackOutlined />} onClick={() => restore(v.version_id)}>恢复</Button>
          ]}>
            <List.Item.Meta
              title={<Space size={8}>
                <Text code>{v.version_id}</Text>
                <Tag color="blue">{new Date(v.timestamp).toLocaleString()}</Tag>
              </Space>}
              description={<Text type="secondary">{v.original_file}</Text>}
            />
          </List.Item>
        )}
      />
    </Card>
  )
}


