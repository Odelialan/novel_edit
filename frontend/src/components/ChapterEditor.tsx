'use client'

import { useState, useEffect } from 'react'
import { Layout, Card, Select, Button, Space, Typography, Divider, Dropdown, Modal, Input, App } from 'antd'
import { BookOutlined, PlusOutlined, SaveOutlined, DownloadOutlined, FileTextOutlined, FileWordOutlined, DragOutlined } from '@ant-design/icons'
import MonacoEditorComponent from './MonacoEditor'
import dynamic from 'next/dynamic'

// 直接导入MonacoEditor，避免双重包装
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">加载中...</div>
})
import { useAuthStore } from '@/store/authStore'
import VersionPanel from './VersionPanel'
import ExportMenu from './ExportMenu'
import SimplifiedAISidebar from './SimplifiedAISidebar'

const { Sider, Content } = Layout
const { Title, Text } = Typography
const { Option } = Select

interface Chapter {
  id: string
  title: string
  order: number
  content: string
  novel_id: string
  created_at: string
  updated_at: string
  file_path: string
  word_count: {
    total: number
    no_punctuation: number
  }
}

interface ChapterEditorProps {
  novelId: string
  novelTitle: string
}

export default function ChapterEditor({ novelId, novelTitle }: ChapterEditorProps) {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null)
  const [chapterContent, setChapterContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [newChapterTitle, setNewChapterTitle] = useState('')
  const { token } = useAuthStore()
  const { message } = App.useApp()

  // 重命名对话框状态
  const [isRenameVisible, setIsRenameVisible] = useState(false)
  const [renameTitle, setRenameTitle] = useState('')
  const [renameOrder, setRenameOrder] = useState<number | ''>('')

  // 拖拽排序状态
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [isSavingOrder, setIsSavingOrder] = useState(false)

  // 实时计算当前编辑内容的字数
  const calculateCurrentWordCount = (text: string) => {
    if (!text) return { total: 0, no_punctuation: 0 }
    
    // 总字数
    const total = text.replace(/\n/g, '').replace(/\r/g, '').replace(/ /g, '').length
    
    // 不含标点符号的字数
    const punctuation = /[，。！？；：""''（）【】《》、,.\!?\;:"\'\(\)\[\]<>]/g
    const noPunct = text.replace(punctuation, '').replace(/\n/g, '').replace(/\r/g, '').replace(/ /g, '').length
    
    return { total, no_punctuation: noPunct }
  }

  const currentWordCount = calculateCurrentWordCount(chapterContent)

  // 加载章节列表
  useEffect(() => {
    loadChapters()
  }, [novelId])

  const loadChapters = async () => {
    setIsLoading(true)
    try {
      // 追加时间戳，避免浏览器/代理缓存导致列表不更新
      const response = await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters?ts=${Date.now()}` , {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          const chaptersData = result.data?.chapters || []
          setChapters(chaptersData)
          if (chaptersData.length > 0) {
            // 自动选择第一个章节
            const firstChapter = chaptersData[0]
            setCurrentChapter(firstChapter)
            setChapterContent(firstChapter.content || '')
          }
        }
      }
    } catch (error) {
      message.error('加载章节失败')
    } finally {
      setIsLoading(false)
    }
  }

  const selectChapter = (chapter: Chapter) => {
    setCurrentChapter(chapter)
    setChapterContent(chapter.content || '')
  }

  const createNewChapter = async () => {
    if (!newChapterTitle.trim()) {
      message.warning('请输入章节标题')
      return
    }

    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newChapterTitle,
          order: chapters.length + 1,
          content: `# ${newChapterTitle}\n\n`
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          message.success('章节创建成功')
          setNewChapterTitle('')
          // 优先使用后端返回的最新章节列表以避免缓存
          const chaptersData = result.data?.chapters
          if (Array.isArray(chaptersData) && chaptersData.length) {
            setChapters(chaptersData)
            setCurrentChapter(chaptersData[chaptersData.length - 1])
            setChapterContent(chaptersData[chaptersData.length - 1].content || '')
          } else {
            await loadChapters()
          }
        }
      }
    } catch (error) {
      message.error('创建章节失败')
    }
  }

  const saveChapter = async () => {
    if (!currentChapter) {
      message.warning('请先选择章节')
      return
    }

    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters/${encodeURIComponent(currentChapter.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: chapterContent
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          message.success('保存成功')
          
          // 使用后端返回的完整章节数据更新本地状态
          const updatedChapter = result.data.chapter
          const newChapterData = {
            ...updatedChapter,
            created_at: currentChapter.created_at, // 保持原创建时间
            updated_at: new Date().toISOString()
          }
          
          setCurrentChapter(newChapterData)
          
          // 更新章节列表中对应的章节数据
          // 如果章节ID发生了变化（重命名等），需要特殊处理
          const originalChapterId = currentChapter.id
          const newChapterId = updatedChapter.id
          
          setChapters(prevChapters => {
            if (originalChapterId === newChapterId) {
              // ID没变，直接更新
              return prevChapters.map(chapter => 
                chapter.id === originalChapterId 
                  ? {
                      ...chapter,
                      ...updatedChapter,
                      created_at: chapter.created_at, // 保持原创建时间
                      updated_at: new Date().toISOString()
                    }
                  : chapter
              )
            } else {
              // ID发生了变化，移除旧的，添加新的
              return prevChapters
                .filter(chapter => chapter.id !== originalChapterId)
                .concat([newChapterData])
                .sort((a, b) => a.order - b.order)
            }
          })
        } else {
          message.error(result.error?.msg || '保存失败')
        }
      } else {
        message.error('保存失败')
      }
    } catch (error) {
      message.error('保存失败')
    }
  }

  const deleteChapter = async (chapterId: string) => {
    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters/${encodeURIComponent(chapterId)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        message.success('章节删除成功')
        loadChapters() // 重新加载章节列表
        if (currentChapter?.id === chapterId) {
          setCurrentChapter(null)
          setChapterContent('')
        }
      }
    } catch (error) {
      message.error('删除章节失败')
    }
  }

  const openRenameModal = (chapter: Chapter) => {
    setCurrentChapter(chapter)
    setRenameTitle(chapter.title)
    setRenameOrder(chapter.order)
    setIsRenameVisible(true)
  }

  const handleRename = async () => {
    if (!currentChapter) {
      setIsRenameVisible(false)
      return
    }
    if (!renameTitle.trim()) {
      message.warning('请输入章节新标题')
      return
    }
    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters/${encodeURIComponent(currentChapter.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: renameTitle.trim(),
          order: typeof renameOrder === 'number' ? renameOrder : currentChapter.order
        })
      })
      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          message.success('重命名成功')
          setIsRenameVisible(false)
          await loadChapters()
        }
      }
    } catch (e) {
      message.error('重命名失败')
    }
  }

  // 拖拽排序相关函数
  const onDragStart = (chapterId: string) => {
    setDraggingId(chapterId)
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const onDrop = (targetChapterId: string) => {
    if (!draggingId || draggingId === targetChapterId) {
      setDraggingId(null)
      return
    }

    const currentChapters = [...chapters]
    const fromIndex = currentChapters.findIndex(c => c.id === draggingId)
    const toIndex = currentChapters.findIndex(c => c.id === targetChapterId)
    
    if (fromIndex < 0 || toIndex < 0) {
      setDraggingId(null)
      return
    }

    // 重新排列章节
    const [movedChapter] = currentChapters.splice(fromIndex, 1)
    currentChapters.splice(toIndex, 0, movedChapter)

    // 更新章节的order字段
    const updatedChapters = currentChapters.map((chapter, index) => ({
      ...chapter,
      order: index + 1
    }))

    setChapters(updatedChapters)
    setDraggingId(null)
  }

  const saveChapterOrder = async () => {
    if (isSavingOrder) return

    try {
      setIsSavingOrder(true)
      
      // 依次更新每个章节的order
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i]
        const newOrder = i + 1
        
        if (chapter.order !== newOrder) {
          await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters/${encodeURIComponent(chapter.id)}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              order: newOrder,
              title: chapter.title
            })
          })
        }
      }

      message.success('章节顺序已保存')
      await loadChapters() // 重新加载以确保数据同步
    } catch (error) {
      message.error('保存章节顺序失败')
    } finally {
      setIsSavingOrder(false)
    }
  }

  const exportNovel = async (format: 'txt' | 'docx') => {
    try {
      const response = await fetch(`/api/utils/export/${encodeURIComponent(novelId)}?format=${format}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        // 获取文件名
        const contentDisposition = response.headers.get('content-disposition')
        let filename = `${novelTitle}_${new Date().toISOString().slice(0, 10)}.${format}`
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]*)"?/)
          if (filenameMatch) {
            filename = filenameMatch[1]
          }
        }

        // 下载文件
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        message.success(`${format.toUpperCase()}导出成功`)
      } else {
        message.error('导出失败')
      }
    } catch (error) {
      message.error(`导出${format.toUpperCase()}失败`)
    }
  }

  return (
    <Layout style={{ height: '100%' }}>
      <Sider width={300} className="bg-white border-r">
        <div className="h-full flex flex-col">
          {/* 固定头部区域 */}
          <div className="p-4 flex-shrink-0">
            <div className="flex justify-between items-center mb-4">
              <Title level={4} className="!mb-0">
                <BookOutlined className="mr-2" />
                {novelTitle}
              </Title>
              
              <Space>
                <Button 
                  size="small" 
                  type="primary" 
                  icon={<SaveOutlined />} 
                  loading={isSavingOrder}
                  onClick={saveChapterOrder}
                  title="保存章节顺序"
                >
                  保存顺序
                </Button>
                <ExportMenu novelId={novelId} />
              </Space>
            </div>
            
            <div className="mb-4">
              <Space.Compact className="w-full">
                <input
                  type="text"
                  placeholder="新章节标题"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && createNewChapter()}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={createNewChapter}
                  className="rounded-l-none"
                >
                  新建
                </Button>
              </Space.Compact>
            </div>

            <Divider />
          </div>

          {/* 可滚动的章节列表区域 */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-2">
              {chapters.map((chapter, index) => (
                <Card
                  key={chapter.id}
                  size="small"
                  className={`cursor-pointer hover:shadow-md transition-all ${
                    currentChapter?.id === chapter.id ? 'ring-2 ring-blue-500' : ''
                  } ${
                    draggingId === chapter.id ? 'opacity-50 bg-blue-50' : ''
                  }`}
                  onClick={() => selectChapter(chapter)}
                  draggable
                  onDragStart={() => onDragStart(chapter.id)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(chapter.id)}
                  actions={[
                    <Button
                      key="rename"
                      type="text"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        openRenameModal(chapter)
                      }}
                    >
                      重命名
                    </Button>,
                    <Button
                      key="delete"
                      type="text"
                      danger
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteChapter(chapter.id)
                      }}
                    >
                      删除
                    </Button>
                  ]}
                >
                  <div className="flex items-center gap-2">
                    <DragOutlined className="text-gray-400 cursor-move" />
                    <div className="flex-1">
                      <Text strong>{`${String(index + 1).padStart(3, '0')}. ${chapter.title}`}</Text>
                      <br />
                      <Text type="secondary" className="text-xs">
                        总字数: {chapter.word_count?.total || 0}
                      </Text>
                      <br />
                      <Text type="secondary" className="text-xs">
                        纯文字: {chapter.word_count?.no_punctuation || 0}
                      </Text>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <div className="text-xs text-gray-400 mt-2 text-center">
              拖拽章节卡片可调整顺序，点击"保存顺序"生效
            </div>
          </div>
        </div>
      </Sider>

      <Content className="p-4" style={{ height: '100%', overflow: 'hidden' }}>
        {currentChapter ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* 中间：章节编辑区域 */}
            <div className="lg:col-span-2">
              <Card
                title={
                  <div className="flex justify-between items-center">
                    <div>
                      <Title level={4} className="!mb-1">
                        {`${String(currentChapter.order).padStart(3, '0')}. ${currentChapter.title}`}
                      </Title>
                      <Text type="secondary">章节 {currentChapter.order}</Text>
                    </div>
                    <div className="text-right">
                      <div className="space-x-4">
                        <span className="text-sm">
                          <Text strong>总字数: </Text>
                          <Text type="secondary">{currentWordCount.total}</Text>
                        </span>
                        <span className="text-sm">
                          <Text strong>纯文字: </Text>
                          <Text type="secondary">{currentWordCount.no_punctuation}</Text>
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        实时统计
                      </div>
                    </div>
                  </div>
                }
                extra={
                  <Space>
                    <Button type="primary" icon={<SaveOutlined />} onClick={saveChapter}>
                      保存
                    </Button>
                  </Space>
                }
                className="h-full"
                styles={{ body: { height: 'calc(100% - 60px)', padding: 0, overflow: 'hidden' } }}
              >
                <div className="h-full" style={{ overflow: 'hidden', position: 'relative' }}>
                  <div style={{ 
                    height: '100%', 
                    width: '100%',
                    overflow: 'auto',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    position: 'relative'
                  }}>
                    <MonacoEditor
                    height="100%"
                    language="markdown"
                    theme="vs-dark"
                    value={chapterContent}
                    onChange={(value) => setChapterContent(value || '')}
                    options={{
                      wordWrap: 'on',
                      lineNumbers: 'on',
                      minimap: { enabled: true },
                      fontSize: 14,
                      fontFamily: 'Consolas, "Courier New", monospace',
                      automaticLayout: true,
                      scrollBeyondLastLine: true,
                      folding: true,
                      lineDecorationsWidth: 10,
                      lineNumbersMinChars: 3,
                      scrollbar: {
                        vertical: 'auto',
                        horizontal: 'auto',
                        verticalScrollbarSize: 12,
                        horizontalScrollbarSize: 12,
                        useShadows: true,
                        verticalHasArrows: false,
                        horizontalHasArrows: false,
                        verticalSliderSize: 12,
                        horizontalSliderSize: 12,
                        arrowSize: 11,
                      },
                    }}
                    onMount={(editor) => {
                      // 暴露编辑器API
                      const api = {
                        getSelectedText: () => {
                          const sel = editor.getSelection()
                          return sel ? editor.getModel()?.getValueInRange(sel) || '' : ''
                        },
                        replaceSelection: (text: string) => {
                          const sel = editor.getSelection()
                          if (sel) editor.executeEdits('replace-selection', [{ range: sel, text }])
                        },
                        insertAtCursor: (text: string) => {
                          const pos = editor.getPosition()
                          if (pos) editor.executeEdits('insert-at-cursor', [{ range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column }, text }])
                        }
                      }
                      ;(window as any).__editorApi = api
                    }}
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* 右侧：AI 面板 */}
            <div className="lg:col-span-1">
              <SimplifiedAISidebar
                novelId={novelId}
                chapterContent={chapterContent}
                currentChapter={currentChapter}
                onAppendResult={(text) => setChapterContent(prev => prev + text)}
              />
            </div>
          </div>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <BookOutlined className="text-6xl mb-4" />
              <Title level={4}>请选择或创建章节</Title>
              <Text>在左侧选择现有章节或创建新章节开始写作</Text>
            </div>
          </Card>
        )}
      </Content>
      {/* 重命名对话框 */}
      <Modal
        title="重命名/调整序号"
        open={isRenameVisible}
        onOk={handleRename}
        onCancel={() => setIsRenameVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <div className="space-y-3">
          <div>
            <Text>新标题</Text>
            <Input
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              placeholder="请输入新标题"
            />
          </div>
          <div>
            <Text>序号（可选）</Text>
            <Input
              value={renameOrder}
              onChange={(e) => {
                const v = e.target.value
                if (v === '') return setRenameOrder('')
                const num = Number(v)
                if (!Number.isNaN(num)) setRenameOrder(num)
              }}
              placeholder="例如：1、2、3"
            />
          </div>
        </div>
      </Modal>
    </Layout>
  )
} 