'use client'

import { useEffect, useMemo, useState } from 'react'
import { Layout, Button, Typography, Space, Modal, Input, App, List, Card, Spin, Select, Tabs, Tag, Popconfirm } from 'antd'
import { FileTextOutlined, PlusOutlined, SaveOutlined, ReloadOutlined, DragOutlined, FormOutlined, RobotOutlined, DeleteOutlined } from '@ant-design/icons'
import MonacoEditorComponent from './MonacoEditor'
import { useAuthStore } from '@/store/authStore'
import AIOutlinePanel from './AIOutlinePanel'

const { Sider, Content } = Layout
const { Title, Text } = Typography
const { TextArea } = Input

interface OutlineItem {
  id: string
  title: string
  path: string
  modified: string
  size: number
}

interface OutlineManagerProps {
  novelId: string
}

// 预设大纲模板
const OUTLINE_TEMPLATES = {
  'story_background': {
    name: '故事背景设定',
    content: `# 故事背景设定

## 世界观概述
- 时代背景：
- 地理环境：
- 社会制度：
- 文化特色：

## 核心设定
- 主要矛盾：
- 核心冲突：
- 世界规则：
`
  },
  'power_system': {
    name: '力量体系',
    content: `# 力量体系

## 修炼体系
- 境界划分：
- 修炼方法：
- 突破条件：

## 技能系统
- 基础技能：
- 进阶技能：
- 特殊能力：

## 限制规则
- 使用代价：
- 禁忌事项：
- 平衡机制：
`
  },
  'history_background': {
    name: '历史背景',
    content: `# 历史背景

## 重要历史事件
- 事件1：
- 事件2：
- 事件3：

## 历史人物
- 人物1：
- 人物2：

## 历史影响
- 对现状的影响：
- 遗留问题：
`
  },
  'story_timeline': {
    name: '故事时间线',
    content: `# 故事时间线

## 整体时间跨度
- 开始时间：
- 结束时间：
- 主要阶段：

## 关键时间节点
- 节点1：
- 节点2：
- 节点3：

## 时间管理
- 时间流速：
- 时间跳跃：
- 时间循环：
`
  },
  'story_location': {
    name: '故事发生地点',
    content: `# 故事发生地点

## 主要场景
- 场景1：
- 场景2：
- 场景3：

## 地理特征
- 地形地貌：
- 气候环境：
- 资源分布：

## 人文环境
- 人口分布：
- 建筑风格：
- 交通方式：
`
  },
  'main_plot': {
    name: '故事主线',
    content: `# 故事主线

## 核心冲突
- 主要矛盾：
- 冲突升级：
- 最终决战：

## 情节发展
- 开端：
- 发展：
- 转折：
- 高潮：
- 结局：

## 主题思想
- 核心主题：
- 价值观念：
- 人生感悟：
`
  },
  'story_summary': {
    name: '故事内容简介',
    content: `# 故事内容简介

## 整体概述
- 故事梗概：
- 核心主题：
- 故事风格：
- 目标读者：

## 故事框架
- 开篇设定：
- 中段发展：
- 结尾收束：

## 亮点元素
- 创新点：
- 爽点设计：
- 情感线：
- 成长线：

## 预期效果
- 情感共鸣：
- 价值传递：
- 娱乐效果：
`
  },
  'volume_summary': {
    name: '分卷内容简介',
    content: `# 分卷内容简介

## 第一卷：开端
- 开端：
- 发展：
- 转折：
- 高潮：
- 结局：

## 第二卷：发展
- 开端：
- 发展：
- 转折：
- 高潮：
- 结局：

## 第三卷：转折
- 开端：
- 发展：
- 转折：
- 高潮：
- 结局：
`
  },
  'chapter_outline': {
    name: '章节大纲模板',
    content: `# 章节大纲

## 章节信息
- 章节标题：
- 章节编号：
- 预计字数：

## 章节概要
- 主要情节：
- 关键事件：
- 人物出场：

## 章节结构
- 开端：
- 发展：
- 转折：
- 高潮：
- 结局：

## 重要元素
- 场景设定：
- 人物对话：
- 情感变化：
- 伏笔设置：
`
  }
}

