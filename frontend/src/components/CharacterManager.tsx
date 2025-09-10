'use client'

import { useState, useEffect } from 'react'
import { Card, Button, Space, Input, Modal, Form, Typography, Tag, Popconfirm, Avatar, Select, Tabs, App, Pagination } from 'antd'
import { UserOutlined, PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, ShareAltOutlined, RobotOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import CharacterRelationshipGraph from './CharacterRelationshipGraph'

const { Title, Text } = Typography
const { Search } = Input
const { TextArea } = Input

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
  tags?: string[]
  importance?: string
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
  const [aiLoading, setAiLoading] = useState(false)
  const [aiForm] = Form.useForm()
  const [aiResults, setAiResults] = useState<any[]>([])
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(1) // 每页只显示一个角色
  
  const roleTypeOptions = [
    { value: '男主角', label: '男主角' },
    { value: '女主角', label: '女主角' },
    { value: '配角', label: '配角' },
    { value: '女二', label: '女二' },
    { value: '男二', label: '男二' },
    { value: '反派', label: '反派' }
  ]

  const loadCharacters = async () => {
    if (!token || !novelId) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelId)}/characters`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('加载角色响应数据:', data)
        console.log('data.data:', data.data)
        console.log('data.data.characters:', data.data?.characters)
        const characters = data.data?.characters || []
        console.log('最终角色数组:', characters)
        setCharacters(characters)
        console.log('设置角色列表完成，当前characters状态:', characters)
      } else {
        console.error('加载角色失败，状态码:', response.status)
        message.error('加载角色失败')
      }
    } catch (error) {
      console.error('加载角色失败:', error)
      message.error('加载角色失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCharacters()
  }, [novelId, token])

  const filteredCharacters = characters.filter(character => 
    character.name.toLowerCase().includes(searchText.toLowerCase()) ||
    character.aliases.some(alias => alias.toLowerCase().includes(searchText.toLowerCase()))
  )

  // 分页逻辑
  const totalPages = Math.ceil(filteredCharacters.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentCharacters = filteredCharacters.slice(startIndex, endIndex)
  const currentCharacter = currentCharacters[0] // 当前页的角色

  // 调试信息
  console.log('当前characters状态:', characters)
  console.log('当前filteredCharacters状态:', filteredCharacters)
  console.log('搜索文本:', searchText)

  const handleCreateCharacter = async (values: any) => {
    if (!token || !novelId) return

    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelId)}/characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...values,
          aliases: values.aliases ? values.aliases.split(',').map((alias: string) => alias.trim()) : [],
          relationships: values.relationships || []
        })
      })

      if (response.ok) {
          message.success('角色创建成功')
          setIsCreateModalVisible(false)
          createForm.resetFields()
          loadCharacters()
      } else {
        message.error('角色创建失败')
      }
    } catch (error) {
      console.error('创建角色失败:', error)
      message.error('创建角色失败，请稍后重试')
    }
  }

  const handleEditCharacter = async (values: any) => {
    if (!token || !novelId || !editingCharacter) return

    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelId)}/characters/${encodeURIComponent(editingCharacter.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...values,
          aliases: values.aliases ? values.aliases.split(',').map((alias: string) => alias.trim()) : [],
          relationships: values.relationships || []
        })
      })

      if (response.ok) {
          message.success('角色更新成功')
          setIsEditModalVisible(false)
          setEditingCharacter(null)
          editForm.resetFields()
          loadCharacters()
      } else {
        message.error('角色更新失败')
      }
    } catch (error) {
      console.error('更新角色失败:', error)
      message.error('更新角色失败，请稍后重试')
    }
  }

  const handleDeleteCharacter = async (characterId: string) => {
    if (!token || !novelId) return

    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelId)}/characters/${encodeURIComponent(characterId)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        message.success('角色删除成功')
        loadCharacters()
      } else {
        message.error('角色删除失败')
      }
    } catch (error) {
      console.error('删除角色失败:', error)
      message.error('删除角色失败，请稍后重试')
    }
  }

  const openEditModal = (character: Character) => {
    setEditingCharacter(character)
    editForm.setFieldsValue({
      ...character,
      aliases: character.aliases.join(', '),
      profile: character.profile ? JSON.stringify(character.profile, null, 2) : ''
    })
    setIsEditModalVisible(true)
  }

  const handleAiGenerate = async () => {
    if (!token || !novelId) return

                  try {
                    const v = await aiForm.validateFields()
                    const roles: string[] = v.role_types || []
      if (!roles.length) { 
        message.warning('请先选择角色类型')
        return 
      }

                    setAiLoading(true)
      setAiResults([])

      // 构建种子信息
      const seed = {
        name: v.character_name || '',
        aliases: v.character_aliases ? v.character_aliases.split(',').map((s: string) => s.trim()) : [],
        gender: v.character_gender || undefined,
        age: v.character_age || undefined,
        appearance: v.character_appearance || undefined,
        personality: v.character_personality || undefined
      }
                    
                    // 获取小说信息
                      const novelRes = await fetch(`/api/novels/${encodeURIComponent(novelId)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      })
      const novelData = novelRes.ok ? await novelRes.json() : {}
      const novelInfo = `小说名称：${novelData.title || '未命名'}\n小说类型：${novelData.genre || '未设定'}\n故事背景：${novelData.background || '未设定'}`
      
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
      
      if (created > 0) {
        message.success(`成功生成 ${created} 个角色`)
        console.log('AI生成成功，开始重新加载角色列表')
                    await loadCharacters()
        console.log('角色列表重新加载完成')
      } else {
        message.warning('没有成功生成任何角色')
      }
    } catch (error) {
      console.error('AI生成角色失败:', error)
      message.error('AI生成角色失败，请稍后重试')
                  } finally {
                    setAiLoading(false)
                  }
  }

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
                    {/* 角色统计头部 */}
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
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

                    {/* 角色卡片列表 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {filteredCharacters.map((character) => (
                        <Card
                          key={character.id}
                          className="shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-300"
                          actions={[
                            <Button
                              key="edit"
                              type="text"
                              icon={<EditOutlined />}
                              onClick={() => openEditModal(character)}
                              className="text-green-600 hover:text-green-700"
                            >
                              编辑
                            </Button>,
                            <Popconfirm
                              key="delete"
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
                                className="text-red-600 hover:text-red-700"
                              >
                                删除
                              </Button>
                            </Popconfirm>
                          ]}
                        >
                          {/* 角色头部信息 */}
                          <div className="flex items-start mb-4">
                            <Avatar 
                              size={60}
                              icon={<UserOutlined />} 
                              className="mr-4 bg-gradient-to-r from-blue-500 to-purple-600 shadow-md"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="text-lg font-semibold text-gray-800">{character.name}</h4>
                                {character.role_type && (
                                  <Tag 
                                    color={character.role_type === '男主角' ? 'blue' : character.role_type === '女主角' ? 'pink' : 'green'}
                                    className="px-2 py-1 rounded-full text-xs"
                                  >
                                    {character.role_type}
                                  </Tag>
                                )}
                              </div>
                              <div className="flex items-center space-x-3 text-sm text-gray-600">
                                {character.gender && (
                                  <Tag color={(character.gender === 'male' || character.gender === '男') ? 'blue' : 'pink'} className="px-2 py-1 rounded-full">
                                    {(character.gender === 'male' || character.gender === '男') ? '男' : '女'}
                                  </Tag>
                                )}
                                {character.age && (
                                  <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                                    {character.age}岁
                                  </span>
                                )}
                              </div>
                              {character.aliases.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  别名: {character.aliases.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 角色详细信息 */}
                          <div className="space-y-3">
                            {/* 身份职业 */}
                            {character.profile?.['身份职业'] && (
                              <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                                <h5 className="text-sm font-medium text-blue-700 mb-1">身份职业</h5>
                                <p className="text-sm text-gray-700">{character.profile['身份职业']}</p>
                              </div>
                            )}

                            {/* 性格特点 */}
                            {character.personality && (
                              <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                                <h5 className="text-sm font-medium text-green-700 mb-1">性格特点</h5>
                                <p className="text-sm text-gray-700">{character.personality}</p>
                              </div>
                            )}

                            {/* 外貌描述 */}
                            {character.appearance && (
                              <div className="bg-purple-50 p-3 rounded-lg border-l-4 border-purple-400">
                                <h5 className="text-sm font-medium text-purple-700 mb-1">外貌描述</h5>
                                <p className="text-sm text-gray-700">{character.appearance}</p>
                              </div>
                            )}

                            {/* 社会阶层 */}
                            {character.profile?.['社会阶层'] && (
                              <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-gray-400">
                                <h5 className="text-sm font-medium text-gray-700 mb-1">社会阶层</h5>
                                <p className="text-sm text-gray-700">{character.profile['社会阶层']}</p>
                              </div>
                            )}

                            {/* 关系网络 */}
                            {character.relationships.length > 0 && (
                              <div className="bg-cyan-50 p-3 rounded-lg border-l-4 border-cyan-400">
                                <h5 className="text-sm font-medium text-cyan-700 mb-2">关系网络</h5>
                                <div className="flex flex-wrap gap-1">
                                  {character.relationships.map((rel, index) => (
                                    <Tag key={index} color="cyan" className="text-xs px-2 py-1">
                                      {rel.relation}
                                    </Tag>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* 分页 */}
                    {filteredCharacters.length > 0 && (
                      <div className="flex justify-center mt-6">
                        <Pagination
                          current={1}
                          total={filteredCharacters.length}
                          pageSize={6}
                          showSizeChanger={false}
                          showQuickJumper={false}
                          showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
                          className="bg-white px-6 py-3 rounded-lg shadow-sm"
                        />
                      </div>
                    )}
                  </div>
                  <div className="lg:col-span-1 space-y-4">
                    {/* AI生成角色卡片 */}
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
                            onClick={handleAiGenerate}
                          >
                            补齐所选
                          </Button>
                        </Space>
                      }
                    >
                <Form form={aiForm} layout="vertical" initialValues={{}}>
                  <Form.Item name="role_types" label="角色类型（可多选）" rules={[{ required: true, message: '请选择至少一个角色类型' }]}>
                    <Select mode="multiple" options={roleTypeOptions} placeholder="选择要生成的角色类别" />
                  </Form.Item>
                  <Form.Item label="提示词（只读，来自 ai_character_prompts.json）">
                    <div className="text-xs text-gray-500">将自动按上方角色类型读取，无需在此维护。</div>
                  </Form.Item>
                        <Form.Item name="story_info" label="故事信息（可选）">
                          <TextArea rows={3} placeholder="有助于AI匹配设定，例如：古代言情/仙侠/校园等" />
                  </Form.Item>
                        <Form.Item name="character_design" label="角色设计（可选）">
                    <TextArea rows={3} placeholder="有助于AI匹配设定，例如：古代言情/仙侠/校园等" />
                  </Form.Item>
                </Form>
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
              <Select placeholder="选择角色类型">
                {roleTypeOptions.map(option => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
          </Form.Item>

            <Form.Item name="profile" label="详细设定（JSON格式）">
              <TextArea rows={4} placeholder='{"身份职业": "修仙门派弟子", "家庭关系": "孤儿"}' />
          </Form.Item>

            <Form.Item name="notes" label="备注">
              <TextArea rows={2} placeholder="其他备注信息..." />
          </Form.Item>

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

            <Form.Item>
              <Space>
              <Button type="primary" htmlType="submit">
                创建角色
              </Button>
                <Button onClick={() => setIsCreateModalVisible(false)}>
                  取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑角色模态框 */}
      <Modal
        title="编辑角色"
        open={isEditModalVisible}
          onCancel={() => setIsEditModalVisible(false)}
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
              <Select placeholder="选择角色类型">
                {roleTypeOptions.map(option => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
          </Form.Item>

            <Form.Item name="profile" label="详细设定（JSON格式）">
              <TextArea rows={4} placeholder='{"身份职业": "修仙门派弟子", "家庭关系": "孤儿"}' />
          </Form.Item>

            <Form.Item name="notes" label="备注">
              <TextArea rows={2} placeholder="其他备注信息..." />
          </Form.Item>

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

            <Form.Item>
              <Space>
              <Button type="primary" htmlType="submit">
                更新角色
              </Button>
                <Button onClick={() => setIsEditModalVisible(false)}>
                  取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

        {/* 提示词查看模态框 */}
      <Modal
          title="AI提示词"
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
              fontFamily: 'monospace',
            fontSize: '12px',
              lineHeight: '1.5',
              padding: '16px',
            backgroundColor: '#f5f5f5',
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