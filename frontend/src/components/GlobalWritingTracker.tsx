'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, Row, Col, Typography, Divider, Spin, Progress, Statistic, Button, Modal, Form, InputNumber, message, Tabs, Calendar, Badge } from 'antd'
import { TrophyOutlined, CalendarOutlined, ClockCircleOutlined, BellOutlined, LineChartOutlined, BookOutlined, FireOutlined, AimOutlined, EditOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import dynamic from 'next/dynamic'
import dayjs, { Dayjs } from 'dayjs'

const { Text, Title, Paragraph } = Typography
const { TabPane } = Tabs
const LinePlot: any = dynamic(() => import('@ant-design/plots').then(m => m.Line), { ssr: false })

interface GlobalWritingStats {
  total_novels: number
  total_words: number
  total_chapters: number
  total_writing_days: number
  current_streak: number
  longest_streak: number
  average_words_per_day: number
  target_words: number
  progress_percentage: number
}

interface GlobalWritingGoals {
  daily_words?: number
  weekly_words?: number
  monthly_words?: number
  target_completion_date?: string
}

interface DailyStats {
  date: string
  word_count: number
  chapters_updated: number
  novels_updated: number
}

interface NovelProgress {
  id: string
  title: string
  word_count: number
  chapters_count: number
  last_updated: string
  progress_percentage: number
}

interface GlobalWritingTrackerProps {}

export default function GlobalWritingTracker({}: GlobalWritingTrackerProps) {
  const { token } = useAuthStore()
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])
  const [globalStats, setGlobalStats] = useState<GlobalWritingStats | null>(null)
  const [globalGoals, setGlobalGoals] = useState<GlobalWritingGoals | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [novelsProgress, setNovelsProgress] = useState<NovelProgress[]>([])
  const [loading, setLoading] = useState(false)
  const [isGoalModalVisible, setIsGoalModalVisible] = useState(false)
  const [goalForm] = Form.useForm()

  useEffect(() => {
    loadGlobalStats()
  }, [])

  const loadGlobalStats = async () => {
    try {
      setLoading(true)
      const [statsRes, goalsRes, dailyRes, novelsRes] = await Promise.all([
        fetch('/api/writing/global/stats', { headers }),
        fetch('/api/writing/global/goals', { headers }),
        fetch('/api/writing/global/daily?days=30', { headers }),
        fetch('/api/writing/global/novels-progress', { headers })
      ])

      if (statsRes.ok) {
        const j = await statsRes.json()
        if (j.ok) setGlobalStats(j.data?.stats)
      }
      if (goalsRes.ok) {
        const j = await goalsRes.json()
        if (j.ok) setGlobalGoals(j.data?.goals)
      }
      if (dailyRes.ok) {
        const j = await dailyRes.json()
        if (j.ok) setDailyStats(j.data?.stats || [])
      }
      if (novelsRes.ok) {
        const j = await novelsRes.json()
        if (j.ok) setNovelsProgress(j.data?.novels || [])
      }
    } catch {
      message.error('加载全局统计失败')
    } finally {
      setLoading(false)
    }
  }

  const saveGlobalGoals = async () => {
    try {
      const v = await goalForm.validateFields()
      setLoading(true)
      const res = await fetch('/api/writing/global/goals', {
        method: 'POST', headers, body: JSON.stringify(v)
      })
      const j = await res.json()
      if (res.ok && j.ok) {
        message.success('全局写作目标设置成功')
        setIsGoalModalVisible(false)
        await loadGlobalStats()
      } else {
        message.error(j.error?.msg || '设置失败')
      }
    } catch {}
    finally { setLoading(false) }
  }

  const openGoalModal = () => {
    goalForm.setFieldsValue(globalGoals || {})
    setIsGoalModalVisible(true)
  }

  // 准备图表数据
  const chartData = dailyStats.map(stat => ({
    date: stat.date,
    words: stat.word_count,
    chapters: stat.chapters_updated,
    novels: stat.novels_updated
  }))

  const weeklyData = useMemo(() => {
    const weekly = []
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * i))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      
      const weekStats = dailyStats.filter(stat => {
        const statDate = new Date(stat.date)
        return statDate >= weekStart && statDate <= weekEnd
      })
      
      const totalWords = weekStats.reduce((sum, stat) => sum + stat.word_count, 0)
      const totalChapters = weekStats.reduce((sum, stat) => sum + stat.chapters_updated, 0)
      const totalNovels = weekStats.reduce((sum, stat) => sum + stat.novels_updated, 0)
      
      weekly.push({
        week: `第${4-i}周`,
        words: totalWords,
        chapters: totalChapters,
        novels: totalNovels
      })
    }
    return weekly.reverse()
  }, [dailyStats])

  const chartConfig = {
    data: chartData,
    xField: 'date',
    yField: 'words',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
    point: {
      size: 4,
      shape: 'circle',
      style: {
        fill: 'white',
        stroke: '#1677ff',
        lineWidth: 2,
      },
    },
    tooltip: {
      showCrosshairs: true,
      shared: true,
    },
  }

  const weeklyChartConfig = {
    data: weeklyData,
    xField: 'week',
    yField: 'words',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
    point: {
      size: 4,
      shape: 'circle',
      style: {
        fill: 'white',
        stroke: '#52c41a',
        lineWidth: 2,
      },
    },
    tooltip: {
      showCrosshairs: true,
      shared: true,
    },
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Spin size="large" />
        <div className="mt-4">加载全局写作统计中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Title level={2}>
          <TrophyOutlined className="mr-2" />
          全局写作目标追踪
        </Title>
        <Paragraph className="text-gray-600">
          追踪您所有小说的写作进度，设置总体写作目标，分析写作习惯和效率。
          系统自动汇总所有小说的数据，帮助您保持写作动力。
        </Paragraph>
      </div>

      {/* 全局统计概览 */}
      {globalStats && (
        <Card>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <Text>总体写作进度</Text>
              <Text type="secondary">{globalStats.progress_percentage}%</Text>
            </div>
            <Progress percent={globalStats.progress_percentage} size="large" />
          </div>
          
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="总字数" value={globalStats.total_words} suffix="字" />
            </Col>
            <Col span={6}>
              <Statistic title="总章节数" value={globalStats.total_chapters} />
            </Col>
            <Col span={6}>
              <Statistic title="小说数量" value={globalStats.total_novels} />
            </Col>
            <Col span={6}>
              <Statistic title="写作天数" value={globalStats.total_writing_days} />
            </Col>
          </Row>
        </Card>
      )}

      <Row gutter={[16, 16]}>
        {/* 写作统计面板 */}
        <Col xs={24} lg={12}>
          <Card size="small" title={<span><TrophyOutlined className="mr-2" />写作统计</span>} extra={
            <Button size="small" icon={<EditOutlined />} onClick={openGoalModal}>设置目标</Button>
          }>
            {globalStats && (
              <div className="mb-4">
                <Row gutter={16}>
                  <Col span={12}>
                    <Card size="small" className="text-center">
                      <FireOutlined className="text-2xl text-orange-500 mb-2" />
                      <div className="text-lg font-bold">{globalStats.current_streak}</div>
                      <div className="text-xs text-gray-500">连续写作天数</div>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" className="text-center">
                      <TrophyOutlined className="text-2xl text-yellow-500 mb-2" />
                      <div className="text-lg font-bold">{globalStats.longest_streak}</div>
                      <div className="text-xs text-gray-500">最长连续天数</div>
                    </Card>
                  </Col>
                </Row>
              </div>
            )}

            {globalGoals && (
              <div>
                <Title level={5}><AimOutlined className="mr-2" />写作目标</Title>
                <Row gutter={16}>
                  {globalGoals.daily_words && (
                    <Col span={8}>
                      <Statistic title="日目标" value={globalGoals.daily_words} suffix="字" size="small" />
                    </Col>
                  )}
                  {globalGoals.weekly_words && (
                    <Col span={8}>
                      <Statistic title="周目标" value={globalGoals.weekly_words} suffix="字" size="small" />
                    </Col>
                  )}
                  {globalGoals.monthly_words && (
                    <Col span={8}>
                      <Statistic title="月目标" value={globalGoals.monthly_words} suffix="字" size="small" />
                    </Col>
                  )}
                </Row>
                {globalGoals.target_completion_date && (
                  <div className="mt-2 text-sm text-gray-500">
                    目标完成日期: {globalGoals.target_completion_date}
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>

        {/* 小说进度概览 */}
        <Col xs={24} lg={12}>
          <Card size="small" title={<span><BookOutlined className="mr-2" />小说进度概览</span>}>
            {novelsProgress.length > 0 ? (
              <div className="space-y-3">
                {novelsProgress.slice(0, 5).map((novel) => (
                  <div key={novel.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="font-medium">{novel.title}</div>
                      <div className="text-sm text-gray-500">
                        {novel.word_count} 字 · {novel.chapters_count} 章
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{novel.progress_percentage}%</div>
                      <Progress percent={novel.progress_percentage} size="small" showInfo={false} />
                    </div>
                  </div>
                ))}
                {novelsProgress.length > 5 && (
                  <div className="text-center text-gray-500 text-sm">
                    还有 {novelsProgress.length - 5} 部小说...
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                暂无小说数据
              </div>
            )}
          </Card>
        </Col>

        {/* 字数曲线图表 */}
        <Col xs={24}>
          <Card size="small" title={<span><LineChartOutlined className="mr-2" />写作趋势分析</span>}>
            <Tabs 
              defaultActiveKey="daily" 
              size="small"
              items={[
                {
                  key: 'daily',
                  label: '每日字数趋势',
                  children: (
                    <div style={{ height: '300px' }}>
                      <LinePlot {...chartConfig} />
                    </div>
                  )
                },
                {
                  key: 'weekly',
                  label: '每周字数统计',
                  children: (
                    <div style={{ height: '300px' }}>
                      <LinePlot {...weeklyChartConfig} />
                    </div>
                  )
                }
              ]}
            />
          </Card>
        </Col>

        {/* 写作日历 */}
        <Col xs={24}>
          <Card size="small" title={<span><CalendarOutlined className="mr-2" />写作日历</span>}>
            <Calendar
              fullscreen={false}
              cellRender={(date, info) => {
                if (info.type === 'date') {
                  const dateStr = date.format('YYYY-MM-DD')
                  const stats = dailyStats.find(stat => stat.date === dateStr)
                  if (!stats || stats.word_count === 0) return null

                  return (
                    <div className="flex flex-col items-center gap-1">
                      <Badge 
                        count={stats.word_count} 
                        style={{ backgroundColor: '#52c41a' }}
                        title={`${stats.word_count} 字`}
                      />
                      {stats.chapters_updated > 0 && (
                        <Badge 
                          count={stats.chapters_updated} 
                          style={{ backgroundColor: '#1677ff' }}
                          title={`${stats.chapters_updated} 章节更新`}
                        />
                      )}
                    </div>
                  )
                } else if (info.type === 'month') {
                  const monthStr = date.format('YYYY-MM')
                  const monthData = dailyStats.filter(stat => stat.date.startsWith(monthStr))
                  const totalWords = monthData.reduce((sum, stat) => sum + stat.word_count, 0)
                  
                  if (totalWords === 0) return null
                  
                  return (
                    <div className="text-center">
                      <div className="text-xs text-gray-500">{totalWords} 字</div>
                    </div>
                  )
                }
                return null
              }}
            />
            
            {/* 月度统计 */}
            <div className="mt-4 p-3 border rounded bg-blue-50">
              <Title level={5} className="text-blue-700">本月统计</Title>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic 
                    title="总字数" 
                    value={dailyStats.reduce((sum, stat) => sum + stat.word_count, 0)} 
                    suffix="字"
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="章节更新" 
                    value={dailyStats.reduce((sum, stat) => sum + stat.chapters_updated, 0)}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="写作天数" 
                    value={dailyStats.filter(stat => stat.word_count > 0).length}
                    suffix={`/ ${dailyStats.length}`}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="日均字数" 
                    value={Math.round(dailyStats.reduce((sum, stat) => sum + stat.word_count, 0) / Math.max(dailyStats.filter(stat => stat.word_count > 0).length, 1))}
                    suffix="字"
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
              </Row>
            </div>
          </Card>
        </Col>

        {/* 番茄钟与目标提醒 */}
        <Col xs={24}>
          <Card size="small" title={<span><ClockCircleOutlined className="mr-2" />番茄钟与目标提醒</span>}>
            <Row gutter={16}>
              <Col xs={24} lg={12}>
                <div className="text-center p-4 border rounded">
                  <Title level={4}>🍅 番茄钟</Title>
                  <Paragraph>
                    专注写作25分钟，休息5分钟
                  </Paragraph>
                  <Button type="primary" size="large">
                    开始专注写作
                  </Button>
                </div>
              </Col>
              <Col xs={24} lg={12}>
                <div className="text-center p-4 border rounded">
                  <Title level={4}>⏰ 目标提醒</Title>
                  <Paragraph>
                    设置每日写作提醒时间
                  </Paragraph>
                  <Button type="primary" size="large">
                    设置提醒
                  </Button>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 设置目标对话框 */}
      <Modal
        title="设置全局写作目标"
        open={isGoalModalVisible}
        onOk={saveGlobalGoals}
        onCancel={() => setIsGoalModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={goalForm} layout="vertical">
          <Form.Item name="daily_words" label="日目标字数">
            <InputNumber min={0} placeholder="每日写作目标字数" className="w-full" />
          </Form.Item>
          <Form.Item name="weekly_words" label="周目标字数">
            <InputNumber min={0} placeholder="每周写作目标字数" className="w-full" />
          </Form.Item>
          <Form.Item name="monthly_words" label="月目标字数">
            <InputNumber min={0} placeholder="每月写作目标字数" className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
