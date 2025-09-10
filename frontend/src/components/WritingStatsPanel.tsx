'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, Progress, Statistic, Row, Col, Typography, Button, Modal, Form, InputNumber, Tabs, App } from 'antd'
import { TrophyOutlined, FireOutlined, AimOutlined, EditOutlined, LineChartOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import dynamic from 'next/dynamic'

const { Text, Title } = Typography
const { TabPane } = Tabs
const LinePlot: any = dynamic(() => import('@ant-design/plots').then(m => m.Line), { ssr: false })

interface WritingProgress {
  total_chapters: number
  total_words: number
  target_words: number
  progress_percentage: number
  chapters_with_content: number
}

interface WritingStreak {
  current_streak: number
  longest_streak: number
}

interface WritingGoals {
  daily_words?: number
  weekly_words?: number
  monthly_words?: number
  target_completion_date?: string
}

interface DailyStats {
  date: string
  word_count: number
  chapters_updated: number
  writing_time: number
}

interface WritingStatsPanelProps {
  novelId: string
}

export default function WritingStatsPanel({ novelId }: WritingStatsPanelProps) {
  const { message } = App.useApp()
  const { token } = useAuthStore()
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])
  const [progress, setProgress] = useState<WritingProgress | null>(null)
  const [streak, setStreak] = useState<WritingStreak | null>(null)
  const [goals, setGoals] = useState<WritingGoals | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [loading, setLoading] = useState(false)
  const [isGoalModalVisible, setIsGoalModalVisible] = useState(false)
  const [goalForm] = Form.useForm()

  useEffect(() => {
    loadStats()
  }, [novelId])

  const loadStats = async () => {
    try {
      setLoading(true)
      const [progressRes, streakRes, goalsRes, dailyRes] = await Promise.all([
        fetch(`/api/novels/${encodeURIComponent(novelId)}/stats/progress`, { headers }),
        fetch(`/api/novels/${encodeURIComponent(novelId)}/stats/streak`, { headers }),
        fetch(`/api/novels/${encodeURIComponent(novelId)}/stats/goals`, { headers }),
        fetch(`/api/novels/${encodeURIComponent(novelId)}/stats/daily?days=30`, { headers })
      ])

      if (progressRes.ok) {
        const j = await progressRes.json()
        if (j.ok) setProgress(j.data?.progress)
      }
      if (streakRes.ok) {
        const j = await streakRes.json()
        if (j.ok) setStreak(j.data?.streak)
      }
      if (goalsRes.ok) {
        const j = await goalsRes.json()
        if (j.ok) setGoals(j.data?.goals)
      }
      if (dailyRes.ok) {
        const j = await dailyRes.json()
        if (j.ok) setDailyStats(j.data?.stats || [])
      }
    } catch {
      message.error('加载统计失败')
    } finally {
      setLoading(false)
    }
  }

  const saveGoals = async () => {
    try {
      const v = await goalForm.validateFields()
      setLoading(true)
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/stats/goals`, {
        method: 'POST', headers, body: JSON.stringify(v)
      })
      const j = await res.json()
      if (res.ok && j.ok) {
        message.success('目标设置成功')
        setIsGoalModalVisible(false)
        await loadStats()
      } else {
        message.error(j.error?.msg || '设置失败')
      }
    } catch {}
    finally { setLoading(false) }
  }

  const openGoalModal = () => {
    goalForm.setFieldsValue(goals || {})
    setIsGoalModalVisible(true)
  }

  // 准备图表数据
  const chartData = dailyStats.map(stat => ({
    date: stat.date,
    words: stat.word_count,
    chapters: stat.chapters_updated
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
      
      weekly.push({
        week: `第${4-i}周`,
        words: totalWords,
        chapters: totalChapters
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

  return (
    <Card  title={<span><TrophyOutlined className="mr-2" />写作统计</span>} extra={
      <Button  icon={<EditOutlined />} onClick={openGoalModal}>设置目标</Button>
    }>
      <Tabs 
        defaultActiveKey="overview" 
        items={[
          {
            key: 'overview',
            label: '总览',
            children: (
              <div>
                {progress && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <Text>总体进度</Text>
                      <Text type="secondary">{progress.progress_percentage}%</Text>
                    </div>
                    <Progress percent={progress.progress_percentage}  />
                    <Row gutter={16} className="mt-3">
                      <Col span={8}>
                        <Statistic title="总字数" value={progress.total_words} suffix="字" />
                      </Col>
                      <Col span={8}>
                        <Statistic title="章节数" value={progress.total_chapters} />
                      </Col>
                      <Col span={8}>
                        <Statistic title="目标" value={progress.target_words} suffix="字" />
                      </Col>
                    </Row>
                  </div>
                )}

                {streak && (
                  <div className="mb-4">
                    <Row gutter={16}>
                      <Col span={12}>
                        <Card  className="text-center">
                          <FireOutlined className="text-2xl text-orange-500 mb-2" />
                          <div className="text-lg font-bold">{streak.current_streak}</div>
                          <div className="text-xs text-gray-500">连续写作天数</div>
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card  className="text-center">
                          <TrophyOutlined className="text-2xl text-yellow-500 mb-2" />
                          <div className="text-lg font-bold">{streak.longest_streak}</div>
                          <div className="text-xs text-gray-500">最长连续天数</div>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                )}

                {goals && (
                  <div>
                    <Title level={5}><AimOutlined className="mr-2" />写作目标</Title>
                    <Row gutter={16}>
                      {goals.daily_words && (
                        <Col span={8}>
                          <Statistic title="日目标" value={goals.daily_words} suffix="字"  />
                        </Col>
                      )}
                      {goals.weekly_words && (
                        <Col span={8}>
                          <Statistic title="周目标" value={goals.weekly_words} suffix="字"  />
                        </Col>
                      )}
                      {goals.monthly_words && (
                        <Col span={8}>
                          <Statistic title="月目标" value={goals.monthly_words} suffix="字"  />
                        </Col>
                      )}
                    </Row>
                    {goals.target_completion_date && (
                      <div className="mt-2 text-sm text-gray-500">
                        目标完成日期: {goals.target_completion_date}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          },
          {
            key: 'charts',
            label: '字数曲线',
            children: (
              <div>
                <div className="mb-4">
                  <Title level={5}><LineChartOutlined className="mr-2" />每日字数趋势</Title>
                  <div style={{ height: '200px' }}>
                    <LinePlot {...chartConfig} />
                  </div>
                </div>
                
                <div>
                  <Title level={5}><LineChartOutlined className="mr-2" />每周字数统计</Title>
                  <div style={{ height: '200px' }}>
                    <LinePlot {...weeklyChartConfig} />
                  </div>
                </div>
              </div>
            )
          }
        ]}
      />

      {/* 设置目标对话框 */}
      <Modal
        title="设置写作目标"
        open={isGoalModalVisible}
        onOk={saveGoals}
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
    </Card>
  )
}
