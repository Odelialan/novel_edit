'use client'

import { useMemo, useState } from 'react'
import { Button, Dropdown, MenuProps, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

interface ExportMenuProps {
  novelId: string
}

export default function ExportMenu({ novelId }: ExportMenuProps) {
  const { token } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}` }), [token])

  const download = async (format: 'txt' | 'docx') => {
    try {
      setLoading(true)
      const res = await fetch(`/api/utils/export/${encodeURIComponent(novelId)}?format=${format}`, { headers })
      if (!res.ok) { message.error('导出失败'); return }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // 从响应头尝试获取文件名
      const cd = res.headers.get('Content-Disposition') || ''
      const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/)
      const filename = decodeURIComponent((match?.[1] || match?.[2] || `novel.${format}`))
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      message.error('导出异常')
    } finally {
      setLoading(false)
    }
  }

  const items: MenuProps['items'] = [
    { key: 'txt', label: '导出 TXT', onClick: () => download('txt') },
    { key: 'docx', label: '导出 Word (DOCX)', onClick: () => download('docx') }
  ]

  return (
    <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
      <Button icon={<DownloadOutlined />} loading={loading}>导出</Button>
    </Dropdown>
  )
}


