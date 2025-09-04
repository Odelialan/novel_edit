'use client'

import { useState, useEffect } from 'react'
import { Card, Button, Space, Input, Modal, Form, Typography, Tag, Popconfirm, Table, Avatar, Select, Tabs, App } from 'antd'
import { UserOutlined, PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, ShareAltOutlined } from '@ant-design/icons'
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
      render: (character: Character) => (
        <div className="flex items-center">
          <Avatar icon={<UserOutlined />} className="mr-3" />
          <div>
            <div className="font-medium">{character.name}</div>
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
      title: '角色类型',
      dataIndex: 'role_type',
      key: 'role_type',
      render: (role: string) => role || '-'
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender: string) => gender ? (
        <Tag color={gender === 'male' ? 'blue' : 'pink'}>{gender === 'male' ? '男' : '女'}</Tag>
      ) : '-'
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
      render: (age: number) => age || '-'
    },
    {
      title: '性格',
      dataIndex: 'personality',
      key: 'personality',
      render: (personality: string) => personality ? (
        <Text className="line-clamp-2">{personality}</Text>
      ) : '-'
    },
    {
      title: '关系',
      key: 'relationships',
      render: (character: Character) => (
        <div className="space-y-1">
          {character.relationships.map((rel, index) => (
            <Tag key={index} color="green">
              {rel.relation}
            </Tag>
          ))}
        </div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (character: Character) => (
        <Space>
          <Button
            type="text"
            onClick={() => setDetailCharacter(character)}
            size="small"
          >
            详情
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(character)}
            size="small"
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
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">
          <TeamOutlined className="mr-2" />
          角色管理
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateModalVisible(true)}
        >
          创建角色
        </Button>
      </div>

      <div className="mb-4">
        <Search
          placeholder="搜索角色姓名或别名..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {/* 使用Tabs展示角色列表和关系图 */}
      <Tabs 
        defaultActiveKey="list" 
        size="large"
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
              <Table
                columns={columns}
                dataSource={filteredCharacters}
                rowKey="id"
                loading={isLoading}
                rowSelection={rowSelection}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
                }}
              />
            </div>
            <div className="lg:col-span-1 space-y-4">
              {detailCharacter && (
                <Card title={`角色详情：${detailCharacter.name}`} extra={<Button size="small" onClick={() => setDetailCharacter(null)}>关闭</Button>}>
                  <div className="space-y-2 text-sm">
                    <div><b>角色类型：</b>{detailCharacter.role_type || '-'}</div>
                    <div><b>性别：</b>{detailCharacter.gender || '-'}</div>
                    <div><b>年龄：</b>{detailCharacter.age || '-'}</div>
                    <div><b>外貌：</b>{detailCharacter.appearance || '-'}</div>
                    <div><b>性格：</b>{detailCharacter.personality || '-'}</div>
                    {detailCharacter.profile && (
                      <div className="space-y-1">
                        <div><b>身份职业：</b>{detailCharacter.profile['身份职业'] || '-'}</div>
                        <div><b>家庭关系：</b>{detailCharacter.profile['家庭关系'] || '-'}</div>
                        <div><b>早年经历：</b>{detailCharacter.profile['早年经历'] || '-'}</div>
                        <div><b>观念信仰：</b>{detailCharacter.profile['观念信仰'] || '-'}</div>
                        <div><b>优点：</b>{detailCharacter.profile['优点'] || '-'}</div>
                        <div><b>缺点：</b>{detailCharacter.profile['缺点'] || '-'}</div>
                        <div><b>成就：</b>{detailCharacter.profile['成就'] || '-'}</div>
                        <div><b>社会阶层：</b>{detailCharacter.profile['社会阶层'] || '-'}</div>
                        <div><b>习惯嗜好：</b>{detailCharacter.profile['习惯嗜好'] || '-'}</div>
                      </div>
                    )}
                  </div>
                </Card>
              )}
              <Card title="AI 生成角色" extra={<Space>
                <Button type="primary" loading={aiLoading} onClick={async () => {
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
  )
} 