'use client'

import { useState, useEffect } from 'react'
import { Layout, Card, Select, Button, Space, Typography, Divider, Dropdown, Modal, Input, App } from 'antd'
import { BookOutlined, PlusOutlined, SaveOutlined, DownloadOutlined, FileTextOutlined, FileWordOutlined } from '@ant-design/icons'
import MonacoEditorComponent from './MonacoEditor'
import AIPanel from './AIPanel'
import AIRewritePanel from './AIRewritePanel'
import AICharacterPanel from './AICharacterPanel'
import AIParagraphExpandPanel from './AIParagraphExpandPanel'
import { useAuthStore } from '@/store/authStore'
import ChapterSummaryPanel from './ChapterSummaryPanel'
import VersionPanel from './VersionPanel'
import ExportMenu from './ExportMenu'
import ChapterReorder from './ChapterReorder'
import AIWorldPanel from './AIWorldPanel'
import CharacterGraph from './CharacterGraph'
import TimelinePanel from './TimelinePanel'
import WritingStatsPanel from './WritingStatsPanel'
import PomodoroTimer from './PomodoroTimer'
import WritingCalendar from './WritingCalendar'
import ReformatPanel from './ReformatPanel'
import WorldMapPanel from './WorldMapPanel'
import PowerSystemPanel from './PowerSystemPanel'
import HistoryPanel from './HistoryPanel'

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
  const [selectedText, setSelectedText] = useState('')
  const { token } = useAuthStore()
  const { message } = App.useApp()

  // 重命名对话框状态
  const [isRenameVisible, setIsRenameVisible] = useState(false)
  const [renameTitle, setRenameTitle] = useState('')
  const [renameOrder, setRenameOrder] = useState<number | ''>('')

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
    <Layout className="h-full">
      <Sider width={300} className="bg-white border-r">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <Title level={4} className="!mb-0">
              <BookOutlined className="mr-2" />
              {novelTitle}
            </Title>
            
            <ExportMenu novelId={novelId} />
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

          <div className="space-y-2">
            {chapters.map((chapter) => (
              <Card
                key={chapter.id}
                size="small"
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  currentChapter?.id === chapter.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => selectChapter(chapter)}
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
                <div>
                  <Text strong>{`${String(chapter.order).padStart(3, '0')}. ${chapter.title}`}</Text>
                  <br />
                  <Text type="secondary" className="text-xs">
                    总字数: {chapter.word_count?.total || 0}
                  </Text>
                  <br />
                  <Text type="secondary" className="text-xs">
                    纯文字: {chapter.word_count?.no_punctuation || 0}
                  </Text>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Sider>

      <Content className="p-4">
        {currentChapter ? (
          <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 章节信息和字数统计栏 */}
            <div className="lg:col-span-2 mb-4 p-3 bg-white rounded-lg border shadow-sm">
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
            </div>
            
            {/* 编辑器 + AI 面板 */}
            <div className="lg:col-span-2 flex-1">
              <MonacoEditorComponent
                value={chapterContent}
                onChange={setChapterContent}
                onSave={saveChapter}
                novelId={novelId}
                chapterId={currentChapter.id}
                language="markdown"
                theme="vs-dark"
                onExposeEditorApi={(api) => { (window as any).__editorApi = api }}
                onSelectionChange={(api) => {
                  try {
                    const selection = api?.getSelection()
                    const selectedText = api?.getModel()?.getValueInRange(selection) || ''
                    setSelectedText(selectedText)
                  } catch (e) {
                    // 忽略选择错误
                  }
                }}
              />
            </div>
            <div className="lg:col-span-1 space-y-4">
              <ChapterSummaryPanel 
                novelId={novelId} 
                getText={() => chapterContent} 
                currentChapter={currentChapter}
              />
              <ChapterReorder
                novelId={novelId}
                chapters={chapters.map(c => ({ id: c.id, title: c.title, order: c.order }))}
                onReordered={() => loadChapters()}
              />
              <AIPanel novelId={novelId} onAppendResult={(text) => setChapterContent(prev => prev + text)} />
              <AIParagraphExpandPanel 
                novelId={novelId} 
                onAppendResult={(text) => setChapterContent(prev => prev + text)}
                selectedText={selectedText}
              />
              <AIRewritePanel novelId={novelId} editorApi={null} />
              <CharacterGraph novelId={novelId} />
              <TimelinePanel novelId={novelId} />
              <WritingStatsPanel novelId={novelId} />
              <PomodoroTimer onSessionComplete={(type, duration) => {
                if (type === 'work') {
                  message.success(`完成了一个 ${duration} 分钟的专注写作时段！`)
                }
              }} />
              <WritingCalendar novelId={novelId} />
              <ReformatPanel 
                getText={() => chapterContent} 
                onTextChange={(newText) => setChapterContent(newText)} 
              />
              <WorldMapPanel novelId={novelId} />
              <HistoryPanel novelId={novelId} />
              <PowerSystemPanel novelId={novelId} />
              <VersionPanel novelId={novelId} onRestored={() => loadChapters()} />
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