export default function OutlineManager({ novelId }: OutlineManagerProps) {
  const { message } = App.useApp()
  const { token } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [outlines, setOutlines] = useState<OutlineItem[]>([])
  const [selected, setSelected] = useState<OutlineItem | null>(null)
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [draggingId, setDraggingId] = useState<string | null>(null)


  const [showAIPanel, setShowAIPanel] = useState(false)
  const [selectedOutlineType, setSelectedOutlineType] = useState<string>('story_background')
  
  const outlineTypes = [
    { key: 'story_background', label: '故事背景设定' },
    { key: 'power_system', label: '力量体系' },
    { key: 'history_background', label: '历史背景' },
    { key: 'story_timeline', label: '故事时间线' },
    { key: 'story_location', label: '故事发生地点' },
    { key: 'main_plot', label: '故事主线' },
    { key: 'story_summary', label: '故事内容简介' },
    { key: 'volume_summary', label: '分卷内容简介' },
    { key: 'chapter_summary', label: '分章内容简介' }
  ]

  const headers = useMemo(() => ({
    'Authorization': `Bearer ${token}`
  }), [token])

  useEffect(() => {
    loadOutlines()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novelId])

  const loadOutlines = async () => {
    setIsLoading(true)
    try {
      console.log('Loading outlines for novel:', novelId)
      const res = await fetch(`/api/sync/pull?novel_id=${encodeURIComponent(novelId)}`, { headers })
      console.log('Pull API response:', res.status, res.ok)
      
      if (!res.ok) {
        console.error('Pull API failed:', res.status)
        return
      }
      
      const result = await res.json()
      console.log('Pull API result:', result)
      
      if (!result.ok) {
        console.error('Pull API not ok:', result)
        return
      }
      
      const files: Record<string, any> = result.data?.files || {}
      console.log('All files:', files)

      // 先标准化路径为正斜杠，再过滤与映射
      const normalizedEntries = Object.entries(files).map(([rawPath, meta]) => {
        const path = (rawPath as string).replace(/\\/g, '/')
        return [path, meta] as [string, any]
      })

      const outlineItems: OutlineItem[] = normalizedEntries
        .filter(([path]) => path.startsWith('outlines/') && (path.endsWith('.md') || path.endsWith('.txt')))
        .map(([path, meta]) => ({
          id: path,
          title: path.replace(/^outlines\//, ''),
          path,
          modified: meta.modified,
          size: meta.size,
        }))
        .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
      
      console.log('Outline items:', outlineItems)
      setOutlines(outlineItems)
      
      // 保持当前选中项仍然有效
      if (selected) {
        const again = outlineItems.find(i => i.path === selected.path) || null
        setSelected(again)
      }
    } catch (e) {
      console.error('Load outlines error:', e)
      message.error('加载大纲失败')
    } finally {
      setIsLoading(false)
    }
  }

  const loadContent = async (item: OutlineItem) => {
    try {
      const res = await fetch(`/api/sync/download/${encodeURIComponent(novelId)}/${encodeURIComponent(item.path)}`, { headers })
      if (!res.ok) return
      const result = await res.json()
      if (!result.ok) return
      setContent(result.data?.content || '')
    } catch (e) {
      message.error('读取大纲内容失败')
    }
  }

  const handleSelect = async (item: OutlineItem) => {
    setSelected(item)
    await loadContent(item)
  }

  const safeFileName = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return ''
    return trimmed.replace(/[\\/:*?"<>|]/g, '_')
  }

  const handleCreate = async () => {
    setIsCreating(true)
  }

  const handleCreateFromTemplate = () => {
    setIsTemplateModalVisible(true)
  }



  const clearCache = async () => {
    try {
      console.log('Clearing cache for novel:', novelId)
      
      // 清理前端缓存
      setOutlines([])
      setSelected(null)
      setContent('')
      
      // 调用后端清理缓存API
      const res = await fetch(`/api/sync/clear-cache?novel_id=${encodeURIComponent(novelId)}`, { 
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Clear cache API response:', res.status, res.ok)
      
      if (res.ok) {
        const result = await res.json()
        console.log('Clear cache API result:', result)
        message.success('缓存清理成功')
      } else {
        const errorText = await res.text()
        console.error('Clear cache API error:', errorText)
        message.warning('缓存清理失败，但已清理前端缓存')
      }
      
      // 无论后端是否成功，都重新加载大纲
      await loadOutlines()
      
    } catch (e) {
      console.error('Clear cache error:', e)
      message.warning('缓存清理失败，但已清理前端缓存')
      // 即使出错，也重新加载
      await loadOutlines()
    }
  }



  const createFromTemplate = async () => {
    if (!selectedTemplate) {
      message.warning('请选择一个模板')
      return
    }

    const template = OUTLINE_TEMPLATES[selectedTemplate as keyof typeof OUTLINE_TEMPLATES]
    const fileBase = safeFileName(template.name)
    if (!fileBase) {
      message.warning('模板名称无效')
      return
    }

    const path = `outlines/${fileBase}.md`
    
    console.log('Creating from template:', { fileBase, path, novelId, templateName: template.name })
    
    try {
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          novel_id: novelId,
          path,
          content: template.content,
          timestamp: new Date().toISOString()
        })
      })
      
      console.log('Template API response:', res.status, res.ok)
      
      if (res.ok) {
        const result = await res.json()
        console.log('Template API result:', result)
        
        message.success('已从模板创建大纲')
        setIsTemplateModalVisible(false)
        setSelectedTemplate('')
        await loadOutlines()
        const created = { id: path, title: `${fileBase}.md`, path, modified: new Date().toISOString(), size: 0 }
        setSelected(created)
        setContent(template.content)
      } else {
        const errorText = await res.text()
        console.error('Template API error:', errorText)
        message.error(`模板创建失败: ${res.status}`)
      }
    } catch (e) {
      console.error('Template create error:', e)
      message.error('创建大纲失败')
    }
  }

  const submitCreate = async () => {
    const fileBase = safeFileName(newTitle)
    if (!fileBase) {
      message.warning('请输入大纲标题')
      return
    }
    const path = `outlines/${fileBase}.md`
    
    console.log('Creating outline:', { fileBase, path, novelId, newTitle })
    
    try {
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          novel_id: novelId,
          path,
          content: `# ${newTitle}\n\n`,
          timestamp: new Date().toISOString()
        })
      })
      
      console.log('API response:', res.status, res.ok)
      
      if (res.ok) {
        const result = await res.json()
        console.log('API result:', result)
        
        message.success('已创建大纲')
        setIsCreating(false)
        setNewTitle('')
        await loadOutlines()
        const created = { id: path, title: `${fileBase}.md`, path, modified: new Date().toISOString(), size: 0 }
        setSelected(created)
        setContent(`# ${newTitle}\n\n`)
      } else {
        const errorText = await res.text()
        console.error('API error:', errorText)
        message.error(`创建失败: ${res.status}`)
      }
    } catch (e) {
      console.error('Create error:', e)
      message.error('创建大纲失败')
    }
  }

  const handleSave = async () => {
    if (!selected) {
      message.warning('请先选择一个大纲')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          novel_id: novelId,
          path: selected.path,
          content,
          timestamp: new Date().toISOString()
        })
      })
      if (res.ok) {
        message.success('已保存')
        await loadOutlines()
      }
    } catch (e) {
      message.error('保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const refresh = async () => {
    setIsRefreshing(true)
    await loadOutlines()
    if (selected) await loadContent(selected)
    setIsRefreshing(false)
  }

  // 拖拽排序相关函数
  const onDragStart = (outlineId: string) => {
    setDraggingId(outlineId)
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const onDrop = (targetOutlineId: string) => {
    if (!draggingId || draggingId === targetOutlineId) {
      setDraggingId(null)
      return
    }

    const currentOutlines = [...outlines]
    const fromIndex = currentOutlines.findIndex(o => o.id === draggingId)
    const toIndex = currentOutlines.findIndex(o => o.id === targetOutlineId)
    
    if (fromIndex < 0 || toIndex < 0) {
      setDraggingId(null)
      return
    }

    // 重新排列大纲
    const [movedOutline] = currentOutlines.splice(fromIndex, 1)
    currentOutlines.splice(toIndex, 0, movedOutline)
    
    setOutlines(currentOutlines)
    setDraggingId(null)
  }

  const handleDeleteOutline = async (outlinePath: string) => {
    try {
      const outlineName = outlinePath.replace(/^outlines\//, '')
      const res = await fetch(`/api/sync/outlines/${encodeURIComponent(novelId)}/${encodeURIComponent(outlineName)}`, {
        method: 'DELETE',
        headers
      })
      
      if (res.ok) {
        const result = await res.json()
        if (result.ok) {
          message.success('大纲删除成功')
          // 如果删除的是当前选中的大纲，清空选择
          if (selected && selected.path === outlinePath) {
            setSelected(null)
            setContent('')
          }
          // 重新加载大纲列表
          await loadOutlines()
        } else {
          message.error(result.error?.msg || '删除失败')
        }
      } else {
        const errorText = await res.text()
        console.error('Delete API error:', errorText)
        message.error('删除失败')
      }
    } catch (e) {
      console.error('Delete outline error:', e)
      message.error('删除大纲失败')
    }
  }

  return (
    <Layout className="h-full">
      <Sider width={300} className="bg-white border-r">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <Title level={4} className="!mb-0">
              <FileTextOutlined className="mr-2" />
              大纲
            </Title>
            <Space>
              <Button type="text" icon={<ReloadOutlined />} onClick={refresh} loading={isRefreshing} />
              <Button type="text" icon={<DeleteOutlined />} onClick={clearCache} title="清理缓存" />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新建
              </Button>
            </Space>
          </div>

          <div className="mb-4 space-y-2">
            <Button 
              type="dashed" 
              icon={<FormOutlined />} 
              onClick={handleCreateFromTemplate}
              className="w-full"
            >
              从模板创建
            </Button>
            

          </div>



          <Card size="small" className="border-none">
            {isLoading ? (
              <div className="py-8 text-center"><Spin /></div>
            ) : (
              <List
                dataSource={outlines}
                renderItem={(item, index) => (
                  <List.Item
                    className={`cursor-pointer transition-all ${
                      selected?.path === item.path ? 'bg-blue-50' : ''
                    } ${
                      draggingId === item.id ? 'opacity-50 bg-gray-100' : ''
                    }`}
                    onClick={() => handleSelect(item)}
                    draggable
                    onDragStart={() => onDragStart(item.id)}
                    onDragOver={onDragOver}
                    onDrop={() => onDrop(item.id)}
                    actions={[
                      <DragOutlined 
                        key="drag" 
                        className="text-gray-400 cursor-move hover:text-gray-600" 
                        title="拖拽排序"
                      />,
                      <Popconfirm
                        key="delete"
                        title="确定要删除这个大纲吗？"
                        description="删除后无法恢复，但会移动到deleted目录。"
                        onConfirm={(e) => {
                          e?.stopPropagation()
                          handleDeleteOutline(item.path)
                        }}
                        okText="确定"
                        cancelText="取消"
                      >
                        <DeleteOutlined 
                          className="text-red-400 hover:text-red-600" 
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>
                    ]}
                  >
                    <div className="w-full flex items-center gap-2">
                      <DragOutlined className="text-gray-300 text-sm" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{item.title}</div>
                        <div className="text-xs text-gray-400">{new Date(item.modified).toLocaleString('zh-CN')}</div>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )}
            <div className="text-xs text-gray-400 mt-2 text-center">
              拖拽大纲项目可调整显示顺序
            </div>
          </Card>
        </div>
      </Sider>

      <Content className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
          {/* 左侧：大纲编辑区域 */}
          <div className="lg:col-span-2">
            <Card
              title={selected ? selected.title : '请选择或新建大纲'}
              extra={
                <Space>
                  <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} disabled={!selected} loading={isSaving}>
                    保存
                  </Button>
                </Space>
              }
              className="h-full"
              styles={{ body: { height: 'calc(100% - 60px)', padding: 0 } }}
            >
              <div className="h-full">
                <MonacoEditorComponent
                  value={content}
                  onChange={setContent}
                  onSave={handleSave}
                  novelId={novelId}
                  language="markdown"
                  theme="vs-dark"
                />
              </div>
            </Card>
          </div>

          {/* 右侧：AI生成面板 */}
          <div className="lg:col-span-1">
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <RobotOutlined className="mr-2" />
                  <span>AI生成</span>
                </div>
              }
              className="h-full"
              styles={{ body: { height: 'calc(100% - 60px)', padding: 0 } }}
            >
              <div className="p-4 space-y-4">
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <div className="text-sm text-blue-800 font-medium mb-2">📚 自动读取信息</div>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div>• 故事类型：从小说配置中自动读取</div>
                    <div>• 篇幅体量：从小说配置中自动读取</div>
                    <div>• 作品标签：从小说配置中自动读取</div>
                    <div>• 女主身份：从角色管理中自动读取</div>
                    <div>• 男主身份：从角色管理中自动读取</div>
                    <div>• 已书写内容：从已写章节中自动读取</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">选择生成类型：</div>
                  <div className="space-y-2">
                    {outlineTypes.map(type => (
                      <Button
                        key={type.key}
                        type="default"
                        size="small"
                        className="w-full text-left justify-start"
                        onClick={() => {
                          setSelectedOutlineType(type.key)
                          setShowAIPanel(true)
                        }}
                      >
                        <RobotOutlined className="mr-2" />
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                  <div className="font-medium mb-1">💡 使用说明：</div>
                  <div>• 点击上方按钮选择要生成的大纲类型</div>
                  <div>• 系统将自动读取小说信息并生成内容</div>
                  <div>• 生成的内容可以保存到大纲中</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
        
        {/* AI生成面板 */}
        {showAIPanel && (
          <Modal
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <RobotOutlined className="mr-2" />
                <span>AI大纲生成 - {outlineTypes.find(t => t.key === selectedOutlineType)?.label}</span>
              </div>
            }
            open={showAIPanel}
            onCancel={() => setShowAIPanel(false)}
            width={800}
            footer={null}
            destroyOnHidden
          >
            <AIOutlinePanel 
              novelId={novelId} 
              outlineType={selectedOutlineType}
              onApplied={() => {
                setShowAIPanel(false)
                loadOutlines()
              }}
            />
          </Modal>
        )}
      </Content>

      {/* 新建大纲对话框 */}
      <Modal
        title="新建大纲"
        open={isCreating}
        onCancel={() => { setIsCreating(false); setNewTitle('') }}
        onOk={submitCreate}
        okText="创建"
        cancelText="取消"
      >
        <Space direction="vertical" className="w-full">
          <Text>请输入大纲标题（将保存为 .md 文件）</Text>
          <Input
            placeholder="例如：第一卷-故事主线"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onPressEnter={submitCreate}
          />
        </Space>
      </Modal>

             {/* 模板选择对话框 */}
       <Modal
         title="选择大纲模板"
         open={isTemplateModalVisible}
         onCancel={() => { setIsTemplateModalVisible(false); setSelectedTemplate('') }}
         onOk={createFromTemplate}
         okText="创建"
         cancelText="取消"
         width={600}
       >
         <div className="space-y-4">
           <Text>选择以下预设模板快速创建大纲：</Text>
           
           <Tabs
             type="card"
             activeKey={selectedTemplate}
             onChange={setSelectedTemplate}
             items={Object.entries(OUTLINE_TEMPLATES).map(([key, template]) => ({
               key,
               label: template.name,
               children: (
                 <div className="p-4 bg-gray-50 rounded">
                   <pre className="text-sm whitespace-pre-wrap">{template.content}</pre>
                 </div>
               )
             }))}
           />
         </div>
       </Modal>


    </Layout>
  )
}


