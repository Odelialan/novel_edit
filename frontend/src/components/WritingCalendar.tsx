'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, Calendar, Typography, Badge, Row, Col, Statistic, App, Tabs, Select, Button } from 'antd'
import { CalendarOutlined, FileTextOutlined, FireOutlined, TrophyOutlined, LineChartOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import dayjs, { Dayjs } from 'dayjs'

const { Text, Title } = Typography
const { Option } = Select

interface DailyStats {
  date: string
  word_count: number
  chapters_updated: number
  writing_time: number
}

interface WeeklyStats {
  week_start: string
  week_end: string
  week_label: string
  total_words: number
  total_chapters: number
  writing_days: number
  average_words_per_day: number
}

interface MonthlyStats {
  month: string
  month_label: string
  total_words: number
  total_chapters: number
  writing_days: number
  total_days: number
  average_words_per_day: number
}

interface YearlyStats {
  year: string
  year_label: string
  total_words: number
  total_chapters: number
  writing_days: number
  total_days: number
  average_words_per_day: number
}

interface ComprehensiveStats {
  daily_stats: DailyStats[]
  weekly_stats: WeeklyStats[]
  monthly_stats: MonthlyStats[]
  yearly_stats: YearlyStats[]
  streak: {
    current_streak: number
    longest_streak: number
  }
  summary: {
    total_words: number
    total_chapters: number
    writing_days: number
    average_words_per_day: number
    current_streak: number
    longest_streak: number
  }
}

interface WritingCalendarProps {
  novelId: string
}

export default function WritingCalendar({ novelId }: WritingCalendarProps) {
  const { message } = App.useApp()
  const { token } = useAuthStore()
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}` }), [token])
  const [comprehensiveStats, setComprehensiveStats] = useState<ComprehensiveStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())
  const [activeTab, setActiveTab] = useState('calendar')

  useEffect(() => {
    loadComprehensiveStats()
  }, [novelId])

  const loadComprehensiveStats = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/stats/comprehensive`, { headers })
      const j = await res.json()
      if (res.ok && j.ok) {
        setComprehensiveStats(j.data)
      }
    } catch {
      message.error('加载统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  const getDateStats = (date: Dayjs) => {
    if (!comprehensiveStats) return null
    const dateStr = date.format('YYYY-MM-DD')
    return comprehensiveStats.daily_stats.find(stat => stat.date === dateStr)
  }

  const getDateCellContent = (date: Dayjs) => {
    const stats = getDateStats(date)
    if (!stats || stats.word_count === 0) return null

    const badges = []
    
    if (stats.word_count > 0) {
      badges.push(
        <Badge 
          key="words" 
          count={stats.word_count > 99 ? '99+' : stats.word_count} 
          style={{ backgroundColor: '#52c41a' }}
          title={`${stats.word_count} 字`}
        />
      )
    }
    
    if (stats.chapters_updated > 0) {
      badges.push(
        <Badge 
          key="chapters" 
          count={stats.chapters_updated} 
          style={{ backgroundColor: '#1677ff' }}
          title={`${stats.chapters_updated} 章节更新`}
        />
      )
    }

    return (
      <div className="flex flex-col items-center gap-1">
        {badges}
      </div>
    )
  }

  const onDateSelect = (date: Dayjs) => {
    setSelectedDate(date)
    const stats = getDateStats(date)
    if (stats) {
      message.info(`${date.format('YYYY年MM月DD日')}: ${stats.word_count} 字，${stats.chapters_updated} 章节更新`)
    }
  }

  const dateCellRender = (date: Dayjs) => {
    return getDateCellContent(date)
  }

  const monthCellRender = (date: Dayjs) => {
    if (!comprehensiveStats) return null
    const monthStr = date.format('YYYY-MM')
    const monthData = comprehensiveStats.daily_stats.filter(stat => stat.date.startsWith(monthStr))
    const totalWords = monthData.reduce((sum, stat) => sum + stat.word_count, 0)
    
    if (totalWords === 0) return null
    
    return (
      <div className="text-center">
        <div className="text-xs text-gray-500">{totalWords} 字</div>
      </div>
    )
  }

  const renderWeeklyStats = () => {
    if (!comprehensiveStats) return null
    
    return (
      <div className="space-y-4">
        {comprehensiveStats.weekly_stats.slice(0, 8).map((week, index) => (
          <Card key={index} size="small" className="bg-blue-50">
            <Row gutter={16}>
              <Col span={6}>
                <Text strong>{week.week_label}</Text>
              </Col>
              <Col span={4}>
                <Statistic title="字数" value={week.total_words} suffix="字" valueStyle={{ fontSize: '14px' }} />
              </Col>
              <Col span={4}>
                <Statistic title="章节" value={week.total_chapters} valueStyle={{ fontSize: '14px' }} />
              </Col>
              <Col span={4}>
                <Statistic title="写作天数" value={week.writing_days} suffix="/7" valueStyle={{ fontSize: '14px' }} />
              </Col>
              <Col span={6}>
                <Statistic title="日均字数" value={week.average_words_per_day} suffix="字" valueStyle={{ fontSize: '14px' }} />
              </Col>
            </Row>
          </Card>
        ))}
      </div>
    )
  }

  const renderMonthlyStats = () => {
    if (!comprehensiveStats) return null
    
    return (
      <div className="space-y-4">
        {comprehensiveStats.monthly_stats.slice(0, 6).map((month, index) => (
          <Card key={index} size="small" className="bg-green-50">
            <Row gutter={16}>
              <Col span={6}>
                <Text strong>{month.month_label}</Text>
              </Col>
              <Col span={4}>
                <Statistic title="字数" value={month.total_words} suffix="字" valueStyle={{ fontSize: '14px' }} />
              </Col>
              <Col span={4}>
                <Statistic title="章节" value={month.total_chapters} valueStyle={{ fontSize: '14px' }} />
              </Col>
              <Col span={4}>
                <Statistic title="写作天数" value={month.writing_days} suffix={`/${month.total_days}`} valueStyle={{ fontSize: '14px' }} />
              </Col>
              <Col span={6}>
                <Statistic title="日均字数" value={month.average_words_per_day} suffix="字" valueStyle={{ fontSize: '14px' }} />
              </Col>
            </Row>
          </Card>
        ))}
      </div>
    )
  }

  const renderYearlyStats = () => {
    if (!comprehensiveStats) return null
    
    return (
      <div className="space-y-4">
        {comprehensiveStats.yearly_stats.map((year, index) => (
          <Card key={index} size="small" className="bg-purple-50">
            <Row gutter={16}>
              <Col span={6}>
                <Text strong>{year.year_label}</Text>
              </Col>
              <Col span={4}>
                <Statistic title="字数" value={year.total_words} suffix="字" valueStyle={{ fontSize: '14px' }} />
              </Col>
              <Col span={4}>
                <Statistic title="章节" value={year.total_chapters} valueStyle={{ fontSize: '14px' }} />
              </Col>
              <Col span={4}>
                <Statistic title="写作天数" value={year.writing_days} suffix={`/${year.total_days}`} valueStyle={{ fontSize: '14px' }} />
              </Col>
              <Col span={6}>
                <Statistic title="日均字数" value={year.average_words_per_day} suffix="字" valueStyle={{ fontSize: '14px' }} />
              </Col>
            </Row>
          </Card>
        ))}
      </div>
    )
  }

  if (!comprehensiveStats) {
    return (
      <Card size="small" title={<span><CalendarOutlined className="mr-2" />写作日历统计</span>}>
        <div className="text-center py-8">
          <div className="text-gray-500">加载中...</div>
        </div>
      </Card>
    )
  }

  const tabItems = [
    {
      key: 'calendar',
      label: '日历视图',
      children: (
        <>
          <Calendar
            fullscreen={false}
            cellRender={(current, info) => {
              if (info.type === 'date') {
                return dateCellRender(current);
              }
              if (info.type === 'month') {
                return monthCellRender(current);
              }
              return null;
            }}
            onSelect={onDateSelect}
            value={selectedDate}
          />
          
          {/* 连续写作天数 */}
          <div className="mt-4 p-3 border rounded bg-orange-50">
            <Title level={5} className="text-orange-700 mb-3">连续写作记录</Title>
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" className="text-center">
                  <FireOutlined className="text-2xl text-orange-500 mb-2" />
                  <div className="text-lg font-bold">{comprehensiveStats.streak.current_streak}</div>
                  <div className="text-xs text-gray-500">当前连续天数</div>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" className="text-center">
                  <TrophyOutlined className="text-2xl text-yellow-500 mb-2" />
                  <div className="text-lg font-bold">{comprehensiveStats.streak.longest_streak}</div>
                  <div className="text-xs text-gray-500">最长连续天数</div>
                </Card>
              </Col>
            </Row>
          </div>
          
          {/* 总体统计 */}
          <div className="mt-3 p-3 border rounded bg-green-50">
            <Title level={5} className="text-green-700">总体统计</Title>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic 
                  title="总字数" 
                  value={comprehensiveStats.summary.total_words} 
                  suffix="字"
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="总章节" 
                  value={comprehensiveStats.summary.total_chapters}
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="写作天数" 
                  value={comprehensiveStats.summary.writing_days}
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="日均字数" 
                  value={comprehensiveStats.summary.average_words_per_day}
                  suffix="字"
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
            </Row>
          </div>
          
          {/* 图例说明 */}
          <div className="mt-3 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>图例:</span>
              <Badge count="100" style={{ backgroundColor: '#52c41a' }} title="字数" />
              <span>字数</span>
              <Badge count="2" style={{ backgroundColor: '#1677ff' }} title="章节更新" />
              <span>章节更新</span>
            </div>
          </div>
        </>
      )
    },
    {
      key: 'weekly',
      label: '周统计',
      children: (
        <>
          <div className="mb-4">
            <Title level={5}>最近8周写作统计</Title>
          </div>
          {renderWeeklyStats()}
        </>
      )
    },
    {
      key: 'monthly',
      label: '月统计',
      children: (
        <>
          <div className="mb-4">
            <Title level={5}>最近6个月写作统计</Title>
          </div>
          {renderMonthlyStats()}
        </>
      )
    },
    {
      key: 'yearly',
      label: '年统计',
      children: (
        <>
          <div className="mb-4">
            <Title level={5}>年度写作统计</Title>
          </div>
          {renderYearlyStats()}
        </>
      )
    }
  ]

  return (
    <Card size="small" title={<span><CalendarOutlined className="mr-2" />写作日历统计</span>}>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </Card>
  )
}
