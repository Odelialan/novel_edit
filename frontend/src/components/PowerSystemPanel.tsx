'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, Button, Form, Input, Select, List, Typography, Space, message, Modal, Tag } from 'antd'
import { ThunderboltOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { Text } = Typography
const { TextArea } = Input

interface PowerItem {
  id: string
  name: string
  category?: string
  level?: string
  description?: string
  rules?: string
  examples?: string
  tags?: string[]
  created_at: string
  updated_at: string
}

interface PowerSystemPanelProps {
  novelId: string
}

export default function PowerSystemPanel({ novelId }: PowerSystemPanelProps) {
  const { token } = useAuthStore()
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])
  const [items, setItems] = useState<PowerItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<PowerItem | null>(null)
  const [form] = Form.useForm()

  useEffect(() => { load() }, [novelId])

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/powers`, { headers })
      const j = await res.json()
      if (res.ok && j.ok) setItems(j.data?.powers || [])
    } catch {
      message.error('加载力量体系失败')
    } finally { setLoading(false) }
  }

  const openCreate = () => { setEditing(null); form.resetFields(); setIsModalOpen(true) }
  const openEdit = (item: PowerItem) => { setEditing(item); form.setFieldsValue(item); setIsModalOpen(true) }

  const save = async () => {
    try {
      const v = await form.validateFields()
      setLoading(true)
      if (editing) {
        const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/powers/${encodeURIComponent(editing.id)}`,
          { method: 'PUT', headers, body: JSON.stringify(v) })
        const j = await res.json()
        if (res.ok && j.ok) { message.success('已更新'); setIsModalOpen(false); await load() } else message.error(j.error?.msg || '更新失败')
      } else {
        const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/powers`,
          { method: 'POST', headers, body: JSON.stringify(v) })
        const j = await res.json()
        if (res.ok && j.ok) { message.success('已创建'); setIsModalOpen(false); await load() } else message.error(j.error?.msg || '创建失败')
      }
    } catch {}
    finally { setLoading(false) }
  }

  const remove = async (item: PowerItem) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/powers/${encodeURIComponent(item.id)}`,
        { method: 'DELETE', headers })
      const j = await res.json()
      if (res.ok && j.ok) { message.success('已删除'); await load() } else message.error(j.error?.msg || '删除失败')
    } catch {}
    finally { setLoading(false) }
  }

  return (
    <Card size="small" title={<span><ThunderboltOutlined className="mr-2" />力量体系</span>} extra={
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
              title={<Text strong>{item.name} {item.level ? <span className="text-xs text-gray-400">({item.level})</span> : null}</Text>}
              description={
                <div>
                  {item.category && <div className="text-xs text-gray-500">类别：{item.category}</div>}
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
        title={editing ? '编辑力量条目' : '新建力量条目'}
        open={isModalOpen}
        onOk={save}
        onCancel={() => setIsModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：灵力、斗气、魔法、血脉等" />
          </Form.Item>
          <Form.Item name="category" label="类别">
            <Input placeholder="体系类别（如 修真、魔法、超能）" />
          </Form.Item>
          <Form.Item name="level" label="等级">
            <Input placeholder="等级或境界（如 炼气-筑基-金丹）" />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入后回车新增标签" />
          </Form.Item>
          <Form.Item name="description" label="简介">
            <TextArea rows={3} placeholder="简要介绍该力量体系" />
          </Form.Item>
          <Form.Item name="rules" label="规则">
            <TextArea rows={3} placeholder="使用代价、限制条件、成长路径等" />
          </Form.Item>
          <Form.Item name="examples" label="示例">
            <TextArea rows={3} placeholder="技能示例、代表人物、典型招式等" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}


