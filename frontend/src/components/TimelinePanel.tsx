'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { Card, Button, Form, Input, Select, List, Typography, Space, message, Modal, Tabs, Slider, Row, Col, Tag } from 'antd'
import { ClockCircleOutlined, PlusOutlined, ThunderboltOutlined, BulbOutlined, ZoomInOutlined, ZoomOutOutlined, FilterOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { Text, Title } = Typography
const { TextArea } = Input

interface TimelineEvent {
  id: string
  title: string
  description: string
  type: string
  start_time?: string
  end_time?: string
  duration?: number
  created_at: string
}

interface Timeline {
  id: string
  name: string
  description: string
  events: TimelineEvent[]
  created_at: string
  updated_at: string
}

interface TimelinePanelProps {
  novelId: string
}

export default function TimelinePanel({ novelId }: TimelinePanelProps) {
  const { token } = useAuthStore()
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])
  const [timelines, setTimelines] = useState<Timeline[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false)
  const [isAddEventModalVisible, setIsAddEventModalVisible] = useState(false)
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline | null>(null)
  const [createForm] = Form.useForm()
  const [eventForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState('list')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [filterType, setFilterType] = useState<string>('all')
  const [searchText, setSearchText] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    loadTimelines()
  }, [novelId])

  useEffect(() => {
    if (activeTab === 'gantt' && canvasRef.current) {
      drawGanttChart()
    }
  }, [activeTab, timelines, zoomLevel, filterType, searchText])

  const loadTimelines = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/timelines`, { headers })
      const j = await res.json()
      if (res.ok && j.ok) {
        setTimelines(j.data?.timelines || [])
      }
    } catch {
      message.error('加载时间线失败')
    } finally {
      setLoading(false)
    }
  }

  const createTimeline = async () => {
    try {
      const v = await createForm.validateFields()
      setLoading(true)
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/timelines`, {
        method: 'POST', headers, body: JSON.stringify(v)
      })
      const j = await res.json()
      if (res.ok && j.ok) {
        message.success('时间线创建成功')
        setIsCreateModalVisible(false)
        createForm.resetFields()
        await loadTimelines()
      } else {
        message.error(j.error?.msg || '创建失败')
      }
    } catch {}
    finally { setLoading(false) }
  }

  const addEvent = async () => {
    try {
      const v = await eventForm.validateFields()
      if (!selectedTimeline) return
      setLoading(true)
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/timelines/${encodeURIComponent(selectedTimeline.id)}/events`, {
        method: 'POST', headers, body: JSON.stringify(v)
      })
      const j = await res.json()
      if (res.ok && j.ok) {
        message.success('事件添加成功')
        setIsAddEventModalVisible(false)
        eventForm.resetFields()
        await loadTimelines()
      } else {
        message.error(j.error?.msg || '添加失败')
      }
    } catch {}
    finally { setLoading(false) }
  }

  const autoGenerateEvents = async (timelineId: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/timelines/${encodeURIComponent(timelineId)}/auto-generate`, {
        method: 'POST', headers
      })
      const j = await res.json()
      if (res.ok && j.ok) {
        message.success('事件自动生成成功')
        await loadTimelines()
      } else {
        message.error(j.error?.msg || '生成失败')
      }
    } catch {}
    finally { setLoading(false) }
  }

  const openAddEventModal = (timeline: Timeline) => {
    setSelectedTimeline(timeline)
    setIsAddEventModalVisible(true)
  }

  const drawGanttChart = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height
    
    // 清空画布
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    
    // 设置背景
    ctx.fillStyle = '#f8f9fa'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
    
    // 过滤事件
    const filteredEvents = timelines.flatMap(timeline => 
      timeline.events.filter(event => {
        if (filterType !== 'all' && event.type !== filterType) return false
        if (searchText && !event.title.toLowerCase().includes(searchText.toLowerCase())) return false
        return true
      })
    )
    
    if (filteredEvents.length === 0) {
      ctx.fillStyle = '#666'
      ctx.font = '16px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('暂无事件数据', canvasWidth / 2, canvasHeight / 2)
      return
    }
    
    // 绘制时间轴
    const timeScale = 100 * zoomLevel
    const eventHeight = 40
    const margin = 60
    
    // 绘制Y轴标签
    ctx.fillStyle = '#333'
    ctx.font = '12px Arial'
    ctx.textAlign = 'right'
    filteredEvents.forEach((event, index) => {
      const y = margin + index * eventHeight + eventHeight / 2
      ctx.fillText(event.title, margin - 10, y + 4)
    })
    
    // 绘制时间线
    ctx.strokeStyle = '#ddd'
    ctx.lineWidth = 1
    filteredEvents.forEach((event, index) => {
      const y = margin + index * eventHeight + eventHeight / 2
      ctx.beginPath()
      ctx.moveTo(margin, y)
      ctx.lineTo(canvasWidth - 20, y)
      ctx.stroke()
    })
    
    // 绘制事件条
    filteredEvents.forEach((event, index) => {
      const y = margin + index * eventHeight + eventHeight / 2
      const x = margin + (event.start_time ? new Date(event.start_time).getTime() / timeScale : 0)
      const width = event.duration ? event.duration / timeScale : 50
      
      // 根据事件类型设置颜色
      const colors = {
        'chapter_event': '#1890ff',
        'character_event': '#52c41a',
        'world_event': '#fa8c16',
        'plot_event': '#eb2f96'
      }
      ctx.fillStyle = colors[event.type as keyof typeof colors] || '#666'
      
      // 绘制事件条
      ctx.fillRect(x, y - 15, width, 30)
      
      // 绘制事件标签
      ctx.fillStyle = '#fff'
      ctx.font = '10px Arial'
      ctx.textAlign = 'center'
      if (width > 30) {
        ctx.fillText(event.title, x + width / 2, y + 3)
      }
    })
    
    // 绘制X轴
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(margin, margin - 20)
    ctx.lineTo(canvasWidth - 20, margin - 20)
    ctx.stroke()
    
    // 绘制时间刻度
    ctx.fillStyle = '#666'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    for (let i = 0; i <= 10; i++) {
      const x = margin + (i * (canvasWidth - margin - 20) / 10)
      ctx.fillText(`${i * 10}`, x, margin - 25)
    }
  }

  const getEventTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'chapter_event': '章节事件',
      'character_event': '角色事件',
      'world_event': '世界事件',
      'plot_event': '剧情事件'
    }
    return typeMap[type] || type
  }

  const getEventTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      'chapter_event': 'blue',
      'character_event': 'green',
      'world_event': 'orange',
      'plot_event': 'magenta'
    }
    return colorMap[type] || 'default'
  }

  return (
    <Card size="small" title={<span><ClockCircleOutlined className="mr-2" />时间线管理</span>} extra={
      <Button size="small" icon={<PlusOutlined />} onClick={() => setIsCreateModalVisible(true)}>新建</Button>
    }>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'list',
            label: '列表视图',
            children: (
              <List
                loading={loading}
                dataSource={timelines}
                renderItem={(timeline) => (
                  <List.Item actions={[
                    <Button key="add" size="small" onClick={() => openAddEventModal(timeline)}>添加事件</Button>,
                    <Button key="auto" size="small" icon={<ThunderboltOutlined />} onClick={() => autoGenerateEvents(timeline.id)}>自动生成</Button>
                  ]}>
                    <List.Item.Meta
                      title={<Text strong>{timeline.name}</Text>}
                      description={
                        <div>
                          <Text type="secondary">{timeline.description}</Text>
                          <br />
                          <Text type="secondary" className="text-xs">
                            事件数: {timeline.events?.length || 0} | 
                            更新: {new Date(timeline.updated_at).toLocaleDateString()}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )
          },
          {
            key: 'gantt',
            label: '甘特图视图',
            children: (
              <div className="space-y-4">
                {/* 控制面板 */}
                <Row gutter={16} align="middle">
                  <Col span={6}>
                    <Text>缩放级别:</Text>
                    <Slider
                      min={0.5}
                      max={3}
                      step={0.1}
                      value={zoomLevel}
                      onChange={setZoomLevel}
                      className="ml-2"
                    />
                  </Col>
                  <Col span={6}>
                    <Text>事件类型:</Text>
                    <Select
                      value={filterType}
                      onChange={setFilterType}
                      style={{ width: 120, marginLeft: 8 }}
                      options={[
                        { label: '全部', value: 'all' },
                        { label: '章节事件', value: 'chapter_event' },
                        { label: '角色事件', value: 'character_event' },
                        { label: '世界事件', value: 'world_event' },
                        { label: '剧情事件', value: 'plot_event' }
                      ]}
                    />
                  </Col>
                  <Col span={6}>
                    <Text>搜索:</Text>
                    <Input
                      placeholder="搜索事件"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      style={{ width: 120, marginLeft: 8 }}
                    />
                  </Col>
                  <Col span={6}>
                    <Space>
                      <Button size="small" icon={<ZoomInOutlined />} onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.1))} />
                      <Button size="small" icon={<ZoomOutOutlined />} onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))} />
                      <Button size="small" icon={<FilterOutlined />} onClick={() => { setFilterType('all'); setSearchText('') }}>重置</Button>
                    </Space>
                  </Col>
                </Row>

                {/* 甘特图画布 */}
                <div className="border rounded p-4 bg-white">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={400}
                    className="w-full border rounded cursor-crosshair"
                  />
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    提示：甘特图显示所有时间线的事件，支持缩放、过滤和搜索
                  </div>
                </div>

                {/* 图例 */}
                <div className="flex justify-center space-x-4">
                  {Object.entries({
                    'chapter_event': '章节事件',
                    'character_event': '角色事件',
                    'world_event': '世界事件',
                    'plot_event': '剧情事件'
                  }).map(([type, label]) => (
                    <div key={type} className="flex items-center">
                      <div
                        className="w-4 h-4 rounded mr-2"
                        style={{
                          backgroundColor: {
                            'chapter_event': '#1890ff',
                            'character_event': '#52c41a',
                            'world_event': '#fa8c16',
                            'plot_event': '#eb2f96'
                          }[type] || '#666'
                        }}
                      />
                      <Text className="text-sm">{label}</Text>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        ]}
      />

      {/* 创建时间线对话框 */}
      <Modal
        title="创建时间线"
        open={isCreateModalVisible}
        onOk={createTimeline}
        onCancel={() => setIsCreateModalVisible(false)}
        okText="创建"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入时间线名称' }]}>
            <Input placeholder="如：主线剧情、支线故事等" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="时间线的用途和说明" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加事件对话框 */}
      <Modal
        title="添加事件"
        open={isAddEventModalVisible}
        onOk={addEvent}
        onCancel={() => setIsAddEventModalVisible(false)}
        okText="添加"
        cancelText="取消"
        width={600}
      >
        <Form form={eventForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="title" label="事件标题" rules={[{ required: true, message: '请输入事件标题' }]}>
                <Input placeholder="事件的简要描述" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="事件类型" rules={[{ required: true, message: '请选择事件类型' }]}>
                <Select placeholder="选择事件类型">
                  <Select.Option value="chapter_event">章节事件</Select.Option>
                  <Select.Option value="character_event">角色事件</Select.Option>
                  <Select.Option value="world_event">世界事件</Select.Option>
                  <Select.Option value="plot_event">剧情事件</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="description" label="事件详情">
            <TextArea rows={3} placeholder="事件的详细描述" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="start_time" label="开始时间">
                <Input type="datetime-local" placeholder="事件开始时间" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="duration" label="持续时间（小时）">
                <Input type="number" placeholder="事件持续时间" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  )
}
