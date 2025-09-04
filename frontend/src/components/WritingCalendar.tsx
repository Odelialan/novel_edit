'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, Calendar, Typography, Badge, Row, Col, Statistic, App } from 'antd'
import { CalendarOutlined, FileTextOutlined, FireOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import dayjs, { Dayjs } from 'dayjs'

const { Text, Title } = Typography

interface DailyStats {
  date: string
  word_count: number
  chapters_updated: number
  writing_time: number
}

interface WritingCalendarProps {
  novelId: string
}

export default function WritingCalendar({ novelId }: WritingCalendarProps) {
  const { message } = App.useApp()
  const { token } = useAuthStore()
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}` }), [token])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())

  useEffect(() => {
    loadDailyStats()
  }, [novelId])

  const loadDailyStats = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/stats/daily?days=365`, { headers })
      const j = await res.json()
      if (res.ok && j.ok) {
        setDailyStats(j.data?.stats || [])
      }
    } catch {
      message.error('加载统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  const getDateStats = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD')
    return dailyStats.find(stat => stat.date === dateStr)
  }

  const getDateCellContent = (date: Dayjs) => {
    const stats = getDateStats(date)
    if (!stats || stats.word_count === 0) return null

    const badges = []
    
    if (stats.word_count > 0) {
      badges.push(
        <Badge 
          key="words" 
          count={stats.word_count} 
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

  const getMonthStats = () => {
    const currentMonth = selectedDate.format('YYYY-MM')
    const monthStats = dailyStats.filter(stat => stat.date.startsWith(currentMonth))
    
    const totalWords = monthStats.reduce((sum, stat) => sum + stat.word_count, 0)
    const totalChapters = monthStats.reduce((sum, stat) => sum + stat.chapters_updated, 0)
    const writingDays = monthStats.filter(stat => stat.word_count > 0).length
    const totalDays = monthStats.length
    
    return {
      totalWords,
      totalChapters,
      writingDays,
      totalDays,
      averageWordsPerDay: writingDays > 0 ? Math.round(totalWords / writingDays) : 0
    }
  }

  const getYearStats = () => {
    const currentYear = selectedDate.format('YYYY')
    const yearStats = dailyStats.filter(stat => stat.date.startsWith(currentYear))
    
    const totalWords = yearStats.reduce((sum, stat) => sum + stat.word_count, 0)
    const totalChapters = yearStats.reduce((sum, stat) => sum + stat.chapters_updated, 0)
    const writingDays = yearStats.filter(stat => stat.word_count > 0).length
    const totalDays = yearStats.length
    
    return {
      totalWords,
      totalChapters,
      writingDays,
      totalDays,
      averageWordsPerDay: writingDays > 0 ? Math.round(totalWords / writingDays) : 0
    }
  }

  const monthStats = getMonthStats()
  const yearStats = getYearStats()

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

  return (
    <Card size="small" title={<span><CalendarOutlined className="mr-2" />写作日历</span>}>
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
        loading={loading}
      />
      
      {/* 月度统计 */}
      <div className="mt-4 p-3 border rounded bg-blue-50">
        <Title level={5} className="text-blue-700">本月统计</Title>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic 
              title="总字数" 
              value={monthStats.totalWords} 
              suffix="字"
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="章节更新" 
              value={monthStats.totalChapters}
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="写作天数" 
              value={monthStats.writingDays}
              suffix={`/ ${monthStats.totalDays}`}
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="日均字数" 
              value={monthStats.averageWordsPerDay}
              suffix="字"
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>
        </Row>
      </div>
      
      {/* 年度统计 */}
      <div className="mt-3 p-3 border rounded bg-green-50">
        <Title level={5} className="text-green-700">本年统计</Title>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic 
              title="总字数" 
              value={yearStats.totalWords} 
              suffix="字"
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="章节更新" 
              value={yearStats.totalChapters}
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="写作天数" 
              value={yearStats.writingDays}
              suffix={`/ ${yearStats.totalDays}`}
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="日均字数" 
              value={yearStats.averageWordsPerDay}
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
    </Card>
  )
}
