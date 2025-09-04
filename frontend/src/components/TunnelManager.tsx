'use client'

import { useState } from 'react'
import { Card, Button, Space, Tag, message } from 'antd'
import { CloudServerOutlined, PlayCircleOutlined, StopOutlined, ReloadOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

interface TunnelStatus {
  enabled: boolean
  type: 'none' | 'ngrok' | 'tailscale' | 'cloudflared'
  public_url?: string
}

export default function TunnelManager() {
  const { token } = useAuthStore()
  const [status, setStatus] = useState<TunnelStatus>({ enabled: false, type: 'none' })
  const [loading, setLoading] = useState(false)

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tunnel/status', { headers })
      if (res.ok) {
        const result = await res.json()
        if (result.ok) setStatus(result.data)
      }
    } catch (e) {
      message.error('获取隧道状态失败')
    } finally {
      setLoading(false)
    }
  }

  const start = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tunnel/start', { method: 'POST', headers, body: JSON.stringify({ provider: 'ngrok' }) })
      if (res.ok) {
        const result = await res.json()
        if (result.ok) {
          message.success('隧道已启动')
          setStatus(result.data)
        } else {
          message.error(result.error?.msg || '启动失败')
        }
      }
    } catch (e) {
      message.error('启动失败')
    } finally {
      setLoading(false)
    }
  }

  const stop = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tunnel/stop', { method: 'POST', headers })
      if (res.ok) {
        const result = await res.json()
        if (result.ok) {
          message.success('隧道已停止')
          setStatus({ enabled: false, type: 'none' })
        } else {
          message.error(result.error?.msg || '停止失败')
        }
      }
    } catch (e) {
      message.error('停止失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title={<span><CloudServerOutlined className="mr-2" />内网穿透</span>}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>刷新</Button>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={start} loading={loading}>
            启动
          </Button>
          <Button danger icon={<StopOutlined />} onClick={stop} loading={loading}>
            停止
          </Button>
        </Space>
      }
      className="mb-4"
    >
      <Space direction="vertical">
        <div>
          当前状态：{status.enabled ? <Tag color="green">已开启</Tag> : <Tag>未开启</Tag>}
          类型：<Tag color="blue">{status.type}</Tag>
        </div>
        {status.public_url && (
          <div>
            公网地址：<a href={status.public_url} target="_blank" rel="noreferrer">{status.public_url}</a>
          </div>
        )}
      </Space>
    </Card>
  )
}

 