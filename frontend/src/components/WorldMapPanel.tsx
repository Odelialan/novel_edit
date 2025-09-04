'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { Card, Button, Form, Input, Select, Typography, message, Modal, List, Tag, Space, Drawer, Tabs, Tree, InputNumber, Divider, Row, Col } from 'antd'
import { GlobalOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, LinkOutlined, BookOutlined, TagOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { Text, Title } = Typography
const { TextArea } = Input
const { Search } = Input

interface Location {
  id: string
  name: string
  type: 'city' | 'village' | 'mountain' | 'forest' | 'river' | 'castle' | 'temple' | 'other'
  x: number
  y: number
  description: string
  faction?: string
  importance: 'low' | 'medium' | 'high'
  connections: string[] // 连接的地点ID
  created_at: string
  tags: string[]
  references: string[] // 引用的其他条目ID
}

interface Faction {
  id: string
  name: string
  color: string
  description: string
  territory: string[]
  tags: string[]
  references: string[]
}

interface WorldEntry {
  id: string
  title: string
  type: 'location' | 'faction' | 'character' | 'item' | 'event' | 'concept'
  content: string
  tags: string[]
  references: string[]
  created_at: string
  updated_at: string
  category: string
}

interface WorldMapPanelProps {
  novelId: string
}

export default function WorldMapPanel({ novelId }: WorldMapPanelProps) {
  const { token } = useAuthStore()
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])
  const [locations, setLocations] = useState<Location[]>([])
  const [factions, setFactions] = useState<Faction[]>([])
  const [worldEntries, setWorldEntries] = useState<WorldEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false)
  const [isFactionModalVisible, setIsFactionModalVisible] = useState(false)
  const [isEntryModalVisible, setIsEntryModalVisible] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [editingFaction, setEditingFaction] = useState<Faction | null>(null)
  const [editingEntry, setEditingEntry] = useState<WorldEntry | null>(null)
  const [locationForm] = Form.useForm()
  const [factionForm] = Form.useForm()
  const [entryForm] = Form.useForm()
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<WorldEntry | null>(null)
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false)
  const [isEntryDetailDrawerVisible, setIsEntryDetailDrawerVisible] = useState(false)
  const [activeTab, setActiveTab] = useState('map')
  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    loadWorldData()
  }, [novelId])

  useEffect(() => {
    if (canvasRef.current && activeTab === 'map') {
      drawMap()
    }
  }, [locations, factions, activeTab])

  const loadWorldData = async () => {
    try {
      setLoading(true)
      // 这里应该调用实际的API来加载世界地图数据
      // 暂时使用模拟数据
      const mockLocations: Location[] = [
        {
          id: '1',
          name: '帝都',
          type: 'city',
          x: 200,
          y: 150,
          description: '帝国的政治中心，繁华的大都市',
          faction: '帝国',
          importance: 'high',
          connections: ['2', '3'],
          created_at: new Date().toISOString(),
          tags: ['政治中心', '经济中心', '文化中心'],
          references: ['faction_1', 'event_1']
        },
        {
          id: '2',
          name: '魔法学院',
          type: 'temple',
          x: 300,
          y: 100,
          description: '培养魔法师的高等学府',
          faction: '魔法师协会',
          importance: 'high',
          connections: ['1'],
          created_at: new Date().toISOString(),
          tags: ['教育', '魔法', '研究'],
          references: ['faction_2', 'concept_1']
        }
      ]
      
      const mockFactions: Faction[] = [
        {
          id: '1',
          name: '帝国',
          color: '#ff4d4f',
          description: '统治大陆的中央政权',
          territory: ['1'],
          tags: ['政权', '军事', '统治'],
          references: ['location_1', 'event_1']
        },
        {
          id: '2',
          name: '魔法师协会',
          color: '#722ed1',
          description: '独立的魔法师组织',
          territory: ['2'],
          tags: ['魔法', '独立', '学术'],
          references: ['location_2', 'concept_1']
        }
      ]

      const mockEntries: WorldEntry[] = [
        {
          id: 'concept_1',
          title: '魔法体系',
          type: 'concept',
          content: '这个世界存在多种魔法体系，包括元素魔法、召唤魔法、炼金术等。每种魔法都有其独特的修炼方法和使用规则。',
          tags: ['魔法', '体系', '修炼'],
          references: ['location_2', 'faction_2'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category: '魔法'
        },
        {
          id: 'event_1',
          title: '帝国建立',
          type: 'event',
          content: '在三百年前，伟大的征服者统一了分裂的诸国，建立了统一的帝国，开创了新的时代。',
          tags: ['历史', '统一', '帝国'],
          references: ['faction_1', 'location_1'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category: '历史'
        }
      ]
      
      setLocations(mockLocations)
      setFactions(mockFactions)
      setWorldEntries(mockEntries)
    } catch (error) {
      message.error('加载世界地图失败')
    } finally {
      setLoading(false)
    }
  }

  const drawMap = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 绘制背景
    ctx.fillStyle = '#f0f8ff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // 绘制连接线
    ctx.strokeStyle = '#d9d9d9'
    ctx.lineWidth = 2
    locations.forEach(location => {
      location.connections.forEach(connId => {
        const target = locations.find(l => l.id === connId)
        if (target) {
          ctx.beginPath()
          ctx.moveTo(location.x, location.y)
          ctx.lineTo(target.x, target.y)
          ctx.stroke()
        }
      })
    })
    
    // 绘制地点
    locations.forEach(location => {
      const faction = factions.find(f => f.id === location.faction)
      const color = faction?.color || '#1677ff'
      
      // 绘制地点图标
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(location.x, location.y, 8, 0, Math.PI * 2)
      ctx.fill()
      
      // 绘制边框
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
      
      // 绘制标签
      ctx.fillStyle = '#333'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(location.name, location.x, location.y + 20)
    })
  }

  const saveLocation = async () => {
    try {
      const values = await locationForm.validateFields()
      setLoading(true)
      
      if (editingLocation) {
        // 更新现有地点
        const updated = { ...editingLocation, ...values }
        setLocations(prev => prev.map(l => l.id === editingLocation.id ? updated : l))
        message.success('地点更新成功')
      } else {
        // 创建新地点
        const newLocation: Location = {
          id: `loc_${Date.now()}`,
          ...values,
          connections: [],
          created_at: new Date().toISOString(),
          tags: values.tags || [],
          references: []
        }
        setLocations(prev => [...prev, newLocation])
        message.success('地点创建成功')
      }
      
      setIsLocationModalVisible(false)
      locationForm.resetFields()
      setEditingLocation(null)
    } catch (error) {
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  const saveFaction = async () => {
    try {
      const values = await factionForm.validateFields()
      setLoading(true)
      
      if (editingFaction) {
        // 更新现有势力
        const updated = { ...editingFaction, ...values }
        setFactions(prev => prev.map(f => f.id === editingFaction.id ? updated : f))
        message.success('势力更新成功')
      } else {
        // 创建新势力
        const newFaction: Faction = {
          id: `fac_${Date.now()}`,
          ...values,
          territory: [],
          tags: values.tags || [],
          references: []
        }
        setFactions(prev => [...prev, newFaction])
        message.success('势力创建成功')
      }
      
      setIsFactionModalVisible(false)
      factionForm.resetFields()
      setEditingFaction(null)
    } catch (error) {
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  const saveEntry = async () => {
    try {
      const values = await entryForm.validateFields()
      setLoading(true)
      
      if (editingEntry) {
        // 更新现有条目
        const updated = { ...editingEntry, ...values, updated_at: new Date().toISOString() }
        setWorldEntries(prev => prev.map(e => e.id === editingEntry.id ? updated : e))
        message.success('条目更新成功')
      } else {
        // 创建新条目
        const newEntry: WorldEntry = {
          id: `entry_${Date.now()}`,
          ...values,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: values.tags || [],
          references: []
        }
        setWorldEntries(prev => [...prev, newEntry])
        message.success('条目创建成功')
      }
      
      setIsEntryModalVisible(false)
      entryForm.resetFields()
      setEditingEntry(null)
    } catch (error) {
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  const deleteLocation = (locationId: string) => {
    setLocations(prev => prev.filter(l => l.id !== locationId))
    message.success('地点删除成功')
  }

  const deleteFaction = (factionId: string) => {
    setFactions(prev => prev.filter(f => f.id !== factionId))
    message.success('势力删除成功')
  }

  const deleteEntry = (entryId: string) => {
    setWorldEntries(prev => prev.filter(e => e.id !== entryId))
    message.success('条目删除成功')
  }

  const openLocationModal = (location?: Location) => {
    if (location) {
      setEditingLocation(location)
      locationForm.setFieldsValue(location)
    } else {
      setEditingLocation(null)
      locationForm.resetFields()
    }
    setIsLocationModalVisible(true)
  }

  const openFactionModal = (faction?: Faction) => {
    if (faction) {
      setEditingFaction(faction)
      factionForm.setFieldsValue(faction)
    } else {
      setEditingFaction(null)
      factionForm.resetFields()
    }
    setIsFactionModalVisible(true)
  }

  const openEntryModal = (entry?: WorldEntry) => {
    if (entry) {
      setEditingEntry(entry)
      entryForm.setFieldsValue(entry)
    } else {
      setEditingEntry(null)
      entryForm.resetFields()
    }
    setIsEntryModalVisible(true)
  }

  const showLocationDetail = (location: Location) => {
    setSelectedLocation(location)
    setIsDetailDrawerVisible(true)
  }

  const showEntryDetail = (entry: WorldEntry) => {
    setSelectedEntry(entry)
    setIsEntryDetailDrawerVisible(true)
  }

  const getLocationTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      city: '城市',
      village: '村庄',
      mountain: '山脉',
      forest: '森林',
      river: '河流',
      castle: '城堡',
      temple: '神殿',
      other: '其他'
    }
    return typeMap[type] || type
  }

  const getImportanceColor = (importance: string) => {
    const colorMap: Record<string, string> = {
      low: 'green',
      medium: 'orange',
      high: 'red'
    }
    return colorMap[importance] || 'blue'
  }

  const getEntryTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      location: '地点',
      faction: '势力',
      character: '角色',
      item: '物品',
      event: '事件',
      concept: '概念'
    }
    return typeMap[type] || type
  }

  const getEntryTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      location: 'blue',
      faction: 'red',
      character: 'green',
      item: 'orange',
      event: 'purple',
      concept: 'cyan'
    }
    return colorMap[type] || 'default'
  }

  // 过滤条目
  const filteredEntries = worldEntries.filter(entry => {
    if (searchText && !entry.title.toLowerCase().includes(searchText.toLowerCase()) && 
        !entry.content.toLowerCase().includes(searchText.toLowerCase())) {
      return false
    }
    if (selectedCategory !== 'all' && entry.category !== selectedCategory) {
      return false
    }
    if (selectedTags.length > 0 && !selectedTags.some(tag => entry.tags.includes(tag))) {
      return false
    }
    return true
  })

  // 获取所有标签
  const allTags = Array.from(new Set(worldEntries.flatMap(entry => entry.tags)))
  const allCategories = Array.from(new Set(worldEntries.map(entry => entry.category)))

  return (
    <Card size="small" title={<span><GlobalOutlined className="mr-2" />世界观管理</span>}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'map',
            label: '世界地图',
            children: (
              <div className="space-y-4">
                <div className="mb-4">
                  <canvas 
                    ref={canvasRef} 
                    width={400} 
                    height={300} 
                    className="w-full border rounded cursor-pointer"
                    onClick={(e) => {
                      // 点击画布创建新地点
                      const rect = e.currentTarget.getBoundingClientRect()
                      const x = e.clientX - rect.left
                      const y = e.clientY - rect.top
                      locationForm.setFieldsValue({ x, y })
                      openLocationModal()
                    }}
                  />
                  <Text type="secondary" className="text-xs">点击地图添加新地点</Text>
                </div>

                <Space className="w-full mb-4">
                  <Button 
                    size="small" 
                    icon={<PlusOutlined />} 
                    onClick={() => openLocationModal()}
                  >
                    添加地点
                  </Button>
                  <Button 
                    size="small" 
                    icon={<PlusOutlined />} 
                    onClick={() => openFactionModal()}
                  >
                    添加势力
                  </Button>
                </Space>

                {/* 地点列表 */}
                <div className="mb-4">
                  <Title level={5}>地点列表</Title>
                  <List
                    size="small"
                    dataSource={locations}
                    renderItem={(location) => (
                      <List.Item
                        actions={[
                          <Button key="view" size="small" icon={<EyeOutlined />} onClick={() => showLocationDetail(location)} />,
                          <Button key="edit" size="small" icon={<EditOutlined />} onClick={() => openLocationModal(location)} />,
                          <Button key="delete" size="small" icon={<DeleteOutlined />} onClick={() => deleteLocation(location.id)} />
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <div className="flex items-center gap-2">
                              {location.name}
                              <Tag color={getImportanceColor(location.importance)}>
                                {getLocationTypeLabel(location.type)}
                              </Tag>
                              {location.faction && (
                                <Tag color="blue">{location.faction}</Tag>
                              )}
                            </div>
                          }
                          description={
                            <div>
                              <div>{location.description}</div>
                              <div className="mt-1">
                                {location.tags.map(tag => (
                                  <Tag key={tag} size="small">{tag}</Tag>
                                ))}
                              </div>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </div>

                {/* 势力列表 */}
                <div>
                  <Title level={5}>势力分布</Title>
                  <List
                    size="small"
                    dataSource={factions}
                    renderItem={(faction) => (
                      <List.Item
                        actions={[
                          <Button key="edit" size="small" icon={<EditOutlined />} onClick={() => openFactionModal(faction)} />,
                          <Button key="delete" size="small" icon={<DeleteOutlined />} onClick={() => deleteFaction(faction.id)} />
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: faction.color }}
                              />
                              {faction.name}
                            </div>
                          }
                          description={
                            <div>
                              <div>{faction.description}</div>
                              <div className="mt-1">
                                {faction.tags.map(tag => (
                                  <Tag key={tag} size="small">{tag}</Tag>
                                ))}
                              </div>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </div>
              </div>
            )
          },
          {
            key: 'wiki',
            label: '百科条目',
            children: (
              <div className="space-y-4">
                {/* 搜索和过滤 */}
                <div className="flex gap-4 items-center">
                  <Search
                    placeholder="搜索条目..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 300 }}
                  />
                  <Select
                    placeholder="选择分类"
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    style={{ width: 150 }}
                    options={[
                      { label: '全部', value: 'all' },
                      ...allCategories.map(cat => ({ label: cat, value: cat }))
                    ]}
                  />
                  <Select
                    mode="multiple"
                    placeholder="选择标签"
                    value={selectedTags}
                    onChange={setSelectedTags}
                    style={{ width: 200 }}
                    options={allTags.map(tag => ({ label: tag, value: tag }))}
                  />
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openEntryModal()}>
                    新建条目
                  </Button>
                </div>

                {/* 条目列表 */}
                <List
                  loading={loading}
                  dataSource={filteredEntries}
                  renderItem={(entry) => (
                    <List.Item
                      actions={[
                        <Button key="view" size="small" icon={<EyeOutlined />} onClick={() => showEntryDetail(entry)} />,
                        <Button key="edit" size="small" icon={<EditOutlined />} onClick={() => openEntryModal(entry)} />,
                        <Button key="delete" size="small" icon={<DeleteOutlined />} onClick={() => deleteEntry(entry.id)} />
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <div className="flex items-center gap-2">
                            <BookOutlined />
                            {entry.title}
                            <Tag color={getEntryTypeColor(entry.type)}>
                              {getEntryTypeLabel(entry.type)}
                            </Tag>
                            <Tag color="blue">{entry.category}</Tag>
                          </div>
                        }
                        description={
                          <div>
                            <div className="text-gray-600 mb-2">
                              {entry.content.length > 100 
                                ? `${entry.content.substring(0, 100)}...` 
                                : entry.content
                              }
                            </div>
                            <div className="flex items-center gap-2">
                              <TagOutlined className="text-gray-400" />
                              {entry.tags.map(tag => (
                                <Tag key={tag} size="small">{tag}</Tag>
                              ))}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              更新: {new Date(entry.updated_at).toLocaleDateString()}
                            </div>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </div>
            )
          }
        ]}
      />

      {/* 地点编辑对话框 */}
      <Modal
        title={editingLocation ? '编辑地点' : '添加地点'}
        open={isLocationModalVisible}
        onOk={saveLocation}
        onCancel={() => setIsLocationModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={locationForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="地点名称" rules={[{ required: true }]}>
                <Input placeholder="输入地点名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="地点类型" rules={[{ required: true }]}>
                <Select placeholder="选择地点类型">
                  <Select.Option value="city">城市</Select.Option>
                  <Select.Option value="village">村庄</Select.Option>
                  <Select.Option value="mountain">山脉</Select.Option>
                  <Select.Option value="forest">森林</Select.Option>
                  <Select.Option value="river">河流</Select.Option>
                  <Select.Option value="castle">城堡</Select.Option>
                  <Select.Option value="temple">神殿</Select.Option>
                  <Select.Option value="other">其他</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="description" label="地点描述">
            <TextArea rows={3} placeholder="描述地点的特征、历史等" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="faction" label="所属势力">
                <Select placeholder="选择所属势力" allowClear>
                  {factions.map(f => (
                    <Select.Option key={f.id} value={f.name}>{f.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="importance" label="重要性" rules={[{ required: true }]}>
                <Select placeholder="选择重要性">
                  <Select.Option value="low">低</Select.Option>
                  <Select.Option value="medium">中</Select.Option>
                  <Select.Option value="high">高</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="x" label="X坐标" rules={[{ required: true }]}>
                <InputNumber placeholder="X坐标" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="y" label="Y坐标" rules={[{ required: true }]}>
                <InputNumber placeholder="Y坐标" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 势力编辑对话框 */}
      <Modal
        title={editingFaction ? '编辑势力' : '添加势力'}
        open={isFactionModalVisible}
        onOk={saveFaction}
        onCancel={() => setIsFactionModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={500}
      >
        <Form form={factionForm} layout="vertical">
          <Form.Item name="name" label="势力名称" rules={[{ required: true }]}>
            <Input placeholder="输入势力名称" />
          </Form.Item>
          
          <Form.Item name="color" label="势力颜色" rules={[{ required: true }]}>
            <Input type="color" />
          </Form.Item>
          
          <Form.Item name="description" label="势力描述">
            <TextArea rows={3} placeholder="描述势力的性质、目标等" />
          </Form.Item>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 百科条目编辑对话框 */}
      <Modal
        title={editingEntry ? '编辑条目' : '新建条目'}
        open={isEntryModalVisible}
        onOk={saveEntry}
        onCancel={() => setIsEntryModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={700}
      >
        <Form form={entryForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="title" label="条目标题" rules={[{ required: true }]}>
                <Input placeholder="输入条目标题" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="条目类型" rules={[{ required: true }]}>
                <Select placeholder="选择条目类型">
                  <Select.Option value="location">地点</Select.Option>
                  <Select.Option value="faction">势力</Select.Option>
                  <Select.Option value="character">角色</Select.Option>
                  <Select.Option value="item">物品</Select.Option>
                  <Select.Option value="event">事件</Select.Option>
                  <Select.Option value="concept">概念</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Input placeholder="输入分类名称" />
          </Form.Item>
          
          <Form.Item name="content" label="条目内容" rules={[{ required: true }]}>
            <TextArea rows={6} placeholder="输入条目详细内容，支持Markdown格式" />
          </Form.Item>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签，回车确认" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 地点详情抽屉 */}
      <Drawer
        title="地点详情"
        open={isDetailDrawerVisible}
        onClose={() => setIsDetailDrawerVisible(false)}
        width={400}
      >
        {selectedLocation && (
          <div className="space-y-4">
            <div>
              <Title level={4}>{selectedLocation.name}</Title>
              <div className="flex gap-2 mb-3">
                <Tag color={getImportanceColor(selectedLocation.importance)}>
                  {getLocationTypeLabel(selectedLocation.type)}
                </Tag>
                {selectedLocation.faction && (
                  <Tag color="blue">{selectedLocation.faction}</Tag>
                )}
              </div>
            </div>
            
            <div>
              <Text strong>描述：</Text>
              <p className="mt-2">{selectedLocation.description}</p>
            </div>
            
            <div>
              <Text strong>坐标：</Text>
              <p className="mt-2">({selectedLocation.x}, {selectedLocation.y})</p>
            </div>
            
            <div>
              <Text strong>标签：</Text>
              <div className="mt-2">
                {selectedLocation.tags.map(tag => (
                  <Tag key={tag} className="mb-1">{tag}</Tag>
                ))}
              </div>
            </div>
            
            <div>
              <Text strong>连接地点：</Text>
              <div className="mt-2">
                {selectedLocation.connections.length > 0 ? (
                  selectedLocation.connections.map(connId => {
                    const conn = locations.find(l => l.id === connId)
                    return conn ? (
                      <Tag key={connId} className="mb-1">{conn.name}</Tag>
                    ) : null
                  })
                ) : (
                  <Text type="secondary">无连接地点</Text>
                )}
              </div>
            </div>
            
            <div>
              <Text strong>创建时间：</Text>
              <p className="mt-2">
                {new Date(selectedLocation.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </Drawer>

      {/* 百科条目详情抽屉 */}
      <Drawer
        title="条目详情"
        open={isEntryDetailDrawerVisible}
        onClose={() => setIsEntryDetailDrawerVisible(false)}
        width={500}
      >
        {selectedEntry && (
          <div className="space-y-4">
            <div>
              <Title level={4}>{selectedEntry.title}</Title>
              <div className="flex gap-2 mb-3">
                <Tag color={getEntryTypeColor(selectedEntry.type)}>
                  {getEntryTypeLabel(selectedEntry.type)}
                </Tag>
                <Tag color="blue">{selectedEntry.category}</Tag>
              </div>
            </div>
            
            <div>
              <Text strong>内容：</Text>
              <div className="mt-2 p-3 bg-gray-50 rounded">
                <pre className="whitespace-pre-wrap text-sm">{selectedEntry.content}</pre>
              </div>
            </div>
            
            <div>
              <Text strong>标签：</Text>
              <div className="mt-2">
                {selectedEntry.tags.map(tag => (
                  <Tag key={tag} className="mb-1">{tag}</Tag>
                ))}
              </div>
            </div>
            
            <div>
              <Text strong>引用：</Text>
              <div className="mt-2">
                {selectedEntry.references.length > 0 ? (
                  selectedEntry.references.map(refId => (
                    <Tag key={refId} className="mb-1" icon={<LinkOutlined />}>
                      {refId}
                    </Tag>
                  ))
                ) : (
                  <Text type="secondary">无引用条目</Text>
                )}
              </div>
            </div>
            
            <Divider />
            
            <div className="text-xs text-gray-400">
              <div>创建时间：{new Date(selectedEntry.created_at).toLocaleString()}</div>
              <div>更新时间：{new Date(selectedEntry.updated_at).toLocaleString()}</div>
            </div>
          </div>
        )}
      </Drawer>
    </Card>
  )
}
