'use client'

import { useEffect, useState } from 'react'
import { Card, Row, Col, Typography, List, Tag, Space, Spin, Calendar, Badge, Statistic, Select, Input, Button, Modal, Form, App } from 'antd'
import { BookOutlined, FileTextOutlined, CalendarOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import dayjs from 'dayjs'

const { Text, Title } = Typography
const { TextArea } = Input

interface NovelStats {
  total_words: number
  total_words_no_punctuation: number
  total_chapters: number
  chapters_with_content: number
  last_updated: string
  title?: string
  slug?: string
  novel_meta?: {
    genre: string
    target_length: string
    tags: string[]
    description: string
    // 新增小说性质字段
    plot_points?: string[]
    theme?: string[]
    world_setting?: string[]
    time_period?: string[]
    location?: string[]
    social_context?: string[]
    emotional_tone?: string[]
    writing_style?: string[]
    target_audience?: string[]
    reader_expectation?: string[]
    pov?: string
    pacing?: string
    conflict_type?: string
    resolution_style?: string
  }
}

interface ChapterInfo {
  id: string
  title: string
  word_count: number
  updated_at: string
}

interface CalendarStats {
  date: string
  word_count: number
  chapter_count: number
}

interface NovelDashboardProps {
  novelId?: string
}

export default function NovelDashboard({ novelId }: NovelDashboardProps) {
  const { token } = useAuthStore()
  const { message } = App.useApp()
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  const [stats, setStats] = useState<NovelStats | null>(null)
  const [recentChapters, setRecentChapters] = useState<ChapterInfo[]>([])
  const [calendarStats, setCalendarStats] = useState<CalendarStats[]>([])
  const [loading, setLoading] = useState(false)
  const [editingMeta, setEditingMeta] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editForm] = Form.useForm()

  useEffect(() => {
    if (novelId) {
      loadNovelStats()
      loadCalendarStats()
    }
  }, [novelId])

  const loadNovelStats = async () => {
    if (!novelId) return
    
    try {
      setLoading(true)
      const [statsRes, chaptersRes] = await Promise.all([
        fetch(`/api/novels/${encodeURIComponent(novelId)}/stats/overview`, { headers }),
        fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters/recent?limit=5`, { headers })
      ])

      if (statsRes.ok) {
        const j = await statsRes.json()
        if (j.ok) setStats(j.data?.stats)
      }
      if (chaptersRes.ok) {
        const j = await chaptersRes.json()
        if (j.ok) setRecentChapters(j.data?.chapters || [])
      }
    } catch {
      // 静默处理错误
    } finally {
      setLoading(false)
    }
  }

  const loadCalendarStats = async () => {
    if (!novelId) return

    try {
      setLoading(true)
      const res = await fetch(`/api/writing/novels/${encodeURIComponent(novelId)}/calendar-stats?days=30`, { headers })
      if (res.ok) {
        const j = await res.json()
        if (j.ok) {
          const stats = j.data?.stats || []
          // 转换数据格式以匹配前端接口
          const convertedStats = stats.map((stat: any) => ({
            date: stat.date,
            word_count: stat.word_count,
            chapter_count: stat.chapters_updated || 0
          }))
          setCalendarStats(convertedStats)
        }
      }
    } catch {
      // 静默处理错误
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMeta = async (values: any) => {
    if (!novelId) return
    
    try {
      setLoading(true)
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title: stats?.title || '',
          slug: stats?.slug || '',
          meta: {
            genre: values.genre,
            target_length: values.target_length,
            tags: values.tags,
            description: values.description,
            // 新增小说性质字段
            plot_points: values.plot_points,
            theme: values.theme,
            world_setting: values.world_setting,
            time_period: values.time_period,
            location: values.location,
            social_context: values.social_context,
            emotional_tone: values.emotional_tone,
            writing_style: values.writing_style,
            target_audience: values.target_audience,
            reader_expectation: values.reader_expectation,
            pov: values.pov,
            pacing: values.pacing,
            conflict_type: values.conflict_type,
            resolution_style: values.resolution_style
          }
        })
      })

      if (res.ok) {
        const result = await res.json()
        if (result.ok) {
          message.success('小说基本参数保存成功')
          setEditingMeta(false)
          // 重新加载数据
          loadNovelStats()
        } else {
          message.error(result.error?.msg || '保存失败')
        }
      } else {
        message.error('保存失败')
      }
    } catch (error) {
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTitle = async () => {
    if (!novelId) return
    const title = newTitle.trim()
    if (!title) {
      message.warning('请输入小说名称')
      return
    }
    try {
      setLoading(true)
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title,
          slug: stats?.slug || '',
          meta: stats?.novel_meta || {}
        })
      })
      if (res.ok) {
        const j = await res.json()
        if (j.ok) {
          message.success('小说名称已更新')
          setEditingTitle(false)
          setStats(prev => prev ? { ...prev, title } : prev)
        } else {
          message.error(j.error?.msg || '保存失败')
        }
      } else {
        message.error('保存失败')
      }
    } catch {
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  const startEditing = () => {
    editForm.setFieldsValue({
      genre: stats?.novel_meta?.genre || '',
      target_length: stats?.novel_meta?.target_length || '',
      tags: stats?.novel_meta?.tags || [],
      description: stats?.novel_meta?.description || '',
      // 新增小说性质字段
      plot_points: stats?.novel_meta?.plot_points || [],
      theme: stats?.novel_meta?.theme || [],
      world_setting: stats?.novel_meta?.world_setting || [],
      time_period: stats?.novel_meta?.time_period || [],
      location: stats?.novel_meta?.location || [],
      social_context: stats?.novel_meta?.social_context || [],
      emotional_tone: stats?.novel_meta?.emotional_tone || [],
      writing_style: stats?.novel_meta?.writing_style || [],
      target_audience: stats?.novel_meta?.target_audience || [],
      reader_expectation: stats?.novel_meta?.reader_expectation || [],
      pov: stats?.novel_meta?.pov || '',
      pacing: stats?.novel_meta?.pacing || '',
      conflict_type: stats?.novel_meta?.conflict_type || '',
      resolution_style: stats?.novel_meta?.resolution_style || ''
    })
    setEditingMeta(true)
  }

  if (!novelId) {
    return (
      <div className="text-center py-8">
        <Title level={3}>
          <BookOutlined className="mr-2" />
          小说总览
        </Title>
        <Text type="secondary">
          请先选择一个小说查看其统计信息
        </Text>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <Spin size="large" />
        <div className="mt-4">加载小说统计中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Title level={3}>
          <BookOutlined className="mr-2" />
          小说总览
        </Title>
        <div className="flex items-center justify-center gap-2 mt-1">
          {!editingTitle ? (
            <>
              <Text strong>{stats?.title || '未命名小说'}</Text>
              <Button size="small" onClick={() => { setNewTitle(stats?.title || ''); setEditingTitle(true) }}>修改名称</Button>
            </>
          ) : (
            <Space.Compact>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="请输入小说名称" />
              <Button type="primary" size="small" onClick={handleSaveTitle}>保存</Button>
              <Button size="small" onClick={() => setEditingTitle(false)}>取消</Button>
            </Space.Compact>
          )}
        </div>
        <Text type="secondary">
          显示小说的基本统计信息和最近编辑的章节
        </Text>
      </div>

      {/* 字数统计 */}
      {stats && (
        <Card>
          <Title level={4} className="mb-4">
            <FileTextOutlined className="mr-2" />
            字数统计
          </Title>
          <Row gutter={16}>
            <Col span={8}>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.total_words.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">总字数（含标点）</div>
              </div>
            </Col>
            <Col span={8}>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.total_words_no_punctuation.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">总字数（不含标点）</div>
              </div>
            </Col>
            <Col span={8}>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.total_chapters}
                </div>
                <div className="text-sm text-gray-500">总章节数</div>
              </div>
            </Col>
          </Row>
          
          <div className="mt-4 text-center text-sm text-gray-500">
            <CalendarOutlined className="mr-1" />
            最后更新: {stats.last_updated}
          </div>
        </Card>
      )}

      {/* 小说基本参数 */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title level={4} className="!mb-0">
            <BookOutlined className="mr-2" />
            小说基本参数
          </Title>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={startEditing}
            size="small"
          >
            编辑
          </Button>
        </div>
        
        {!editingMeta ? (
          <div>
            {/* 基本参数 */}
            <Row gutter={16} className="mb-4">
              <Col span={6}>
                <div className="text-center">
                  <div className="text-lg font-medium text-gray-700">类型</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {stats?.novel_meta?.genre || '未设置'}
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div className="text-center">
                  <div className="text-lg font-medium text-gray-700">篇幅</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {stats?.novel_meta?.target_length || '未设置'}
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div className="text-center">
                  <div className="text-lg font-medium text-gray-700">标签</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {stats?.novel_meta?.tags && stats.novel_meta.tags.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-1">
                        {stats.novel_meta.tags.slice(0, 3).map((tag: string, index: number) => (
                          <Tag key={index} color="blue">{tag}</Tag>
                        ))}
                        {stats.novel_meta.tags.length > 3 && (
                          <span className="text-xs text-gray-400">+{stats.novel_meta.tags.length - 3}</span>
                        )}
                      </div>
                    ) : '未设置'}
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div className="text-center">
                  <div className="text-lg font-medium text-gray-700">简介</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {stats?.novel_meta?.description ? (
                      <div className="text-xs leading-relaxed px-2">
                        {stats.novel_meta.description.length > 20 
                          ? `${stats.novel_meta.description.substring(0, 20)}...` 
                          : stats.novel_meta.description}
                      </div>
                    ) : '未设置'}
                  </div>
                </div>
              </Col>
            </Row>
            
            {/* 小说性质参数 */}
            <div className="border-t pt-4">
              <Title level={5} className="mb-3">小说性质</Title>
              <Row gutter={[16, 16]}>
                                 <Col span={8}>
                   <div className="text-center">
                     <div className="text-sm font-medium text-gray-700">关键情节点</div>
                     <div className="text-xs text-gray-500 mt-1">
                       {stats?.novel_meta?.plot_points && Array.isArray(stats.novel_meta.plot_points) && stats.novel_meta.plot_points.length > 0 ? (
                         <div className="flex flex-wrap justify-center gap-1">
                           {stats.novel_meta.plot_points.slice(0, 2).map((item: string, index: number) => (
                             <Tag key={index} color="blue" className="text-xs">{item}</Tag>
                           ))}
                           {stats.novel_meta.plot_points.length > 2 && (
                             <span className="text-xs text-gray-400">+{stats.novel_meta.plot_points.length - 2}</span>
                           )}
                         </div>
                       ) : '未设置'}
                     </div>
                   </div>
                 </Col>
                 <Col span={8}>
                   <div className="text-center">
                     <div className="text-sm font-medium text-gray-700">主题</div>
                     <div className="text-xs text-gray-500 mt-1">
                       {stats?.novel_meta?.theme && Array.isArray(stats.novel_meta.theme) && stats.novel_meta.theme.length > 0 ? (
                         <div className="flex flex-wrap justify-center gap-1">
                           {stats.novel_meta.theme.slice(0, 2).map((item: string, index: number) => (
                             <Tag key={index} color="green" className="text-xs">{item}</Tag>
                           ))}
                           {stats.novel_meta.theme.length > 2 && (
                             <span className="text-xs text-gray-400">+{stats.novel_meta.theme.length - 2}</span>
                           )}
                         </div>
                       ) : '未设置'}
                     </div>
                   </div>
                 </Col>
                 <Col span={8}>
                   <div className="text-center">
                     <div className="text-sm font-medium text-gray-700">世界设定</div>
                     <div className="text-xs text-gray-500 mt-1">
                       {stats?.novel_meta?.world_setting && Array.isArray(stats.novel_meta.world_setting) && stats.novel_meta.world_setting.length > 0 ? (
                         <div className="flex flex-wrap justify-center gap-1">
                           {stats.novel_meta.world_setting.slice(0, 2).map((item: string, index: number) => (
                             <Tag key={index} color="purple" className="text-xs">{item}</Tag>
                           ))}
                           {stats.novel_meta.world_setting.length > 2 && (
                             <span className="text-xs text-gray-400">+{stats.novel_meta.world_setting.length - 2}</span>
                           )}
                         </div>
                       ) : '未设置'}
                     </div>
                   </div>
                 </Col>
                 <Col span={8}>
                   <div className="text-center">
                     <div className="text-sm font-medium text-gray-700">时代背景</div>
                     <div className="text-xs text-gray-500 mt-1">
                       {stats?.novel_meta?.time_period && Array.isArray(stats.novel_meta.time_period) && stats.novel_meta.time_period.length > 0 ? (
                         <div className="flex flex-wrap justify-center gap-1">
                           {stats.novel_meta.time_period.slice(0, 2).map((item: string, index: number) => (
                             <Tag key={index} color="orange" className="text-xs">{item}</Tag>
                           ))}
                           {stats.novel_meta.time_period.length > 2 && (
                             <span className="text-xs text-gray-400">+{stats.novel_meta.time_period.length - 2}</span>
                           )}
                         </div>
                       ) : '未设置'}
                     </div>
                   </div>
                 </Col>
                 <Col span={8}>
                   <div className="text-center">
                     <div className="text-sm font-medium text-gray-700">地点</div>
                     <div className="text-xs text-gray-500 mt-1">
                       {stats?.novel_meta?.location && Array.isArray(stats.novel_meta.location) && stats.novel_meta.location.length > 0 ? (
                         <div className="flex flex-wrap justify-center gap-1">
                           {stats.novel_meta.location.slice(0, 2).map((item: string, index: number) => (
                             <Tag key={index} color="cyan" className="text-xs">{item}</Tag>
                           ))}
                           {stats.novel_meta.location.length > 2 && (
                             <span className="text-xs text-gray-400">+{stats.novel_meta.location.length - 2}</span>
                           )}
                         </div>
                       ) : '未设置'}
                     </div>
                   </div>
                 </Col>
                 <Col span={8}>
                   <div className="text-center">
                     <div className="text-sm font-medium text-gray-700">社会背景</div>
                     <div className="text-xs text-gray-500 mt-1">
                       {stats?.novel_meta?.social_context && Array.isArray(stats.novel_meta.social_context) && stats.novel_meta.social_context.length > 0 ? (
                         <div className="flex flex-wrap justify-center gap-1">
                           {stats.novel_meta.social_context.slice(0, 2).map((item: string, index: number) => (
                             <Tag key={index} color="magenta" className="text-xs">{item}</Tag>
                           ))}
                           {stats.novel_meta.social_context.length > 2 && (
                             <span className="text-xs text-gray-400">+{stats.novel_meta.social_context.length - 2}</span>
                           )}
                         </div>
                       ) : '未设置'}
                     </div>
                   </div>
                 </Col>
                 <Col span={8}>
                   <div className="text-center">
                     <div className="text-sm font-medium text-gray-700">情感基调</div>
                     <div className="text-xs text-gray-500 mt-1">
                       {stats?.novel_meta?.emotional_tone && Array.isArray(stats.novel_meta.emotional_tone) && stats.novel_meta.emotional_tone.length > 0 ? (
                         <div className="flex flex-wrap justify-center gap-1">
                           {stats.novel_meta.emotional_tone.slice(0, 2).map((item: string, index: number) => (
                             <Tag key={index} color="red" className="text-xs">{item}</Tag>
                           ))}
                           {stats.novel_meta.emotional_tone.length > 2 && (
                             <span className="text-xs text-gray-400">+{stats.novel_meta.emotional_tone.length - 2}</span>
                           )}
                         </div>
                       ) : '未设置'}
                     </div>
                   </div>
                 </Col>
                 <Col span={8}>
                   <div className="text-center">
                     <div className="text-sm font-medium text-gray-700">写作风格</div>
                     <div className="text-xs text-gray-500 mt-1">
                       {stats?.novel_meta?.writing_style && Array.isArray(stats.novel_meta.writing_style) && stats.novel_meta.writing_style.length > 0 ? (
                         <div className="flex flex-wrap justify-center gap-1">
                           {stats.novel_meta.writing_style.slice(0, 2).map((item: string, index: number) => (
                             <Tag key={index} color="volcano" className="text-xs">{item}</Tag>
                           ))}
                           {stats.novel_meta.writing_style.length > 2 && (
                             <span className="text-xs text-gray-400">+{stats.novel_meta.writing_style.length - 2}</span>
                           )}
                         </div>
                       ) : '未设置'}
                     </div>
                   </div>
                 </Col>
                 <Col span={8}>
                   <div className="text-center">
                     <div className="text-sm font-medium text-gray-700">目标读者</div>
                     <div className="text-xs text-gray-500 mt-1">
                       {stats?.novel_meta?.target_audience && Array.isArray(stats.novel_meta.target_audience) && stats.novel_meta.target_audience.length > 0 ? (
                         <div className="flex flex-wrap justify-center gap-1">
                           {stats.novel_meta.target_audience.slice(0, 2).map((item: string, index: number) => (
                             <Tag key={index} color="gold" className="text-xs">{item}</Tag>
                           ))}
                           {stats.novel_meta.target_audience.length > 2 && (
                             <span className="text-xs text-gray-400">+{stats.novel_meta.target_audience.length - 2}</span>
                           )}
                         </div>
                       ) : '未设置'}
                     </div>
                   </div>
                 </Col>
                 <Col span={8}>
                   <div className="text-center">
                     <div className="text-sm font-medium text-gray-700">读者期待</div>
                     <div className="text-xs text-gray-500 mt-1">
                       {stats?.novel_meta?.reader_expectation && Array.isArray(stats.novel_meta.reader_expectation) && stats.novel_meta.reader_expectation.length > 0 ? (
                         <div className="flex flex-wrap justify-center gap-1">
                           {stats.novel_meta.reader_expectation.slice(0, 2).map((item: string, index: number) => (
                             <Tag key={index} color="lime" className="text-xs">{item}</Tag>
                           ))}
                           {stats.novel_meta.reader_expectation.length > 2 && (
                             <span className="text-xs text-gray-400">+{stats.novel_meta.reader_expectation.length - 2}</span>
                           )}
                         </div>
                       ) : '未设置'}
                     </div>
                   </div>
                 </Col>
                <Col span={8}>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700">视角</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {stats?.novel_meta?.pov || '未设置'}
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700">节奏</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {stats?.novel_meta?.pacing || '未设置'}
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700">冲突类型</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {stats?.novel_meta?.conflict_type || '未设置'}
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700">结局风格</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {stats?.novel_meta?.resolution_style || '未设置'}
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        ) : (
          <Form form={editForm} onFinish={handleSaveMeta} layout="vertical">
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="genre" label="类型">
                  <Select placeholder="选择故事类型" allowClear>
                    <Select.Option value="古代言情">古代言情</Select.Option>
                    <Select.Option value="现代言情">现代言情</Select.Option>
                    <Select.Option value="悬疑">悬疑</Select.Option>
                    <Select.Option value="脑洞">脑洞</Select.Option>
                    <Select.Option value="职场">职场</Select.Option>
                    <Select.Option value="校园">校园</Select.Option>
                    <Select.Option value="仙侠">仙侠</Select.Option>
                    <Select.Option value="穿越">穿越</Select.Option>
                    <Select.Option value="恐怖">恐怖</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="target_length" label="篇幅">
                  <Select placeholder="选择篇幅体量" allowClear>
                    <Select.Option value="1w字以下超短篇">1w字以下超短篇</Select.Option>
                    <Select.Option value="1w-5w字短篇">1w-5w字短篇</Select.Option>
                    <Select.Option value="5w-15w字中篇">5w-15w字中篇</Select.Option>
                    <Select.Option value="15w-20w字中篇">15w-20w字中篇</Select.Option>
                    <Select.Option value="20w-50w字长篇">20w-50w字长篇</Select.Option>
                    <Select.Option value="50w-100w字长篇">50w-100w字长篇</Select.Option>
                    <Select.Option value="100w字以上超长篇">100w字以上超长篇</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="tags" label="标签">
                  <Select 
                    mode="tags" 
                    placeholder="选择或输入标签" 
                    allowClear
                    maxTagCount={5}
                  >
                    <Select.Option value="穿越">穿越</Select.Option>
                    <Select.Option value="先婚后爱">先婚后爱</Select.Option>
                    <Select.Option value="破镜重圆">破镜重圆</Select.Option>
                    <Select.Option value="正剧">正剧</Select.Option>
                    <Select.Option value="爽文">爽文</Select.Option>
                    <Select.Option value="魂穿">魂穿</Select.Option>
                    <Select.Option value="身穿">身穿</Select.Option>
                    <Select.Option value="性别互换">性别互换</Select.Option>
                    <Select.Option value="虐恋情深">虐恋情深</Select.Option>
                    <Select.Option value="欢喜冤家">欢喜冤家</Select.Option>
                    <Select.Option value="师徒">师徒</Select.Option>
                    <Select.Option value="黑莲花">黑莲花</Select.Option>
                    <Select.Option value="救赎">救赎</Select.Option>
                    <Select.Option value="甜文">甜文</Select.Option>
                    <Select.Option value="情有独钟">情有独钟</Select.Option>
                    <Select.Option value="穿越时空">穿越时空</Select.Option>
                    <Select.Option value="穿书">穿书</Select.Option>
                    <Select.Option value="成长">成长</Select.Option>
                    <Select.Option value="天作之合">天作之合</Select.Option>
                    <Select.Option value="豪门世家">豪门世家</Select.Option>
                    <Select.Option value="强强">强强</Select.Option>
                    <Select.Option value="天之骄子">天之骄子</Select.Option>
                    <Select.Option value="系统">系统</Select.Option>
                    <Select.Option value="都市">都市</Select.Option>
                    <Select.Option value="种田文">种田文</Select.Option>
                    <Select.Option value="宫廷侯爵">宫廷侯爵</Select.Option>
                    <Select.Option value="重生">重生</Select.Option>
                    <Select.Option value="日常">日常</Select.Option>
                    <Select.Option value="娱乐圈">娱乐圈</Select.Option>
                    <Select.Option value="年代文">年代文</Select.Option>
                    <Select.Option value="升级流">升级流</Select.Option>
                    <Select.Option value="快穿">快穿</Select.Option>
                    <Select.Option value="仙侠修真">仙侠修真</Select.Option>
                    <Select.Option value="灵异神怪">灵异神怪</Select.Option>
                    <Select.Option value="无限流">无限流</Select.Option>
                    <Select.Option value="业界精英">业界精英</Select.Option>
                    <Select.Option value="逆袭">逆袭</Select.Option>
                    <Select.Option value="万人迷">万人迷</Select.Option>
                    <Select.Option value="幻想空间">幻想空间</Select.Option>
                    <Select.Option value="星际">星际</Select.Option>
                    <Select.Option value="直播">直播</Select.Option>
                    <Select.Option value="校园">校园</Select.Option>
                    <Select.Option value="综漫">综漫</Select.Option>
                    <Select.Option value="励志">励志</Select.Option>
                    <Select.Option value="沙雕">沙雕</Select.Option>
                    <Select.Option value="美食">美食</Select.Option>
                    <Select.Option value="追爱火葬场">追爱火葬场</Select.Option>
                    <Select.Option value="团宠">团宠</Select.Option>
                    <Select.Option value="打脸">打脸</Select.Option>
                    <Select.Option value="末世">末世</Select.Option>
                    <Select.Option value="ABO">ABO</Select.Option>
                    <Select.Option value="咒回">咒回</Select.Option>
                    <Select.Option value="年下">年下</Select.Option>
                    <Select.Option value="基建">基建</Select.Option>
                    <Select.Option value="治愈">治愈</Select.Option>
                    <Select.Option value="现代架空">现代架空</Select.Option>
                    <Select.Option value="生子">生子</Select.Option>
                    <Select.Option value="异能">异能</Select.Option>
                    <Select.Option value="群像">群像</Select.Option>
                    <Select.Option value="柯南">柯南</Select.Option>
                    <Select.Option value="朝堂">朝堂</Select.Option>
                    <Select.Option value="青梅竹马">青梅竹马</Select.Option>
                    <Select.Option value="HE">HE</Select.Option>
                    <Select.Option value="悬疑推理">悬疑推理</Select.Option>
                    <Select.Option value="文野">文野</Select.Option>
                    <Select.Option value="萌宠">萌宠</Select.Option>
                    <Select.Option value="未来架空">未来架空</Select.Option>
                    <Select.Option value="高岭之花">高岭之花</Select.Option>
                    <Select.Option value="美强惨">美强惨</Select.Option>
                    <Select.Option value="婚恋">婚恋</Select.Option>
                    <Select.Option value="女强">女强</Select.Option>
                    <Select.Option value="马甲文">马甲文</Select.Option>
                    <Select.Option value="女配">女配</Select.Option>
                    <Select.Option value="相爱相杀">相爱相杀</Select.Option>
                    <Select.Option value="少年漫">少年漫</Select.Option>
                    <Select.Option value="暗恋">暗恋</Select.Option>
                    <Select.Option value="萌娃">萌娃</Select.Option>
                    <Select.Option value="历史衍生">历史衍生</Select.Option>
                    <Select.Option value="因缘邂逅">因缘邂逅</Select.Option>
                    <Select.Option value="英美衍生">英美衍生</Select.Option>
                    <Select.Option value="轻松">轻松</Select.Option>
                    <Select.Option value="体育竞技">体育竞技</Select.Option>
                    <Select.Option value="单元文">单元文</Select.Option>
                    <Select.Option value="钓系">钓系</Select.Option>
                    <Select.Option value="游戏网游">游戏网游</Select.Option>
                    <Select.Option value="市井生活">市井生活</Select.Option>
                    <Select.Option value="综艺">综艺</Select.Option>
                    <Select.Option value="玄学">玄学</Select.Option>
                    <Select.Option value="布衣生活">布衣生活</Select.Option>
                    <Select.Option value="宅斗">宅斗</Select.Option>
                    <Select.Option value="超级英雄">超级英雄</Select.Option>
                    <Select.Option value="魔幻">魔幻</Select.Option>
                    <Select.Option value="复仇虐渣">复仇虐渣</Select.Option>
                    <Select.Option value="花季雨季">花季雨季</Select.Option>
                    <Select.Option value="迪化流">迪化流</Select.Option>
                    <Select.Option value="克苏鲁">克苏鲁</Select.Option>
                    <Select.Option value="爆笑">爆笑</Select.Option>
                    <Select.Option value="西幻">西幻</Select.Option>
                    <Select.Option value="废土">废土</Select.Option>
                    <Select.Option value="近水楼台">近水楼台</Select.Option>
                    <Select.Option value="东方玄幻">东方玄幻</Select.Option>
                    <Select.Option value="日韩泰">日韩泰</Select.Option>
                    <Select.Option value="西方罗曼">西方罗曼</Select.Option>
                    <Select.Option value="日久生情">日久生情</Select.Option>
                    <Select.Option value="姐弟恋">姐弟恋</Select.Option>
                    <Select.Option value="清穿">清穿</Select.Option>
                    <Select.Option value="赛博朋克">赛博朋克</Select.Option>
                    <Select.Option value="惊悚">惊悚</Select.Option>
                    <Select.Option value="经营">经营</Select.Option>
                    <Select.Option value="科举">科举</Select.Option>
                    <Select.Option value="随身空间">随身空间</Select.Option>
                    <Select.Option value="白月光">白月光</Select.Option>
                    <Select.Option value="炮灰">炮灰</Select.Option>
                    <Select.Option value="脑洞">脑洞</Select.Option>
                    <Select.Option value="机甲">机甲</Select.Option>
                    <Select.Option value="虫族">虫族</Select.Option>
                    <Select.Option value="全息">全息</Select.Option>
                    <Select.Option value="古早">古早</Select.Option>
                    <Select.Option value="异世大陆">异世大陆</Select.Option>
                    <Select.Option value="江湖">江湖</Select.Option>
                    <Select.Option value="对照组">对照组</Select.Option>
                    <Select.Option value="创业">创业</Select.Option>
                    <Select.Option value="电竞">电竞</Select.Option>
                    <Select.Option value="阴差阳错">阴差阳错</Select.Option>
                    <Select.Option value="宫斗">宫斗</Select.Option>
                    <Select.Option value="失忆">失忆</Select.Option>
                    <Select.Option value="平步青云">平步青云</Select.Option>
                    <Select.Option value="剧透">剧透</Select.Option>
                    <Select.Option value="网王">网王</Select.Option>
                    <Select.Option value="读心术">读心术</Select.Option>
                    <Select.Option value="论坛体">论坛体</Select.Option>
                    <Select.Option value="开挂">开挂</Select.Option>
                    <Select.Option value="神豪流">神豪流</Select.Option>
                    <Select.Option value="囤货">囤货</Select.Option>
                    <Select.Option value="港风">港风</Select.Option>
                    <Select.Option value="排球少年">排球少年</Select.Option>
                    <Select.Option value="天选之子">天选之子</Select.Option>
                    <Select.Option value="恋爱合约">恋爱合约</Select.Option>
                    <Select.Option value="灵魂转换">灵魂转换</Select.Option>
                    <Select.Option value="前世今生">前世今生</Select.Option>
                    <Select.Option value="反套路">反套路</Select.Option>
                    <Select.Option value="女扮男装">女扮男装</Select.Option>
                    <Select.Option value="足球">足球</Select.Option>
                    <Select.Option value="第四天灾">第四天灾</Select.Option>
                    <Select.Option value="腹黑">腹黑</Select.Option>
                    <Select.Option value="家教">家教</Select.Option>
                    <Select.Option value="忠犬">忠犬</Select.Option>
                    <Select.Option value="时代奇缘">时代奇缘</Select.Option>
                    <Select.Option value="火影">火影</Select.Option>
                    <Select.Option value="龙傲天">龙傲天</Select.Option>
                    <Select.Option value="热血">热血</Select.Option>
                    <Select.Option value="职场">职场</Select.Option>
                    <Select.Option value="哨向">哨向</Select.Option>
                    <Select.Option value="异想天开">异想天开</Select.Option>
                    <Select.Option value="都市异闻">都市异闻</Select.Option>
                    <Select.Option value="史诗奇幻">史诗奇幻</Select.Option>
                    <Select.Option value="乙女向">乙女向</Select.Option>
                    <Select.Option value="科幻">科幻</Select.Option>
                    <Select.Option value="御兽">御兽</Select.Option>
                    <Select.Option value="规则怪谈">规则怪谈</Select.Option>
                    <Select.Option value="民国">民国</Select.Option>
                    <Select.Option value="学霸">学霸</Select.Option>
                    <Select.Option value="转生">转生</Select.Option>
                    <Select.Option value="乔装改扮">乔装改扮</Select.Option>
                    <Select.Option value="虐文">虐文</Select.Option>
                    <Select.Option value="商战">商战</Select.Option>
                    <Select.Option value="古代幻想">古代幻想</Select.Option>
                    <Select.Option value="猎人">猎人</Select.Option>
                    <Select.Option value="制服情缘">制服情缘</Select.Option>
                    <Select.Option value="神话传说">神话传说</Select.Option>
                    <Select.Option value="海贼王">海贼王</Select.Option>
                    <Select.Option value="武侠">武侠</Select.Option>
                    <Select.Option value="三教九流">三教九流</Select.Option>
                    <Select.Option value="权谋">权谋</Select.Option>
                    <Select.Option value="预知">预知</Select.Option>
                    <Select.Option value="异闻传说">异闻传说</Select.Option>
                    <Select.Option value="红楼梦">红楼梦</Select.Option>
                    <Select.Option value="原神">原神</Select.Option>
                    <Select.Option value="高智商">高智商</Select.Option>
                    <Select.Option value="吐槽役">吐槽役</Select.Option>
                    <Select.Option value="荒野求生">荒野求生</Select.Option>
                    <Select.Option value="星穹铁道">星穹铁道</Select.Option>
                    <Select.Option value="抽奖抽卡">抽奖抽卡</Select.Option>
                    <Select.Option value="古典名著">古典名著</Select.Option>
                    <Select.Option value="古穿今">古穿今</Select.Option>
                    <Select.Option value="边缘恋歌">边缘恋歌</Select.Option>
                    <Select.Option value="黑篮">黑篮</Select.Option>
                    <Select.Option value="总裁">总裁</Select.Option>
                    <Select.Option value="宋穿">宋穿</Select.Option>
                    <Select.Option value="时代新风">时代新风</Select.Option>
                    <Select.Option value="明穿">明穿</Select.Option>
                    <Select.Option value="西方名著">西方名著</Select.Option>
                    <Select.Option value="吐槽">吐槽</Select.Option>
                    <Select.Option value="唐穿">唐穿</Select.Option>
                    <Select.Option value="男配">男配</Select.Option>
                    <Select.Option value="大冒险">大冒险</Select.Option>
                    <Select.Option value="现实">现实</Select.Option>
                    <Select.Option value="召唤流">召唤流</Select.Option>
                    <Select.Option value="烧脑">烧脑</Select.Option>
                    <Select.Option value="御姐">御姐</Select.Option>
                    <Select.Option value="位面">位面</Select.Option>
                    <Select.Option value="真假千金">真假千金</Select.Option>
                    <Select.Option value="卡牌">卡牌</Select.Option>
                    <Select.Option value="傲娇">傲娇</Select.Option>
                    <Select.Option value="网红">网红</Select.Option>
                    <Select.Option value="鬼灭">鬼灭</Select.Option>
                    <Select.Option value="模拟器">模拟器</Select.Option>
                    <Select.Option value="签到流">签到流</Select.Option>
                    <Select.Option value="纸片人">纸片人</Select.Option>
                    <Select.Option value="交换人生">交换人生</Select.Option>
                    <Select.Option value="七五">七五</Select.Option>
                    <Select.Option value="刀剑乱舞">刀剑乱舞</Select.Option>
                    <Select.Option value="吃货">吃货</Select.Option>
                    <Select.Option value="女尊">女尊</Select.Option>
                    <Select.Option value="替身">替身</Select.Option>
                    <Select.Option value="时尚圈">时尚圈</Select.Option>
                    <Select.Option value="燃">燃</Select.Option>
                    <Select.Option value="NPC">NPC</Select.Option>
                    <Select.Option value="秦穿">秦穿</Select.Option>
                    <Select.Option value="萌">萌</Select.Option>
                    <Select.Option value="汉穿">汉穿</Select.Option>
                    <Select.Option value="灵气复苏">灵气复苏</Select.Option>
                    <Select.Option value="极品亲戚">极品亲戚</Select.Option>
                    <Select.Option value="少女漫">少女漫</Select.Option>
                    <Select.Option value="三国穿越">三国穿越</Select.Option>
                    <Select.Option value="非遗">非遗</Select.Option>
                    <Select.Option value="性别转换">性别转换</Select.Option>
                    <Select.Option value="奇谭">奇谭</Select.Option>
                    <Select.Option value="多重人格">多重人格</Select.Option>
                    <Select.Option value="盲盒">盲盒</Select.Option>
                    <Select.Option value="公路文">公路文</Select.Option>
                    <Select.Option value="app">app</Select.Option>
                    <Select.Option value="群穿">群穿</Select.Option>
                    <Select.Option value="田园">田园</Select.Option>
                    <Select.Option value="FGO">FGO</Select.Option>
                    <Select.Option value="洪荒">洪荒</Select.Option>
                    <Select.Option value="JOJO">JOJO</Select.Option>
                    <Select.Option value="读档流">读档流</Select.Option>
                    <Select.Option value="开荒">开荒</Select.Option>
                    <Select.Option value="犬夜叉">犬夜叉</Select.Option>
                    <Select.Option value="中二">中二</Select.Option>
                    <Select.Option value="齐神">齐神</Select.Option>
                    <Select.Option value="中世纪">中世纪</Select.Option>
                    <Select.Option value="毒舌">毒舌</Select.Option>
                    <Select.Option value="冰山">冰山</Select.Option>
                    <Select.Option value="赶山赶海">赶山赶海</Select.Option>
                    <Select.Option value="魔法少女">魔法少女</Select.Option>
                    <Select.Option value="聊斋">聊斋</Select.Option>
                    <Select.Option value="暖男">暖男</Select.Option>
                    <Select.Option value="亚人">亚人</Select.Option>
                    <Select.Option value="锦鲤">锦鲤</Select.Option>
                    <Select.Option value="银魂">银魂</Select.Option>
                    <Select.Option value="血族">血族</Select.Option>
                    <Select.Option value="骑士与剑">骑士与剑</Select.Option>
                    <Select.Option value="美娱">美娱</Select.Option>
                    <Select.Option value="亡灵异族">亡灵异族</Select.Option>
                    <Select.Option value="天降">天降</Select.Option>
                    <Select.Option value="封神">封神</Select.Option>
                    <Select.Option value="死神">死神</Select.Option>
                    <Select.Option value="七年之痒">七年之痒</Select.Option>
                    <Select.Option value="蒸汽朋克">蒸汽朋克</Select.Option>
                    <Select.Option value="BE">BE</Select.Option>
                    <Select.Option value="曲艺">曲艺</Select.Option>
                    <Select.Option value="红包群">红包群</Select.Option>
                    <Select.Option value="原始社会">原始社会</Select.Option>
                    <Select.Option value="恶役">恶役</Select.Option>
                    <Select.Option value="对话体">对话体</Select.Option>
                    <Select.Option value="悲剧">悲剧</Select.Option>
                    <Select.Option value="扶贫">扶贫</Select.Option>
                    <Select.Option value="网配">网配</Select.Option>
                    <Select.Option value="港台">港台</Select.Option>
                    <Select.Option value="婆媳">婆媳</Select.Option>
                    <Select.Option value="SD">SD</Select.Option>
                    <Select.Option value="圣斗士">圣斗士</Select.Option>
                    <Select.Option value="绝区零">绝区零</Select.Option>
                    <Select.Option value="真假少爷">真假少爷</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="description" label="简介">
                  <TextArea 
                    placeholder="请输入小说简介" 
                    rows={3}
                    maxLength={500}
                    showCount
                  />
                </Form.Item>
              </Col>
            </Row>
            
            {/* 小说性质编辑 */}
            <div className="border-t pt-4 mt-4">
              <Title level={5} className="mb-3">小说性质</Title>
              <Row gutter={[16, 16]}>
                                 <Col span={8}>
                   <Form.Item name="plot_points" label="关键情节点">
                     <Select 
                       mode="tags" 
                       placeholder="选择或输入关键情节点" 
                       allowClear
                       maxTagCount={3}
                     >
                       <Select.Option value="入学试炼">入学试炼</Select.Option>
                       <Select.Option value="天赋觉醒">天赋觉醒</Select.Option>
                       <Select.Option value="初次相遇">初次相遇</Select.Option>
                       <Select.Option value="危机降临">危机降临</Select.Option>
                       <Select.Option value="实力突破">实力突破</Select.Option>
                       <Select.Option value="感情升温">感情升温</Select.Option>
                       <Select.Option value="背叛与救赎">背叛与救赎</Select.Option>
                       <Select.Option value="最终决战">最终决战</Select.Option>
                       <Select.Option value="真相大白">真相大白</Select.Option>
                       <Select.Option value="圆满结局">圆满结局</Select.Option>
                     </Select>
                   </Form.Item>
                 </Col>
                 <Col span={8}>
                   <Form.Item name="theme" label="主题">
                     <Select 
                       mode="tags" 
                       placeholder="选择或输入主题" 
                       allowClear
                       maxTagCount={3}
                     >
                       <Select.Option value="成长">成长</Select.Option>
                       <Select.Option value="友情">友情</Select.Option>
                       <Select.Option value="爱情">爱情</Select.Option>
                       <Select.Option value="修仙">修仙</Select.Option>
                       <Select.Option value="复仇">复仇</Select.Option>
                       <Select.Option value="救赎">救赎</Select.Option>
                       <Select.Option value="励志">励志</Select.Option>
                       <Select.Option value="冒险">冒险</Select.Option>
                       <Select.Option value="悬疑">悬疑</Select.Option>
                       <Select.Option value="治愈">治愈</Select.Option>
                     </Select>
                   </Form.Item>
                 </Col>
                 <Col span={8}>
                   <Form.Item name="world_setting" label="世界设定">
                     <Select 
                       mode="tags" 
                       placeholder="选择或输入世界设定" 
                       allowClear
                       maxTagCount={3}
                     >
                       <Select.Option value="现代修仙学院">现代修仙学院</Select.Option>
                       <Select.Option value="古代仙侠世界">古代仙侠世界</Select.Option>
                       <Select.Option value="现代都市">现代都市</Select.Option>
                       <Select.Option value="古代宫廷">古代宫廷</Select.Option>
                       <Select.Option value="未来科幻">未来科幻</Select.Option>
                       <Select.Option value="异世界">异世界</Select.Option>
                       <Select.Option value="校园生活">校园生活</Select.Option>
                       <Select.Option value="职场环境">职场环境</Select.Option>
                       <Select.Option value="末世废土">末世废土</Select.Option>
                       <Select.Option value="魔法世界">魔法世界</Select.Option>
                     </Select>
                   </Form.Item>
                 </Col>
                 <Col span={8}>
                   <Form.Item name="time_period" label="时代背景">
                     <Select 
                       mode="tags" 
                       placeholder="选择或输入时代背景" 
                       allowClear
                       maxTagCount={3}
                     >
                       <Select.Option value="现代">现代</Select.Option>
                       <Select.Option value="古代">古代</Select.Option>
                       <Select.Option value="民国">民国</Select.Option>
                       <Select.Option value="未来">未来</Select.Option>
                       <Select.Option value="现代架空">现代架空</Select.Option>
                       <Select.Option value="古代架空">古代架空</Select.Option>
                       <Select.Option value="近现代">近现代</Select.Option>
                       <Select.Option value="中世纪">中世纪</Select.Option>
                       <Select.Option value="文艺复兴">文艺复兴</Select.Option>
                       <Select.Option value="工业革命">工业革命</Select.Option>
                     </Select>
                   </Form.Item>
                 </Col>
                 <Col span={8}>
                   <Form.Item name="location" label="地点">
                     <Select 
                       mode="tags" 
                       placeholder="选择或输入地点" 
                       allowClear
                       maxTagCount={3}
                     >
                       <Select.Option value="九天玄道大学">九天玄道大学</Select.Option>
                       <Select.Option value="北京">北京</Select.Option>
                       <Select.Option value="上海">上海</Select.Option>
                       <Select.Option value="古代皇宫">古代皇宫</Select.Option>
                       <Select.Option value="现代校园">现代校园</Select.Option>
                       <Select.Option value="修仙门派">修仙门派</Select.Option>
                       <Select.Option value="都市中心">都市中心</Select.Option>
                       <Select.Option value="乡村小镇">乡村小镇</Select.Option>
                       <Select.Option value="异世界大陆">异世界大陆</Select.Option>
                       <Select.Option value="太空站">太空站</Select.Option>
                     </Select>
                   </Form.Item>
                 </Col>
                 <Col span={8}>
                   <Form.Item name="social_context" label="社会背景">
                     <Select 
                       mode="tags" 
                       placeholder="选择或输入社会背景" 
                       allowClear
                       maxTagCount={3}
                     >
                       <Select.Option value="修仙学院">修仙学院</Select.Option>
                       <Select.Option value="学生群体">学生群体</Select.Option>
                       <Select.Option value="豪门世家">豪门世家</Select.Option>
                       <Select.Option value="普通家庭">普通家庭</Select.Option>
                       <Select.Option value="校园生活">校园生活</Select.Option>
                       <Select.Option value="职场环境">职场环境</Select.Option>
                       <Select.Option value="江湖武林">江湖武林</Select.Option>
                       <Select.Option value="宫廷政治">宫廷政治</Select.Option>
                       <Select.Option value="末世生存">末世生存</Select.Option>
                       <Select.Option value="星际社会">星际社会</Select.Option>
                     </Select>
                   </Form.Item>
                 </Col>
                 <Col span={8}>
                   <Form.Item name="emotional_tone" label="情感基调">
                     <Select 
                       mode="tags" 
                       placeholder="选择或输入情感基调" 
                       allowClear
                       maxTagCount={3}
                     >
                       <Select.Option value="轻松">轻松</Select.Option>
                       <Select.Option value="励志">励志</Select.Option>
                       <Select.Option value="温馨">温馨</Select.Option>
                       <Select.Option value="甜宠">甜宠</Select.Option>
                       <Select.Option value="虐恋">虐恋</Select.Option>
                       <Select.Option value="沉重">沉重</Select.Option>
                       <Select.Option value="热血">热血</Select.Option>
                       <Select.Option value="治愈">治愈</Select.Option>
                       <Select.Option value="悬疑">悬疑</Select.Option>
                       <Select.Option value="搞笑">搞笑</Select.Option>
                     </Select>
                   </Form.Item>
                 </Col>
                 <Col span={8}>
                   <Form.Item name="writing_style" label="写作风格">
                     <Select 
                       mode="tags" 
                       placeholder="选择或输入写作风格" 
                       allowClear
                       maxTagCount={3}
                     >
                       <Select.Option value="轻松幽默">轻松幽默</Select.Option>
                       <Select.Option value="细腻生动">细腻生动</Select.Option>
                       <Select.Option value="严肃深沉">严肃深沉</Select.Option>
                       <Select.Option value="浪漫唯美">浪漫唯美</Select.Option>
                       <Select.Option value="简洁明快">简洁明快</Select.Option>
                       <Select.Option value="华丽辞藻">华丽辞藻</Select.Option>
                       <Select.Option value="朴实无华">朴实无华</Select.Option>
                       <Select.Option value="张力十足">张力十足</Select.Option>
                       <Select.Option value="紧凑爽利">紧凑爽利</Select.Option>
                       <Select.Option value="细腻流动">细腻流动</Select.Option>
                     </Select>
                   </Form.Item>
                 </Col>
                 <Col span={8}>
                   <Form.Item name="target_audience" label="目标读者">
                     <Select 
                       mode="tags" 
                       placeholder="选择或输入目标读者" 
                       allowClear
                       maxTagCount={3}
                     >
                       <Select.Option value="年轻读者">年轻读者</Select.Option>
                       <Select.Option value="仙侠爱好者">仙侠爱好者</Select.Option>
                       <Select.Option value="学生群体">学生群体</Select.Option>
                       <Select.Option value="成熟读者">成熟读者</Select.Option>
                       <Select.Option value="女性读者">女性读者</Select.Option>
                       <Select.Option value="男性读者">男性读者</Select.Option>
                       <Select.Option value="青少年">青少年</Select.Option>
                       <Select.Option value="成年人">成年人</Select.Option>
                       <Select.Option value="职场人士">职场人士</Select.Option>
                       <Select.Option value="文学爱好者">文学爱好者</Select.Option>
                     </Select>
                   </Form.Item>
                 </Col>
                 <Col span={8}>
                   <Form.Item name="reader_expectation" label="读者期待">
                     <Select 
                       mode="tags" 
                       placeholder="选择或输入读者期待" 
                       allowClear
                       maxTagCount={3}
                     >
                       <Select.Option value="爽文">爽文</Select.Option>
                       <Select.Option value="成长">成长</Select.Option>
                       <Select.Option value="修仙">修仙</Select.Option>
                       <Select.Option value="深度">深度</Select.Option>
                       <Select.Option value="轻松">轻松</Select.Option>
                       <Select.Option value="刺激">刺激</Select.Option>
                       <Select.Option value="感动">感动</Select.Option>
                       <Select.Option value="思考">思考</Select.Option>
                       <Select.Option value="娱乐">娱乐</Select.Option>
                       <Select.Option value="治愈">治愈</Select.Option>
                     </Select>
                   </Form.Item>
                 </Col>
                <Col span={8}>
                  <Form.Item name="pov" label="视角">
                    <Select placeholder="选择视角" allowClear>
                      <Select.Option value="第一人称">第一人称</Select.Option>
                      <Select.Option value="第三人称">第三人称</Select.Option>
                      <Select.Option value="全知视角">全知视角</Select.Option>
                      <Select.Option value="限知视角">限知视角</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="pacing" label="节奏">
                    <Select placeholder="选择节奏" allowClear>
                      <Select.Option value="快节奏">快节奏</Select.Option>
                      <Select.Option value="慢节奏">慢节奏</Select.Option>
                      <Select.Option value="张弛有度">张弛有度</Select.Option>
                      <Select.Option value="紧凑">紧凑</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="conflict_type" label="冲突类型">
                    <Select placeholder="选择冲突类型" allowClear>
                      <Select.Option value="外部冲突">外部冲突</Select.Option>
                      <Select.Option value="内部冲突">内部冲突</Select.Option>
                      <Select.Option value="人际冲突">人际冲突</Select.Option>
                      <Select.Option value="环境冲突">环境冲突</Select.Option>
                      <Select.Option value="价值观冲突">价值观冲突</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="resolution_style" label="结局风格">
                    <Select placeholder="选择结局风格" allowClear>
                      <Select.Option value="圆满结局">圆满结局</Select.Option>
                      <Select.Option value="开放式结局">开放式结局</Select.Option>
                      <Select.Option value="悲剧结局">悲剧结局</Select.Option>
                      <Select.Option value="反转结局">反转结局</Select.Option>
                      <Select.Option value="留白结局">留白结局</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => setEditingMeta(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                保存
              </Button>
            </div>
          </Form>
        )}
      </Card>

      {/* 最近编辑章节 */}
      <Card>
        <Title level={4} className="mb-4">
          <EditOutlined className="mr-2" />
          最近编辑章节
        </Title>
        {recentChapters.length > 0 ? (
          <List
            dataSource={recentChapters}
            renderItem={(chapter) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{chapter.title}</Text>
                      <Tag color="blue">{chapter.word_count} 字</Tag>
                    </Space>
                  }
                  description={
                    <Space>
                      <CalendarOutlined />
                      <Text type="secondary">{chapter.updated_at}</Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <div className="text-center text-gray-500 py-8">
            <FileTextOutlined className="text-3xl mb-2" />
            <div>暂无章节数据</div>
          </div>
        )}
      </Card>

      {/* 写作日历统计 */}
      <Card>
        <Title level={4} className="mb-4">
          <CalendarOutlined className="mr-2" />
          写作日历统计
        </Title>
        <Calendar
          fullscreen={false}
          cellRender={(date, info) => {
            if (info.type === 'date') {
              const dateStr = date.format('YYYY-MM-DD')
              const stats = calendarStats.find(stat => stat.date === dateStr)
              
              if (!stats || stats.word_count === 0) return null

              return (
                <div className="flex flex-col items-center gap-1">
                  <Badge 
                    count={stats.word_count > 99 ? '99+' : stats.word_count} 
                    style={{ backgroundColor: '#52c41a' }}
                    title={`${stats.word_count} 字`}
                  />
                  {stats.chapter_count > 0 && (
                    <Badge 
                      count={stats.chapter_count} 
                      style={{ backgroundColor: '#1677ff' }}
                      title={`${stats.chapter_count} 章节更新`}
                    />
                  )}
                </div>
              )
            }
            if (info.type === 'month') {
              const monthStr = date.format('YYYY-MM')
              const monthData = calendarStats.filter(stat => stat.date.startsWith(monthStr))
              const totalWords = monthData.reduce((sum: number, stat: CalendarStats) => sum + stat.word_count, 0)
              
              if (totalWords === 0) return null
              
              return (
                <div className="text-center">
                  <div className="text-xs text-gray-500">{totalWords} 字</div>
                </div>
              )
            }
            return info.originNode
          }}
        />
        
        {/* 月度写作统计 */}
        <div className="mt-4 p-3 border rounded bg-green-50">
          <Title level={5} className="text-green-700">本月写作统计</Title>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic 
                title="总字数" 
                value={calendarStats.reduce((sum: number, stat: CalendarStats) => sum + stat.word_count, 0)} 
                suffix="字"
                valueStyle={{ fontSize: '16px' }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="章节更新" 
                value={calendarStats.reduce((sum: number, stat: CalendarStats) => sum + stat.chapter_count, 0)}
                valueStyle={{ fontSize: '16px' }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="写作天数" 
                value={calendarStats.filter((stat: CalendarStats) => stat.word_count > 0).length}
                suffix={`/ ${calendarStats.length}`}
                valueStyle={{ fontSize: '16px' }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="日均字数" 
                value={Math.round(calendarStats.reduce((sum: number, stat: CalendarStats) => sum + stat.word_count, 0) / Math.max(calendarStats.filter((stat: CalendarStats) => stat.word_count > 0).length, 1))}
                suffix="字"
                valueStyle={{ fontSize: '16px' }}
              />
            </Col>
          </Row>
        </div>
      </Card>
    </div>
  )
}
