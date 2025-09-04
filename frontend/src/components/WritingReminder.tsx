'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, Typography, Button, Space, Badge, message, Modal, Form, InputNumber, Switch, TimePicker } from 'antd'
import { BellOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import dayjs, { Dayjs } from 'dayjs'

const { Text, Title } = Typography

interface ReminderSettings {
  daily_word_reminder: boolean
  daily_word_threshold: number
  time_reminder: boolean
  reminder_time: string
  weekly_goal_reminder: boolean
  monthly_goal_reminder: boolean
  sound_enabled: boolean
  notification_enabled: boolean
}

interface WritingReminderProps {
  novelId: string
  currentWords: number
  dailyGoal?: number
  weeklyGoal?: number
  monthlyGoal?: number
}

export default function WritingReminder({ 
  novelId, 
  currentWords, 
  dailyGoal = 0, 
  weeklyGoal = 0, 
  monthlyGoal = 0 
}: WritingReminderProps) {
  const { token } = useAuthStore()
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])
  const [settings, setSettings] = useState<ReminderSettings>({
    daily_word_reminder: true,
    daily_word_threshold: 1000,
    time_reminder: true,
    reminder_time: '20:00',
    weekly_goal_reminder: true,
    monthly_goal_reminder: true,
    sound_enabled: true,
    notification_enabled: true
  })
  const [isSettingsVisible, setIsSettingsVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reminders, setReminders] = useState<string[]>([])

  useEffect(() => {
    loadSettings()
    checkReminders()
  }, [novelId, currentWords, dailyGoal, weeklyGoal, monthlyGoal])

  const loadSettings = async () => {
    try {
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/reminders/settings`, { headers })
      if (res.ok) {
        const j = await res.json()
        if (j.ok) {
          setSettings(j.data?.settings || settings)
        }
      }
    } catch {
      // 使用默认设置
    }
  }

  const saveSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/reminders/settings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(settings)
      })
      if (res.ok) {
        message.success('提醒设置保存成功')
        setIsSettingsVisible(false)
      } else {
        message.error('保存失败')
      }
    } catch {
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  const checkReminders = () => {
    const newReminders: string[] = []
    
    // 检查日目标提醒
    if (settings.daily_word_reminder && dailyGoal > 0) {
      const progress = (currentWords / dailyGoal) * 100
      if (progress < 50) {
        newReminders.push(`今日进度: ${progress.toFixed(1)}%，距离日目标还有 ${dailyGoal - currentWords} 字`)
      } else if (progress < 80) {
        newReminders.push(`今日进度: ${progress.toFixed(1)}%，继续加油！`)
      } else if (progress >= 100) {
        newReminders.push(`🎉 恭喜完成今日目标！`)
      }
    }
    
    // 检查时间提醒
    if (settings.time_reminder) {
      const now = dayjs()
      const reminderTime = dayjs(settings.reminder_time, 'HH:mm')
      const timeDiff = now.diff(reminderTime, 'minute')
      
      if (timeDiff >= 0 && timeDiff < 60) {
        newReminders.push(`⏰ 现在是写作时间，开始今天的创作吧！`)
      }
    }
    
    // 检查周目标提醒
    if (settings.weekly_goal_reminder && weeklyGoal > 0) {
      // 这里需要从后端获取本周已写字数
      newReminders.push(`📅 本周目标: ${weeklyGoal} 字`)
    }
    
    // 检查月目标提醒
    if (settings.monthly_goal_reminder && monthlyGoal > 0) {
      // 这里需要从后端获取本月已写字数
      newReminders.push(`📅 本月目标: ${monthlyGoal} 字`)
    }
    
    setReminders(newReminders)
  }

  const dismissReminder = (index: number) => {
    setReminders(prev => prev.filter((_, i) => i !== index))
  }

  const getReminderIcon = (reminder: string) => {
    if (reminder.includes('🎉')) return <CheckCircleOutlined className="text-green-500" />
    if (reminder.includes('⏰')) return <ExclamationCircleOutlined className="text-orange-500" />
    if (reminder.includes('📅')) return <ExclamationCircleOutlined className="text-blue-500" />
    return <BellOutlined className="text-gray-500" />
  }

  const getReminderColor = (reminder: string) => {
    if (reminder.includes('🎉')) return 'success'
    if (reminder.includes('⏰')) return 'warning'
    if (reminder.includes('📅')) return 'processing'
    return 'default'
  }

  return (
    <Card 
      size="small" 
      title={<span><BellOutlined className="mr-2" />写作提醒</span>}
      extra={
        <Button 
          size="small" 
          icon={<BellOutlined />} 
          onClick={() => setIsSettingsVisible(true)}
        >
          设置
        </Button>
      }
    >
      {reminders.length > 0 ? (
        <div className="space-y-2">
          {reminders.map((reminder, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                {getReminderIcon(reminder)}
                <Text>{reminder}</Text>
              </div>
              <Button 
                size="small" 
                type="text" 
                onClick={() => dismissReminder(index)}
              >
                忽略
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-4">
          <BellOutlined className="text-2xl mb-2" />
          <div>暂无提醒</div>
        </div>
      )}

      {/* 设置对话框 */}
      <Modal
        title="提醒设置"
        open={isSettingsVisible}
        onOk={saveSettings}
        onCancel={() => setIsSettingsVisible(false)}
        okText="保存"
        cancelText="取消"
        confirmLoading={loading}
      >
        <Form layout="vertical">
          <Form.Item label="字数提醒">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Text>启用日目标字数提醒</Text>
                <Switch 
                  checked={settings.daily_word_reminder}
                  onChange={(checked) => setSettings(prev => ({ ...prev, daily_word_reminder: checked }))}
                />
              </div>
              {settings.daily_word_reminder && (
                <div>
                  <Text>提醒阈值 (字)</Text>
                  <InputNumber
                    min={100}
                    max={10000}
                    value={settings.daily_word_threshold}
                    onChange={(value) => setSettings(prev => ({ ...prev, daily_word_threshold: value || 1000 }))}
                    className="w-full mt-1"
                  />
                </div>
              )}
            </div>
          </Form.Item>

          <Form.Item label="时间提醒">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Text>启用时间提醒</Text>
                <Switch 
                  checked={settings.time_reminder}
                  onChange={(checked) => setSettings(prev => ({ ...prev, time_reminder: checked }))}
                />
              </div>
              {settings.time_reminder && (
                <div>
                  <Text>提醒时间</Text>
                  <TimePicker
                    value={dayjs(settings.reminder_time, 'HH:mm')}
                    onChange={(time) => setSettings(prev => ({ 
                      ...prev, 
                      reminder_time: time ? time.format('HH:mm') : '20:00' 
                    }))}
                    format="HH:mm"
                    className="w-full mt-1"
                  />
                </div>
              )}
            </div>
          </Form.Item>

          <Form.Item label="目标提醒">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Text>周目标提醒</Text>
                <Switch 
                  checked={settings.weekly_goal_reminder}
                  onChange={(checked) => setSettings(prev => ({ ...prev, weekly_goal_reminder: checked }))}
                />
              </div>
              <div className="flex justify-between items-center">
                <Text>月目标提醒</Text>
                <Switch 
                  checked={settings.monthly_goal_reminder}
                  onChange={(checked) => setSettings(prev => ({ ...prev, monthly_goal_reminder: checked }))}
                />
              </div>
            </div>
          </Form.Item>

          <Form.Item label="通知设置">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Text>声音提醒</Text>
                <Switch 
                  checked={settings.sound_enabled}
                  onChange={(checked) => setSettings(prev => ({ ...prev, sound_enabled: checked }))}
                />
              </div>
              <div className="flex justify-between items-center">
                <Text>浏览器通知</Text>
                <Switch 
                  checked={settings.notification_enabled}
                  onChange={(checked) => setSettings(prev => ({ ...prev, notification_enabled: checked }))}
                />
              </div>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
