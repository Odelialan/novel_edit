'use client'

import { useState, useEffect } from 'react'
import { Card, Button, Space, Input, Modal, Form, Typography, Tag, Popconfirm, Table, Avatar, Select, Tabs, App } from 'antd'
import { UserOutlined, PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, ShareAltOutlined, RobotOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import CharacterRelationshipGraph from './CharacterRelationshipGraph'

const { Title, Text } = Typography
const { Search } = Input
const { TextArea } = Input
const { TabPane } = Tabs

interface Character {
  id: string
  name: string
  aliases: string[]
  gender?: string
  age?: number
  appearance?: string
  personality?: string
  relationships: Array<{
    target: string
    relation: string
  }>
  notes?: string
  novel_id: string
  created_at: string
  updated_at: string
  role_type?: string
  profile?: Record<string, any>
  tags?: string[] // 新增 tags 字段
  importance?: string // 新增 importance 字段
}

interface CharacterManagerProps {
  novelId: string
}

export default function CharacterManager({ novelId }: CharacterManagerProps) {
  const { message } = App.useApp()
  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false)
  const [isEditModalVisible, setIsEditModalVisible] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const { token } = useAuthStore()
  
  // 新增筛选状态
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedImportance, setSelectedImportance] = useState<string>('')
  const [selectedRoleType, setSelectedRoleType] = useState<string>('')
  const [availableTags, setAvailableTags] = useState<string[]>([])
  
  const roleTypeOptions = [
    { label: '女主角', value: '女主角' },
    { label: '男主角', value: '男主角' },
    { label: '女二', value: '女二' },
    { label: '男二', value: '男二' },
    { label: '女三', value: '女三' },
    { label: '男三', value: '男三' },
    { label: '配角', value: '配角' }
  ]
  
  const importanceOptions = [
    { label: '主要角色', value: 'main' },
    { label: '重要配角', value: 'supporting' },
    { label: '次要角色', value: 'minor' }
  ]
  
  const [aiForm] = Form.useForm()
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResults, setAiResults] = useState<Array<{ role_type: string, data: any }>>([])
  const [detailCharacter, setDetailCharacter] = useState<Character | null>(null)
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState<string>('')

  useEffect(() => {
    loadCharacters()
  }, [novelId])

  // 提取所有可用标签
  useEffect(() => {
    if (characters.length > 0) {
      const allTags = new Set<string>()
      characters.forEach(char => {
        if (char.tags) {
          char.tags.forEach(tag => allTags.add(tag))
        }
      })
      setAvailableTags(Array.from(allTags))
    }
  }, [characters])

  const loadCharacters = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelId)}/characters`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          const list = Array.isArray(result.data?.characters) ? result.data.characters : (Array.isArray(result.data) ? result.data : [])
          setCharacters(list)
        }
      }
    } catch (error) {
      message.error('加载角色列表失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCharacter = async (values: any) => {
    try {
      let profileObj: any = undefined
      if (values.profile) {
        try { profileObj = JSON.parse(values.profile) } catch {}
      }
      const response = await fetch(`/api/novels/${encodeURIComponent(novelId)}/characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: values.name,
          aliases: values.aliases ? values.aliases.split(',').map((s: string) => s.trim()) : [],
          tags: values.tags ? values.tags.split(',').map((s: string) => s.trim()).filter((s: string) => !!s) : [],
          importance: values.importance || undefined,
          gender: values.gender,
          age: values.age ? parseInt(values.age) : undefined,
          appearance: values.appearance,
          personality: values.personality,
          relationships: values.relationships || [],
          notes: values.notes,
          role_type: values.role_type,
          profile: profileObj
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          message.success('角色创建成功')
          setIsCreateModalVisible(false)
          createForm.resetFields()
          loadCharacters()
        }
      }
    } catch (error) {
      message.error('创建角色失败')
    }
  }

  const handleEditCharacter = async (values: any) => {
    if (!editingCharacter) return

    try {
      let profileObj: any = undefined
      if (values.profile) {
        try { profileObj = JSON.parse(values.profile) } catch {}
      }
      const response = await fetch(`/api/novels/${encodeURIComponent(novelId)}/characters/${encodeURIComponent(editingCharacter.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: values.name,
          aliases: values.aliases ? values.aliases.split(',').map((s: string) => s.trim()) : [],
          tags: values.tags ? values.tags.split(',').map((s: string) => s.trim()).filter((s: string) => !!s) : [],
          importance: values.importance || undefined,
          gender: values.gender,
          age: values.age ? parseInt(values.age) : undefined,
          appearance: values.appearance,
          personality: values.personality,
          relationships: values.relationships || [],
          notes: values.notes,
          role_type: values.role_type,
          profile: profileObj
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          message.success('角色更新成功')
          setIsEditModalVisible(false)
          setEditingCharacter(null)
          editForm.resetFields()
          loadCharacters()
        }
      }
    } catch (error) {
      message.error('更新角色失败')
    }
  }

  const handleDeleteCharacter = async (characterId: string) => {
    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelId)}/characters/${encodeURIComponent(characterId)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        message.success('角色删除成功')
        loadCharacters()
      }
    } catch (error) {
      message.error('删除角色失败')
    }
  }

  const openEditModal = (character: Character) => {
    setEditingCharacter(character)
    editForm.setFieldsValue({
      name: character.name,
      aliases: character.aliases.join(', '),
      gender: character.gender,
      age: character.age,
      appearance: character.appearance,
      personality: character.personality,
      relationships: character.relationships,
      notes: character.notes,
      role_type: character.role_type,
      profile: character.profile ? JSON.stringify(character.profile, null, 2) : undefined
    })
    setIsEditModalVisible(true)
  }

  // 高级筛选逻辑
  const filteredCharacters = (Array.isArray(characters) ? characters : []).filter(character => {
    // 文本搜索
    const textMatch = character.name.toLowerCase().includes(searchText.toLowerCase()) ||
      character.aliases.some(alias => alias.toLowerCase().includes(searchText.toLowerCase()))
    
    // 标签筛选
    const tagMatch = selectedTags.length === 0 || 
      (character.tags && selectedTags.some(tag => character.tags!.includes(tag)))
    
    // 重要性筛选
    const importanceMatch = !selectedImportance || character.importance === selectedImportance
    
    // 角色类型筛选
    const roleTypeMatch = !selectedRoleType || character.role_type === selectedRoleType
    
    return textMatch && tagMatch && importanceMatch && roleTypeMatch
  })

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys)
  }

  const columns = [
    {
      title: '角色',
      key: 'name',
      width: 150,
      render: (character: Character) => (
        <div className="flex items-center">
          <Avatar 
            size={40}
            icon={<UserOutlined />} 
            className="mr-3 bg-gradient-to-r from-blue-500 to-purple-600 shadow-md"
          />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-800 text-sm">{character.name}</div>
            {character.aliases.length > 0 && (
              <div className="text-xs text-gray-500">
                别名: {character.aliases.join(', ')}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: '类型',
      dataIndex: 'role_type',
      key: 'role_type',
      width: 100,
      render: (role: string) => role ? (
        <Tag 
          color={role === '男主角' ? 'blue' : role === '女主角' ? 'pink' : 'green'} 
          className="px-3 py-1 rounded-full font-medium"
        >
          {role}
        </Tag>
      ) : (
        <span className="text-gray-400">-</span>
      )
    },
    {
      title: '性别/年龄',
      key: 'gender_age',
      width: 100,
      render: (character: Character) => (
        <div className="text-center">
          <div className="mb-2">
            {character.gender ? (
              <Tag 
                color={character.gender === 'male' ? 'blue' : 'pink'} 
                className="px-2 py-1 rounded-full"
              >
                {character.gender === 'male' ? '男' : '女'}
              </Tag>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
          <div className="text-sm text-gray-600 font-medium">
            {character.age ? `${character.age}岁` : '-'}
          </div>
        </div>
      )
    },
    {
      title: '身份职业',
      key: 'identity',
      width: 250,
      render: (character: Character) => (
        <div className="text-sm">
          {character.profile?.['身份职业'] ? (
            <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
              <div className="text-gray-700 whitespace-pre-wrap">
                {character.profile['身份职业']}
              </div>
            </div>
          ) : (
            <span className="text-gray-400">未设定</span>
          )}
        </div>
      )
    },
    {
      title: '性格特点',
      key: 'personality',
      width: 250,
      render: (character: Character) => (
        <div className="text-sm">
          {character.personality ? (
            <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
              <div className="text-gray-700 whitespace-pre-wrap">
                {character.personality}
              </div>
            </div>
          ) : (
            <span className="text-gray-400">未设定</span>
          )}
        </div>
      )
    },
    {
      title: '外貌描述',
      key: 'appearance',
      width: 250,
      render: (character: Character) => (
        <div className="text-sm">
          {character.appearance ? (
            <div className="bg-purple-50 p-3 rounded-lg border-l-4 border-purple-400">
              <div className="text-gray-700 whitespace-pre-wrap">
                {character.appearance}
              </div>
            </div>
          ) : (
            <span className="text-gray-400">未设定</span>
          )}
        </div>
      )
    },
    {
      title: '社会阶层',
      key: 'social_class',
      width: 120,
      render: (character: Character) => (
        <div className="text-sm">
          {character.profile?.['社会阶层'] ? (
            <div className="bg-gray-50 p-2 rounded border-l-2 border-gray-400">
              <div className="text-gray-700">
                {character.profile['社会阶层']}
              </div>
            </div>
          ) : (
            <span className="text-gray-400">未设定</span>
          )}
        </div>
      )
    },
    {
      title: '关系',
      key: 'relationships',
      width: 120,
      render: (character: Character) => (
        <div className="space-y-1">
          {character.relationships.length > 0 ? (
            character.relationships.map((rel, index) => (
              <Tag key={index} color="green" className="text-xs px-2 py-1 mb-1 block">
                {rel.relation}
              </Tag>
            ))
          ) : (
            <span className="text-gray-400 text-sm">无关系</span>
          )}
        </div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (character: Character) => (
        <Space direction="vertical" size={4}>
          <Button
            type="text"
            onClick={() => setDetailCharacter(character)}
            size="small"
            title="查看详情"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1 rounded w-full"
          >
            详情
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(character)}
            size="small"
            title="编辑角色"
            className="text-green-600 hover:text-green-700 hover:bg-green-50 px-3 py-1 rounded w-full"
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个角色吗？"
            description="删除后无法恢复。"
            onConfirm={() => handleDeleteCharacter(character.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* 页面头部 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Title level={2} className="!mb-2 text-gray-800 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <TeamOutlined className="text-white text-lg" />
                </div>
                角色管理
              </Title>
              <p className="text-gray-600 ml-11">管理小说中的角色设定和关系</p>
            </div>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setIsCreateModalVisible(true)}
              size="large"
              className="shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-600 border-0"
            >
              创建角色
            </Button>
          </div>
          
          {/* 搜索和筛选区域 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
            <div className="flex flex-wrap items-center gap-4">
              <Search
                placeholder="搜索角色姓名或别名..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 300 }}
                size="large"
                className="flex-1 min-w-64"
                prefix={<UserOutlined className="text-gray-400" />}
              />
              
              <Select
                placeholder="角色类型"
                value={selectedRoleType}
                onChange={setSelectedRoleType}
                allowClear
                style={{ width: 140 }}
                size="large"
                className="min-w-32"
              >
                {roleTypeOptions.map(option => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
              
              <Select
                placeholder="重要性"
                value={selectedImportance}
                onChange={setSelectedImportance}
                allowClear
                style={{ width: 120 }}
                size="large"
              >
                {importanceOptions.map(option => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* 使用Tabs展示角色列表和关系图 */}
        <Tabs 
          defaultActiveKey="list" 
          size="large"
          className="bg-white rounded-2xl shadow-lg p-6"
          items={[
          {
            key: 'list',
            label: (
              <span>
                <TeamOutlined />
                角色列表
              </span>
            ),
            children: (
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                            <TeamOutlined className="text-white text-lg" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-800">角色列表</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              共 {filteredCharacters.length} 个角色
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Tag color="blue" className="px-3 py-1">
                            {filteredCharacters.filter(c => c.role_type === '男主角').length} 男主角
                          </Tag>
                          <Tag color="pink" className="px-3 py-1">
                            {filteredCharacters.filter(c => c.role_type === '女主角').length} 女主角
                          </Tag>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table
                        columns={columns}
                        dataSource={filteredCharacters}
                        rowKey="id"
                        loading={isLoading}
                        rowSelection={rowSelection}
                        pagination={{
                          pageSize: 5,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                          className: "px-6 py-4"
                        }}
                        className="w-full"
                        size="middle"
                        rowClassName="hover:bg-blue-50 transition-colors"
                        scroll={{ x: 1400 }}
                        components={{
                          body: {
                            row: (props: any) => (
                              <tr {...props} className="align-top" />
                            )
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-1 space-y-4">
                  {detailCharacter && (
                    <Card 
                      title={
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Avatar 
                              size={48}
                              icon={<UserOutlined />} 
                              className="mr-4 bg-gradient-to-r from-blue-500 to-purple-600"
                            />
                            <div>
                              <div className="font-semibold text-xl text-gray-800">{detailCharacter.name}</div>
                              <div className="flex items-center space-x-2 mt-1">
                                {detailCharacter.role_type && (
                                  <Tag color="blue" className="px-2 py-1 rounded-full">
                                    {detailCharacter.role_type}
                                  </Tag>
                                )}
                                {detailCharacter.gender && (
                                  <Tag color={detailCharacter.gender === 'male' ? 'blue' : 'pink'} className="px-2 py-1 rounded-full">
                                    {detailCharacter.gender === 'male' ? '男' : '女'}
                                  </Tag>
                                )}
                                {detailCharacter.age && (
                                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                    {detailCharacter.age}岁
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button 
                            size="small" 
                            onClick={() => setDetailCharacter(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            关闭
                          </Button>
                        </div>
                      }
                      className="h-full shadow-lg border border-gray-100"
                    >
                  <div className="space-y-4 text-sm max-h-96 overflow-y-auto">
                    {/* 基本信息 */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="font-medium text-base mb-2 text-gray-700">基本信息</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div><b>角色类型：</b>{detailCharacter.role_type || '未设定'}</div>
                        <div><b>性别：</b>{detailCharacter.gender === 'male' ? '男' : detailCharacter.gender === 'female' ? '女' : '未设定'}</div>
                        <div><b>年龄：</b>{detailCharacter.age ? `${detailCharacter.age}岁` : '未设定'}</div>
                        <div><b>别名：</b>{detailCharacter.aliases.length > 0 ? detailCharacter.aliases.join(', ') : '无'}</div>
                      </div>
                    </div>

                    {/* 外貌描述 */}
                    {detailCharacter.appearance && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h4 className="font-medium text-base mb-2 text-blue-700">外貌描述</h4>
                        <p className="text-gray-700 leading-relaxed">{detailCharacter.appearance}</p>
                      </div>
                    )}

                    {/* 性格特点 */}
                    {detailCharacter.personality && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <h4 className="font-medium text-base mb-2 text-green-700">性格特点</h4>
                        <p className="text-gray-700 leading-relaxed">{detailCharacter.personality}</p>
                      </div>
                    )}

                    {/* 详细设定 */}
                    {detailCharacter.profile && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-base text-gray-700">详细设定</h4>
                        
                        {detailCharacter.profile['身份职业'] && (
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <h5 className="font-medium text-purple-700 mb-1">身份职业</h5>
                            <p className="text-gray-700">{detailCharacter.profile['身份职业']}</p>
                          </div>
                        )}

                        {detailCharacter.profile['家庭关系'] && (
                          <div className="bg-orange-50 p-3 rounded-lg">
                            <h5 className="font-medium text-orange-700 mb-1">家庭关系</h5>
                            <p className="text-gray-700">{detailCharacter.profile['家庭关系']}</p>
                          </div>
                        )}

                        {detailCharacter.profile['早年经历'] && (
                          <div className="bg-indigo-50 p-3 rounded-lg">
                            <h5 className="font-medium text-indigo-700 mb-1">早年经历</h5>
                            <p className="text-gray-700">{detailCharacter.profile['早年经历']}</p>
                          </div>
                        )}

                        {detailCharacter.profile['观念信仰'] && (
                          <div className="bg-pink-50 p-3 rounded-lg">
                            <h5 className="font-medium text-pink-700 mb-1">观念信仰</h5>
                            <p className="text-gray-700">{detailCharacter.profile['观念信仰']}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          {detailCharacter.profile['优点'] && (
                            <div className="bg-green-50 p-3 rounded-lg">
                              <h5 className="font-medium text-green-700 mb-1">优点</h5>
                              <p className="text-gray-700 text-sm">{detailCharacter.profile['优点']}</p>
                            </div>
                          )}

                          {detailCharacter.profile['缺点'] && (
                            <div className="bg-red-50 p-3 rounded-lg">
                              <h5 className="font-medium text-red-700 mb-1">缺点</h5>
                              <p className="text-gray-700 text-sm">{detailCharacter.profile['缺点']}</p>
                            </div>
                          )}
                        </div>

                        {detailCharacter.profile['成就'] && (
                          <div className="bg-yellow-50 p-3 rounded-lg">
                            <h5 className="font-medium text-yellow-700 mb-1">主要成就</h5>
                            <p className="text-gray-700">{detailCharacter.profile['成就']}</p>
                          </div>
                        )}

                        {detailCharacter.profile['社会阶层'] && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <h5 className="font-medium text-gray-700 mb-1">社会阶层</h5>
                            <p className="text-gray-700">{detailCharacter.profile['社会阶层']}</p>
                          </div>
                        )}

                        {detailCharacter.profile['习惯嗜好'] && (
                          <div className="bg-teal-50 p-3 rounded-lg">
                            <h5 className="font-medium text-teal-700 mb-1">习惯嗜好</h5>
                            <p className="text-gray-700">{detailCharacter.profile['习惯嗜好']}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 关系网络 */}
                    {detailCharacter.relationships.length > 0 && (
                      <div className="bg-cyan-50 p-3 rounded-lg">
                        <h4 className="font-medium text-base mb-2 text-cyan-700">关系网络</h4>
                        <div className="flex flex-wrap gap-2">
                          {detailCharacter.relationships.map((rel, index) => (
                            <Tag key={index} color="cyan" className="mb-1">
                              {rel.target}: {rel.relation}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 备注信息 */}
                    {detailCharacter.notes && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h4 className="font-medium text-base mb-2 text-gray-700">备注信息</h4>
                        <p className="text-gray-700 whitespace-pre-wrap">{detailCharacter.notes}</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}
                  <Card 
                    title={
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mr-3">
                          <RobotOutlined className="text-white" />
                        </div>
                        <span className="text-lg font-semibold">AI 生成角色</span>
                      </div>
                    }
                    className="shadow-lg border border-gray-100"
                    extra={
                      <Space>
                        <Button 
                          type="primary" 
                          loading={aiLoading} 
                          className="bg-gradient-to-r from-green-500 to-blue-500 border-0 shadow-md hover:shadow-lg transition-all"
                          onClick={async () => {
                  try {
                    const v = await aiForm.validateFields()
                    const roles: string[] = v.role_types || []
                    if (!roles.length) { message.warning('请先选择角色类型'); return }
                    setAiLoading(true)
                    
                    // 获取小说信息
                    let novelInfo = ''
                    try {
                      const novelRes = await fetch(`/api/novels/${encodeURIComponent(novelId)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      })
                      if (novelRes.ok) {
                        const novelData = await novelRes.json()
                        if (novelData.ok && novelData.data?.novel_info) {
                          const novel = novelData.data.novel_info
                          const meta = novel.meta || {}
                          novelInfo = `小说类型：${meta.genre || '未知'}\n篇幅：${meta.target_length || '未知'}\n标签：${(meta.tags || []).join(', ')}\n描述：${meta.description || '暂无描述'}`
                        }
                      }
                    } catch (e) {
                      console.warn('获取小说信息失败:', e)
                    }
                    
                    const seed: any = {
                      name: v.name,
                      aliases: v.aliases ? v.aliases.split(',').map((s: string) => s.trim()) : [],
                      gender: v.gender,
                      age: v.age ? parseInt(v.age) : undefined,
                      appearance: v.appearance,
                      personality: v.personality,
                      profile: v.profile ? JSON.parse(v.profile) : undefined
                    }
                    
                    // 构建完整的故事信息
                    const fullStoryInfo = [novelInfo, v.story_info].filter(Boolean).join('\n\n')
                    
                    // 显示提示词内容
                    const promptContent = `小说信息：\n${novelInfo}\n\n故事信息：\n${v.story_info || '无'}\n\n角色种子信息：\n${JSON.stringify(seed, null, 2)}\n\n角色类型：${roles.join(', ')}`
                    setCurrentPrompt(promptContent)
                    setShowPromptModal(true)
                    
                    let created = 0
                    for (const rt of roles) {
                      const resp = await fetch('/api/ai/character/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ novel_id: novelId, role_type: rt, seed, story_info: fullStoryInfo })
                      })
                      const j = resp.ok ? await resp.json() : { ok: false }
                      if (!j.ok) continue
                      const aiResult = j.data?.profile || {}
                      const payload = {
                        name: seed.name || aiResult.name || `新角色-${rt}`,
                        aliases: seed.aliases || [],
                        gender: seed.gender || aiResult.gender,
                        age: seed.age || aiResult.age,
                        appearance: aiResult.appearance || seed.appearance,
                        personality: aiResult.personality || seed.personality,
                        relationships: [],
                        notes: undefined,
                        role_type: aiResult.role_type || rt,
                        profile: aiResult.profile || undefined
                      }
                      const cRes = await fetch(`/api/novels/${encodeURIComponent(novelId)}/characters`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(payload)
                      })
                      if (cRes.ok) created++
                    }
                    await loadCharacters()
                    if (created > 0) message.success(`已根据类型生成 ${created} 个角色`)
                    else message.error('生成失败，请调整输入后重试')
                  } catch (e) {
                    message.error('请检查表单输入')
                  } finally {
                    setAiLoading(false)
                  }
                }}>生成</Button>
                <Button loading={aiLoading} onClick={async () => {
                  try {
                    // 自动获取小说信息并生成角色设计提示词
                    setAiLoading(true)
                    
                    // 获取小说信息
                    const novelInfoRes = await fetch(`/api/character-design/novel-info/${encodeURIComponent(novelId)}`, {
                      headers: { 'Authorization': `Bearer ${token}` }
                    })
                    
                    if (!novelInfoRes.ok) {
                      throw new Error('获取小说信息失败')
                    }
                    
                    const novelInfo = await novelInfoRes.json()
                    if (!novelInfo.success) {
                      throw new Error(novelInfo.message || '获取小说信息失败')
                    }
                    
                    const { novel_type, outline, heroine_profile } = novelInfo.data
                    
                    // 获取选中的角色
                    const selected = selectedRowKeys as string[]
                    if (!selected?.length) {
                      message.warning('请先勾选要生成设计的角色')
                      return
                    }
                    
                    // 显示提示词内容
                    const selectedCharacters = characters.filter(c => selected.includes(c.id))
                    const promptContent = `小说信息：\n类型：${novel_type}\n大纲：${outline}\n女主角信息：${heroine_profile || '无'}\n\n选中的角色：\n${selectedCharacters.map(c => `- ${c.name} (${c.role_type || '未知类型'})`).join('\n')}`
                    setCurrentPrompt(promptContent)
                    setShowPromptModal(true)
                    
                    let generatedCount = 0
                    for (const charId of selected) {
                      const character = characters.find(c => c.id === charId)
                      if (!character) continue
                      
                      // 根据角色类型选择API
                      const isHero = character.role_type === '男主角' || character.gender === '男'
                      const endpoint = isHero ? '/api/character-design/design-hero' : '/api/character-design/design-heroine'
                      
                      // 构建角色设计要求
                      const characterDesign = `角色姓名：${character.name}\n角色类型：${character.role_type || '未知'}\n性别：${character.gender || '未知'}\n年龄：${character.age || '未知'}\n外貌：${character.appearance || '待设定'}\n性格：${character.personality || '待设定'}`
                      
                      const requestData = {
                        novel_type: novel_type || '未知类型',
                        outline: outline || '暂无大纲',
                        plot: '', // 可不传参
                        character_design: characterDesign,
                        heroine_profile: isHero ? heroine_profile : undefined
                      }
                      
                      try {
                        const designRes = await fetch(endpoint, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(requestData)
                        })
                        
                        if (designRes.ok) {
                          const designResult = await designRes.json()
                          if (designResult.success) {
                            // 将生成的提示词保存到角色备注中
                            const updatedCharacter = {
                              ...character,
                              notes: `AI角色设计提示词：\n\n${designResult.data.prompt}\n\n---\n生成时间：${new Date().toLocaleString()}`
                            }
                            
                            await fetch(`/api/novels/${encodeURIComponent(novelId)}/characters/${encodeURIComponent(charId)}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify(updatedCharacter)
                            })
                            
                            generatedCount++
                          }
                        }
                      } catch (error) {
                        console.error(`生成角色 ${character.name} 设计失败:`, error)
                      }
                    }
                    
                    if (generatedCount > 0) {
                      await loadCharacters()
                      message.success(`已为 ${generatedCount} 个角色生成设计提示词`)
                    } else {
                      message.warning('没有成功生成任何角色设计')
                    }
                    
                  } catch (error) {
                    console.error('自动生成角色设计失败:', error)
                    message.error('自动生成角色设计失败，请稍后重试')
                  } finally {
                    setAiLoading(false)
                  }
                }}>自动生成设计</Button>
                <Button loading={aiLoading} onClick={async () => {
                  try {
                    if (!filteredCharacters.length) { message.info('请先选择左侧要补齐的角色'); return }
                    const selected = selectedRowKeys as string[]
                    if (!selected?.length) { message.warning('请在表格中勾选一个或多个角色'); return }
                    const v = aiForm.getFieldsValue()
                    setAiLoading(true)
                    
                    // 获取小说信息
                    let novelInfo = ''
                    try {
                      const novelRes = await fetch(`/api/novels/${encodeURIComponent(novelId)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      })
                      if (novelRes.ok) {
                        const novelData = await novelRes.json()
                        if (novelData.ok && novelData.data?.novel_info) {
                          const novel = novelData.data.novel_info
                          const meta = novel.meta || {}
                          novelInfo = `小说类型：${meta.genre || '未知'}\n篇幅：${meta.target_length || '未知'}\n标签：${(meta.tags || []).join(', ')}\n描述：${meta.description || '暂无描述'}`
                        }
                      }
                    } catch (e) {
                      console.warn('获取小说信息失败:', e)
                    }
                    
                    // 构建完整的故事信息
                    const fullStoryInfo = [novelInfo, v.story_info].filter(Boolean).join('\n\n')
                    
                    for (const id of selected) {
                      const c = characters.find(x => x.id === id)
                      if (!c) continue
                      // 用现有角色字段作为种子
                      const seed = {
                        name: c.name,
                        aliases: c.aliases,
                        gender: c.gender,
                        age: c.age,
                        appearance: c.appearance,
                        personality: c.personality,
                        role_type: c.role_type,
                        profile: c.profile
                      }
                      const resp = await fetch('/api/ai/character/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ novel_id: novelId, role_type: seed.role_type || (v.role_types?.[0] || '配角'), seed, story_info: fullStoryInfo })
                      })
                      const j = resp.ok ? await resp.json() : { ok: false }
                      if (!j.ok) continue
                      const aiResult = j.data?.profile || {}
                      // 仅填补缺失字段
                      const merged = {
                        name: c.name || aiResult.name,
                        aliases: c.aliases || [],
                        gender: c.gender || aiResult.gender,
                        age: c.age || aiResult.age,
                        appearance: c.appearance || aiResult.appearance,
                        personality: c.personality || aiResult.personality,
                        role_type: c.role_type || aiResult.role_type,
                        profile: { ...(c.profile || {}), ...(aiResult.profile || {}) }
                      }
                      await fetch(`/api/novels/${encodeURIComponent(novelId)}/characters/${encodeURIComponent(id)}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(merged)
                      })
                      if (detailCharacter?.id === id) {
                        setDetailCharacter({ ...detailCharacter, ...merged })
                      }
                    }
                    await loadCharacters()
                    message.success('已补齐所选角色')
                  } catch (e) {
                    message.error('补齐失败，请稍后重试')
                  } finally {
                    setAiLoading(false)
                  }
                }}>补齐所选</Button>
              </Space>}>
                <Form form={aiForm} layout="vertical" initialValues={{}}>
                  <Form.Item name="role_types" label="角色类型（可多选）" rules={[{ required: true, message: '请选择至少一个角色类型' }]}>
                    <Select mode="multiple" options={roleTypeOptions} placeholder="选择要生成的角色类别" />
                  </Form.Item>
                  <Form.Item label="提示词（只读，来自 ai_character_prompts.json）">
                    <div className="text-xs text-gray-500">将自动按上方角色类型读取，无需在此维护。</div>
                  </Form.Item>
                  <Form.Item name="name" label="角色姓名（可选）">
                    <Input placeholder="留空可由AI建议" />
                  </Form.Item>
                  <Form.Item name="aliases" label="别名（可选）" extra="多个用逗号分隔">
                    <Input />
                  </Form.Item>
                  <div className="grid grid-cols-2 gap-4">
                    <Form.Item name="gender" label="性别">
                      <Input placeholder="男/女" />
                    </Form.Item>
                    <Form.Item name="age" label="年龄">
                      <Input type="number" />
                    </Form.Item>
                  </div>
                  <Form.Item name="appearance" label="外貌（可选）">
                    <TextArea rows={2} />
                  </Form.Item>
                  <Form.Item name="personality" label="性格（可选）">
                    <TextArea rows={2} />
                  </Form.Item>
                  <Form.Item name="profile" label="已有设定（JSON，可选）">
                    <TextArea rows={3} placeholder='{"身份职业":"...","家庭关系":"..."}' />
                  </Form.Item>
                  <Form.Item name="story_info" label="故事信息/标签（可选）">
                    <TextArea rows={3} placeholder="有助于AI匹配设定，例如：古代言情/仙侠/校园等" />
                  </Form.Item>
                </Form>
                {aiResults.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {aiResults.map((r, idx) => (
                      <Card key={idx} size="small" title={<span>建议：<Tag color="geekblue">{r.role_type}</Tag></span>} extra={<Button size="small" onClick={() => {
                        const p = r.data
                        createForm.setFieldsValue({
                          appearance: p.appearance,
                          personality: p.personality,
                          role_type: p.role_type || r.role_type,
                          profile: p.profile ? JSON.stringify(p.profile, null, 2) : undefined
                        })
                        message.success('已应用到创建表单')
                      }}>应用到表单</Button>}>
                        <div className="text-xs text-gray-600 line-clamp-3">{(r.data?.appearance || '') + ' / ' + (r.data?.personality || '')}</div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
            )
          },
          {
            key: 'graph',
            label: (
              <span>
                <ShareAltOutlined />
                关系图
              </span>
            ),
            children: (
              <CharacterRelationshipGraph 
                characters={characters} 
                loading={isLoading} 
              />
            )
          }
        ]}
      />

      {/* 创建角色模态框 */}
      <Modal
        title="创建新角色"
        open={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateCharacter}
        >
          <Form.Item
            name="name"
            label="角色姓名"
            rules={[{ required: true, message: '请输入角色姓名' }]}
          >
            <Input placeholder="请输入角色姓名" />
          </Form.Item>

          <Form.Item
            name="aliases"
            label="别名（可选）"
            extra="多个别名用逗号分隔"
          >
            <Input placeholder="例如：主角, 英雄, 张三" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="gender" label="性别">
              <Input placeholder="男/女" />
            </Form.Item>
            <Form.Item name="age" label="年龄">
              <Input placeholder="年龄" type="number" />
            </Form.Item>
          </div>

          <Form.Item name="appearance" label="外貌描述">
            <TextArea rows={2} placeholder="描述角色的外貌特征..." />
          </Form.Item>

          <Form.Item name="personality" label="性格特点">
            <TextArea rows={2} placeholder="描述角色的性格特点..." />
          </Form.Item>

          <Form.Item name="role_type" label="角色类型">
            <Select options={roleTypeOptions} placeholder="选择角色类型（可选）" allowClear />
          </Form.Item>

          <Form.Item name="importance" label="重要性">
            <Select options={importanceOptions} placeholder="选择角色重要性" allowClear />
          </Form.Item>

          <Form.Item name="tags" label="标签（可选）" extra="多个标签用逗号分隔">
            <Input placeholder="例如：反派, 智者, 导师" />
          </Form.Item>

          <Form.Item name="profile" label="详细设定（JSON，可选）">
            <TextArea rows={3} placeholder='可填：{"身份职业":"...","家庭关系":"..."}，留空亦可' />
          </Form.Item>

          {/* 关系编辑器 */}
          <Form.List name="relationships">
            {(fields, { add, remove }) => (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Text>关系（可选）</Text>
                  <Button size="small" onClick={() => add({ target: '', relation: '' })}>新增关系</Button>
                </div>
                {fields.map((field) => (
                  <div key={field.key} className="grid grid-cols-5 gap-2 mb-2">
                    <Form.Item {...field} name={[field.name, 'target']} className="col-span-2" rules={[{ required: true, message: '目标角色ID' }]}>
                      <Input placeholder="目标角色ID" />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'relation']} className="col-span-2" rules={[{ required: true, message: '关系类型' }]}>
                      <Input placeholder="关系类型，如：朋友/师徒/同事" />
                    </Form.Item>
                    <Button danger onClick={() => remove(field.name)}>删除</Button>
                  </div>
                ))}
              </div>
            )}
          </Form.List>

          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="其他需要记录的信息..." />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setIsCreateModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                创建角色
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑角色模态框 */}
      <Modal
        title="编辑角色"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false)
          setEditingCharacter(null)
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditCharacter}
        >
          <Form.Item
            name="name"
            label="角色姓名"
            rules={[{ required: true, message: '请输入角色姓名' }]}
          >
            <Input placeholder="请输入角色姓名" />
          </Form.Item>

          <Form.Item
            name="aliases"
            label="别名（可选）"
            extra="多个别名用逗号分隔"
          >
            <Input placeholder="例如：主角, 英雄, 张三" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="gender" label="性别">
              <Input placeholder="男/女" />
            </Form.Item>
            <Form.Item name="age" label="年龄">
              <Input placeholder="年龄" type="number" />
            </Form.Item>
          </div>

          <Form.Item name="appearance" label="外貌描述">
            <TextArea rows={2} placeholder="描述角色的外貌特征..." />
          </Form.Item>

          <Form.Item name="personality" label="性格特点">
            <TextArea rows={2} placeholder="描述角色的性格特点..." />
          </Form.Item>

          <Form.Item name="role_type" label="角色类型">
            <Select options={roleTypeOptions} placeholder="选择角色类型（可选）" allowClear />
          </Form.Item>

          <Form.Item name="importance" label="重要性">
            <Select options={importanceOptions} placeholder="选择角色重要性" allowClear />
          </Form.Item>

          <Form.Item name="tags" label="标签（可选）" extra="多个标签用逗号分隔">
            <Input placeholder="例如：反派, 智者, 导师" />
          </Form.Item>

          <Form.Item name="profile" label="详细设定（JSON，可选）">
            <TextArea rows={3} placeholder='可填：{"身份职业":"...","家庭关系":"..."}，留空亦可' />
          </Form.Item>

          {/* 关系编辑器 */}
          <Form.List name="relationships">
            {(fields, { add, remove }) => (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Text>关系（可选）</Text>
                  <Button size="small" onClick={() => add({ target: '', relation: '' })}>新增关系</Button>
                </div>
                {fields.map((field) => (
                  <div key={field.key} className="grid grid-cols-5 gap-2 mb-2">
                    <Form.Item {...field} name={[field.name, 'target']} className="col-span-2" rules={[{ required: true, message: '目标角色ID' }]}>
                      <Input placeholder="目标角色ID" />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'relation']} className="col-span-2" rules={[{ required: true, message: '关系类型' }]}>
                      <Input placeholder="关系类型，如：朋友/师徒/同事" />
                    </Form.Item>
                    <Button danger onClick={() => remove(field.name)}>删除</Button>
                  </div>
                ))}
              </div>
            )}
          </Form.List>

          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="其他需要记录的信息..." />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => {
                setIsEditModalVisible(false)
                setEditingCharacter(null)
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                更新角色
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 提示词显示Modal */}
      <Modal
        title="AI提示词内容"
        open={showPromptModal}
        onCancel={() => setShowPromptModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowPromptModal(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        <div style={{ maxHeight: '500px', overflow: 'auto' }}>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            fontSize: '12px',
            lineHeight: '1.4',
            backgroundColor: '#f5f5f5',
            padding: '12px',
            borderRadius: '4px',
            border: '1px solid #d9d9d9'
          }}>
            {currentPrompt}
          </pre>
        </div>
      </Modal>
      
      </div>
    </div>
  )
} 