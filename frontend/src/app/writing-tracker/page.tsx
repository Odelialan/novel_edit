'use client'

import { useState, useEffect } from 'react'
import { Card, Row, Col, Typography, Divider, Spin } from 'antd'
import { TrophyOutlined, CalendarOutlined, ClockCircleOutlined, BellOutlined } from '@ant-design/icons'
import WritingStatsPanel from '@/components/WritingStatsPanel'
import WritingCalendar from '@/components/WritingCalendar'
import PomodoroTimer from '@/components/PomodoroTimer'
import WritingReminder from '@/components/WritingReminder'

const { Title, Paragraph } = Typography

export default function WritingTrackerPage() {
  const [selectedNovelId, setSelectedNovelId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 这里可以从URL参数或localStorage获取当前选中的小说ID
    // 暂时使用默认值
    setSelectedNovelId('default')
  }, [])

  if (!selectedNovelId) {
    return (
      <div className="p-6 text-center">
        <Spin size="large" />
        <div className="mt-4">请先选择要追踪的小说</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>
          <TrophyOutlined className="mr-2" />
          写作目标追踪
        </Title>
        <Paragraph>
          在这里追踪您的写作进度，设置目标，管理时间，获得写作动力。
          系统会自动统计您的写作数据，帮助您保持写作习惯。
        </Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        {/* 写作统计面板 */}
        <Col xs={24} lg={12}>
          <WritingStatsPanel novelId={selectedNovelId} />
        </Col>

        {/* 写作提醒 */}
        <Col xs={24} lg={12}>
          <WritingReminder 
            novelId={selectedNovelId}
            currentWords={0} // 这里需要从后端获取当前字数
            dailyGoal={1000}
            weeklyGoal={5000}
            monthlyGoal={20000}
          />
        </Col>

        {/* 番茄钟计时器 */}
        <Col xs={24} lg={12}>
          <PomodoroTimer />
        </Col>

        {/* 写作日历 */}
        <Col xs={24} lg={12}>
          <WritingCalendar novelId={selectedNovelId} />
        </Col>
      </Row>

      <Divider />

      <div className="text-center text-gray-500">
        <Paragraph>
          💡 提示：定期查看统计数据，设置合理的目标，使用番茄钟保持专注，
          让写作成为您生活的一部分。
        </Paragraph>
      </div>
    </div>
  )
}
