'use client'

import { useState, useEffect } from 'react'
import { Card, Button, Space, Input, Modal, Form, message, Typography, Tag, Popconfirm } from 'antd'
import { BookOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { Title, Text } = Typography
const { Search } = Input

interface Novel {
  id: string
  title: string
  slug: string
  updated_at: string
  meta: any
}

interface NovelListProps {
  onSelectNovel: (novel: Novel) => void
  onCreateNovel: () => void
}

export default function NovelList({ onSelectNovel, onCreateNovel }: NovelListProps) {
  const [novels, setNovels] = useState<Novel[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false)
  const [createForm] = Form.useForm()
  const { token } = useAuthStore()

  useEffect(() => {
    loadNovels()
  }, [])

  const loadNovels = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/novels', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          // 后端返回的数据结构是 {novels: [...]}
          const novelsData = result.data?.novels || []
          setNovels(Array.isArray(novelsData) ? novelsData : [])
        }
      }
    } catch (error) {
      message.error('加载小说列表失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateNovel = async (values: any) => {
    try {
      const response = await fetch('/api/novels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: values.title,
          slug: values.slug || values.title.toLowerCase().replace(/\s+/g, '-'),
          meta: {
            description: values.description || '',
            genre: values.genre || '',
            author: values.author || ''
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          message.success('小说创建成功')
          setIsCreateModalVisible(false)
          createForm.resetFields()
          loadNovels()
        }
      }
    } catch (error) {
      message.error('创建小说失败')
    }
  }

  const handleDeleteNovel = async (novelId: string) => {
    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelId)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        message.success('小说删除成功')
        loadNovels()
      }
    } catch (error) {
      message.error('删除小说失败')
    }
  }

  const filteredNovels = Array.isArray(novels) ? novels.filter(novel => {
    const title = (novel.title || '').toLowerCase()
    const slug = (novel.slug || '').toLowerCase()
    const q = searchText.toLowerCase()
    return title.includes(q) || slug.includes(q)
  }) : []

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">
          <BookOutlined className="mr-2" />
          我的小说
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateModalVisible(true)}
        >
          创建新小说
        </Button>
      </div>

      <div className="mb-4">
        <Search
          placeholder="搜索小说标题或别名..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNovels.map((novel) => (
          <Card
            key={novel.id}
            hoverable
            className="h-full"
            actions={[
              <Button
                key="view"
                type="text"
                icon={<EyeOutlined />}
                onClick={() => onSelectNovel(novel)}
              >
                编辑
              </Button>,
              <Popconfirm
                key="delete"
                title="确定要删除这本小说吗？"
                description="删除后无法恢复，所有章节和角色数据都将丢失。"
                onConfirm={() => handleDeleteNovel(novel.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                >
                  删除
                </Button>
              </Popconfirm>
            ]}
          >
            <div className="h-full flex flex-col">
              <div className="flex-1">
                <Title level={4} className="mb-2 line-clamp-2">
                  {novel.title || novel.slug}
                </Title>
                
                <div className="mb-3">
                  <Tag color="blue">{novel.slug}</Tag>
                  {novel.meta?.genre && (
                    <Tag color="green">{novel.meta.genre}</Tag>
                  )}
                </div>

                {novel.meta?.description && (
                  <Text type="secondary" className="line-clamp-3">
                    {novel.meta.description}
                  </Text>
                )}

                <div className="mt-4 text-xs text-gray-500">
                  最后更新: {formatDate(novel.updated_at)}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredNovels.length === 0 && !isLoading && (
        <Card className="text-center py-12">
          <BookOutlined className="text-6xl text-gray-300 mb-4" />
          <Title level={4} className="text-gray-500">
            {searchText ? '没有找到匹配的小说' : '还没有创建任何小说'}
          </Title>
          <Text className="text-gray-400">
            {searchText ? '尝试调整搜索关键词' : '点击右上角按钮开始创建你的第一部小说'}
          </Text>
        </Card>
      )}

      {/* 创建小说模态框 */}
      <Modal
        title="创建新小说"
        open={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateNovel}
          initialValues={{
            genre: '奇幻',
            author: '我'
          }}
        >
          <Form.Item
            name="title"
            label="小说标题"
            rules={[{ required: true, message: '请输入小说标题' }]}
          >
            <Input placeholder="请输入小说标题" />
          </Form.Item>

          <Form.Item
            name="slug"
            label="小说别名（可选）"
            extra="用于URL和文件路径，如果不填将自动生成"
          >
            <Input placeholder="例如：my-novel" />
          </Form.Item>

          <Form.Item
            name="genre"
            label="小说类型"
          >
            <Input placeholder="例如：奇幻、科幻、都市等" />
          </Form.Item>

          <Form.Item
            name="description"
            label="小说简介（可选）"
          >
            <Input.TextArea
              rows={3}
              placeholder="简单描述一下你的小说内容..."
            />
          </Form.Item>

          <Form.Item
            name="author"
            label="作者"
          >
            <Input placeholder="作者名称" />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setIsCreateModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                创建小说
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
} 