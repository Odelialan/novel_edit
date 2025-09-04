'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, Button, Form, Input, Select, List, Typography, Space, message, Modal, Tag, DatePicker } from 'antd'
import { BookOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { Text } = Typography
const { TextArea } = Input

interface HistoryItem {
  id: string
  title: string
  period?: string
  date?: string
  description?: string
  related_characters?: string[]
  related_locations?: string[]
  tags?: string[]
  created_at: string
  updated_at: string
}

interface HistoryPanelProps {
  novelId: string
}

export default function HistoryPanel({ novelId }: HistoryPanelProps) {
  const { token } = useAuthStore()
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<HistoryItem | null>(null)
  const [form] = Form.useForm()

  useEffect(() => { load() }, [novelId])

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/histories`, { headers })
      const j = await res.json()
      if (res.ok && j.ok) setItems(j.data?.histories || [])
    } catch {
      message.error('加载历史背景失败')
    } finally { setLoading(false) }
  }

  const openCreate = () => { setEditing(null); form.resetFields(); setIsModalOpen(true) }
  const openEdit = (item: HistoryItem) => { setEditing(item); form.setFieldsValue(item); setIsModalOpen(true) }

  const save = async () => {
    try {
      const v = await form.validateFields()
      setLoading(true)
      if (editing) {
        const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/histories/${encodeURIComponent(editing.id)}`,
          { method: 'PUT', headers, body: JSON.stringify(v) })
        const j = await res.json()
        if (res.ok && j.ok) { message.success('已更新'); setIsModalOpen(false); await load() } else message.error(j.error?.msg || '更新失败')
      } else {
        const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/histories`,
          { method: 'POST', headers, body: JSON.stringify(v) })
        const j = await res.json()
        if (res.ok && j.ok) { message.success('已创建'); setIsModalOpen(false); await load() } else message.error(j.error?.msg || '创建失败')
      }
    } catch {}
    finally { setLoading(false) }
  }

  const remove = async (item: HistoryItem) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/histories/${encodeURIComponent(item.id)}`,
        { method: 'DELETE', headers })
      const j = await res.json()
      if (res.ok && j.ok) { message.success('已删除'); await load() } else message.error(j.error?.msg || '删除失败')
    } catch {}
    finally { setLoading(false) }
  }

  return (
    <Card size="small" title={<span><BookOutlined className="mr-2" />历史背景</span>} extra={
      <Button size="small" icon={<PlusOutlined />} onClick={openCreate}>新建</Button>
    }>
      <List
        loading={loading}
        dataSource={items}
        renderItem={(item) => (
          <List.Item actions={[
            <Button key="edit" size="small" icon={<EditOutlined />} onClick={() => openEdit(item)}>编辑</Button>,
            <Button key="del" size="small" danger icon={<DeleteOutlined />} onClick={() => remove(item)}>删除</Button>
          ]}>
            <List.Item.Meta
              title={<Text strong>{item.title} {item.period ? <span className="text-xs text-gray-400">({item.period})</span> : null}</Text>}
              description={
                <div>
                  {item.date && <div className="text-xs text-gray-500">日期：{item.date}</div>}
                  {item.description && <div className="text-xs text-gray-600 mt-1">{item.description}</div>}
                  <div className="mt-1">
                    {(item.tags || []).map(t => <Tag key={t}>{t}</Tag>)}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />

      <Modal
        title={editing ? '编辑历史条目' : '新建历史条目'}
        open={isModalOpen}
        onOk={save}
        onCancel={() => setIsModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="如：赤壁之战、长平之战、朝代更替等" />
          </Form.Item>
          <Form.Item name="period" label="时代/朝代">
            <Input placeholder="如：东汉末年、战国、某帝国黄金时代" />
          </Form.Item>
          <Form.Item name="date" label="发生日期/范围">
            <Input placeholder="如：公元208年 或 1000-1200年" />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入后回车新增标签" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="对该历史事件/背景的详细描述" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}


