'use client'

import { Card, Row, Col, Typography, Divider } from 'antd'
import WritingStatsPanel from './WritingStatsPanel'
import WritingCalendar from './WritingCalendar'
import PomodoroTimer from './PomodoroTimer'
import WritingReminder from './WritingReminder'

const { Title, Paragraph } = Typography

interface WritingTrackerProps {
  novelId: string
}

export default function WritingTracker({ novelId }: WritingTrackerProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <Title level={2}>写作目标追踪</Title>
        <Paragraph className="text-gray-600">
          在这里追踪您的写作进度，设置目标，管理时间，获得写作动力。
          系统会自动统计您的写作数据，帮助您保持写作习惯。
        </Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        {/* 写作统计面板 */}
        <Col xs={24} lg={12}>
          <WritingStatsPanel novelId={novelId} />
        </Col>

        {/* 写作提醒 */}
        <Col xs={24} lg={12}>
          <WritingReminder 
            novelId={novelId}
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
          <WritingCalendar novelId={novelId} />
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


