'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, Button, Progress, Typography, Space, InputNumber, Switch, App } from 'antd'
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

interface PomodoroSettings {
  workDuration: number  // 工作时间（分钟）
  shortBreakDuration: number  // 短休息时间（分钟）
  longBreakDuration: number  // 长休息时间（分钟）
  longBreakInterval: number  // 长休息间隔（番茄钟数）
  autoStartBreaks: boolean  // 自动开始休息
  autoStartPomodoros: boolean  // 自动开始下一个番茄钟
  soundEnabled: boolean  // 声音提醒
}

interface PomodoroTimerProps {
  onSessionComplete?: (sessionType: 'work' | 'break', duration: number) => void
}

export default function PomodoroTimer({ onSessionComplete }: PomodoroTimerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [timeLeft, setTimeLeft] = useState(25 * 60) // 25分钟默认
  const [sessionType, setSessionType] = useState<'work' | 'shortBreak' | 'longBreak'>('work')
  const [completedPomodoros, setCompletedPomodoros] = useState(0)
  const [isSettingsVisible, setIsSettingsVisible] = useState(false)
  const { message } = App.useApp()
  
  const [settings, setSettings] = useState<PomodoroSettings>({
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    autoStartBreaks: true,
    autoStartPomodoros: false,
    soundEnabled: true
  })
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // 初始化时间
    setTimeLeft(settings.workDuration * 60)
    
    // 创建音频元素
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/notification.mp3') // 需要添加音频文件
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // 时间到
            handleSessionComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRunning, isPaused])

  const handleSessionComplete = () => {
    setIsRunning(false)
    setIsPaused(false)
    
    // 播放提示音
    if (settings.soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
    
    // 显示通知
    if (sessionType === 'work') {
      message.success(`工作时间结束！休息一下吧！`)
      setCompletedPomodoros(prev => prev + 1)
      
      // 自动开始休息
      if (settings.autoStartBreaks) {
        const shouldLongBreak = (completedPomodoros + 1) % settings.longBreakInterval === 0
        const breakType = shouldLongBreak ? 'longBreak' : 'shortBreak'
        const breakDuration = shouldLongBreak ? settings.longBreakDuration : settings.shortBreakDuration
        
        setSessionType(breakType)
        setTimeLeft(breakDuration * 60)
        
        setTimeout(() => {
          setIsRunning(true)
        }, 1000)
      }
    } else {
      message.success(`休息结束！开始工作吧！`)
      
      // 自动开始下一个番茄钟
      if (settings.autoStartPomodoros) {
        setSessionType('work')
        setTimeLeft(settings.workDuration * 60)
        
        setTimeout(() => {
          setIsRunning(true)
        }, 1000)
      }
    }
    
    // 回调通知
    onSessionComplete?.(
      sessionType === 'work' ? 'work' : 'break', 
      sessionType === 'work' ? settings.workDuration : 
      sessionType === 'shortBreak' ? settings.shortBreakDuration : 
      settings.longBreakDuration
    )
  }

  const startTimer = () => {
    setIsRunning(true)
    setIsPaused(false)
  }

  const pauseTimer = () => {
    setIsPaused(true)
  }

  const resumeTimer = () => {
    setIsPaused(false)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setIsPaused(false)
    setTimeLeft(settings.workDuration * 60)
    setSessionType('work')
  }

  const skipSession = () => {
    handleSessionComplete()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getProgressPercent = () => {
    const totalTime = sessionType === 'work' ? settings.workDuration * 60 :
                     sessionType === 'shortBreak' ? settings.shortBreakDuration * 60 :
                     settings.longBreakDuration * 60
    return ((totalTime - timeLeft) / totalTime) * 100
  }

  const getSessionTitle = () => {
    switch (sessionType) {
      case 'work': return '专注写作'
      case 'shortBreak': return '短休息'
      case 'longBreak': return '长休息'
      default: return '专注写作'
    }
  }

  const getSessionColor = () => {
    switch (sessionType) {
      case 'work': return '#1677ff'
      case 'shortBreak': return '#52c41a'
      case 'longBreak': return '#722ed1'
      default: return '#1677ff'
    }
  }

  return (
    <Card 
      size="small" 
      title={<span><SettingOutlined className="mr-2" />番茄钟</span>}
      extra={
        <Button 
          size="small" 
          icon={<SettingOutlined />} 
          onClick={() => setIsSettingsVisible(!isSettingsVisible)}
        >
          设置
        </Button>
      }
    >
      <div className="text-center mb-4">
        <Title level={2} style={{ color: getSessionColor() }}>
          {getSessionTitle()}
        </Title>
        <Title level={1} style={{ color: getSessionColor() }}>
          {formatTime(timeLeft)}
        </Title>
        
        <Progress 
          percent={getProgressPercent()} 
          strokeColor={getSessionColor()}
          size="small"
          className="mb-4"
        />
        
        <Space>
          {!isRunning ? (
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />} 
              onClick={startTimer}
              size="large"
            >
              开始
            </Button>
          ) : isPaused ? (
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />} 
              onClick={resumeTimer}
              size="large"
            >
              继续
            </Button>
          ) : (
            <Button 
              icon={<PauseCircleOutlined />} 
              onClick={pauseTimer}
              size="large"
            >
              暂停
            </Button>
          )}
          
          <Button 
            icon={<ReloadOutlined />} 
            onClick={resetTimer}
            size="large"
          >
            重置
          </Button>
          
          {isRunning && (
            <Button onClick={skipSession} size="large">
              跳过
            </Button>
          )}
        </Space>
      </div>
      
      <div className="text-center text-sm text-gray-500">
        已完成番茄钟: {completedPomodoros} 个
      </div>
      
      {/* 设置面板 */}
      {isSettingsVisible && (
        <div className="mt-4 p-3 border rounded bg-gray-50">
          <Title level={5}>番茄钟设置</Title>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Text>工作时间 (分钟)</Text>
              <InputNumber
                min={1}
                max={120}
                value={settings.workDuration}
                onChange={(value) => setSettings(prev => ({ ...prev, workDuration: value || 25 }))}
                className="w-full mt-1"
              />
            </div>
            <div>
              <Text>短休息 (分钟)</Text>
              <InputNumber
                min={1}
                max={30}
                value={settings.shortBreakDuration}
                onChange={(value) => setSettings(prev => ({ ...prev, shortBreakDuration: value || 5 }))}
                className="w-full mt-1"
              />
            </div>
            <div>
              <Text>长休息 (分钟)</Text>
              <InputNumber
                min={1}
                max={60}
                value={settings.longBreakDuration}
                onChange={(value) => setSettings(prev => ({ ...prev, longBreakDuration: value || 15 }))}
                className="w-full mt-1"
              />
            </div>
            <div>
              <Text>长休息间隔</Text>
              <InputNumber
                min={1}
                max={10}
                value={settings.longBreakInterval}
                onChange={(value) => setSettings(prev => ({ ...prev, longBreakInterval: value || 4 }))}
                className="w-full mt-1"
              />
            </div>
          </div>
          
          <div className="mt-3 space-y-2">
            <div className="flex justify-between items-center">
              <Text>自动开始休息</Text>
              <Switch 
                checked={settings.autoStartBreaks}
                onChange={(checked) => setSettings(prev => ({ ...prev, autoStartBreaks: checked }))}
              />
            </div>
            <div className="flex justify-between items-center">
              <Text>自动开始下一个番茄钟</Text>
              <Switch 
                checked={settings.autoStartPomodoros}
                onChange={(checked) => setSettings(prev => ({ ...prev, autoStartPomodoros: checked }))}
              />
            </div>
            <div className="flex justify-between items-center">
              <Text>声音提醒</Text>
              <Switch 
                checked={settings.soundEnabled}
                onChange={(checked) => setSettings(prev => ({ ...prev, soundEnabled: checked }))}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
