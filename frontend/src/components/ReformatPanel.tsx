'use client'

import { useState, useMemo } from 'react'
import { Card, Button, Form, Switch, InputNumber, Space, Typography, message, Divider, Collapse } from 'antd'
import { FormatPainterOutlined, SettingOutlined, CheckOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { Text, Title } = Typography
const { Panel } = Collapse

interface ReformatSettings {
  indent: number
  preserve_empty_lines: boolean
  smart_spacing: boolean
  ellipsis_standardization: boolean
  line_break_standardization: boolean
}

interface ReformatPanelProps {
  getText: () => string
  onTextChange: (newText: string) => void
}

export default function ReformatPanel({ getText, onTextChange }: ReformatPanelProps) {
  const { token } = useAuthStore()
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [diffInfo, setDiffInfo] = useState<any>(null)
  const [showDiff, setShowDiff] = useState(false)

  const [settings, setSettings] = useState<ReformatSettings>({
    indent: 2,
    preserve_empty_lines: false,
    smart_spacing: true,
    ellipsis_standardization: true,
    line_break_standardization: true
  })

  const reformatText = async () => {
    try {
      const text = getText()
      if (!text.trim()) {
        message.info('请先输入要排版的文本')
        return
      }

      setLoading(true)
      const response = await fetch('/api/utils/reformat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text,
          settings
        })
      })

      const result = await response.json()
      if (response.ok && result.ok) {
        const { formatted_text, diff_info } = result.data
        
        if (diff_info.changed) {
          setDiffInfo(diff_info)
          setShowDiff(true)
          
          // 询问是否应用排版
          message.success(`排版完成！共修改 ${diff_info.changed_lines} 行`)
          
          // 自动应用排版
          onTextChange(formatted_text)
          setShowDiff(false)
          setDiffInfo(null)
        } else {
          message.info('文本无需排版')
        }
      } else {
        message.error(result.error?.msg || '排版失败')
      }
    } catch (error) {
      message.error('排版失败')
    } finally {
      setLoading(false)
    }
  }

  const quickReformat = async () => {
    // 使用默认设置快速排版
    const defaultSettings = {
      indent: 2,
      preserve_empty_lines: false,
      smart_spacing: true,
      ellipsis_standardization: true,
      line_break_standardization: true
    }
    
    try {
      const text = getText()
      if (!text.trim()) {
        message.info('请先输入要排版的文本')
        return
      }

      setLoading(true)
      const response = await fetch('/api/utils/reformat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text,
          settings: defaultSettings
        })
      })

      const result = await response.json()
      if (response.ok && result.ok) {
        const { formatted_text, diff_info } = result.data
        
        if (diff_info.changed) {
          message.success(`快速排版完成！共修改 ${diff_info.changed_lines} 行`)
          onTextChange(formatted_text)
        } else {
          message.info('文本无需排版')
        }
      } else {
        message.error(result.error?.msg || '排版失败')
      }
    } catch (error) {
      message.error('排版失败')
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = (key: keyof ReformatSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <Card size="small" title={<span><FormatPainterOutlined className="mr-2" />自动排版</span>}>
      <Space direction="vertical" className="w-full">
        <Button 
          type="primary" 
          icon={<FormatPainterOutlined />}
          onClick={reformatText}
          loading={loading}
          className="w-full"
        >
          智能排版
        </Button>
        
        <Button 
          icon={<CheckOutlined />}
          onClick={quickReformat}
          loading={loading}
          className="w-full"
        >
          快速排版
        </Button>
      </Space>

      <Divider />

      <Collapse 
        size="small" 
        ghost
        items={[
          {
            key: '1',
            label: <span><SettingOutlined className="mr-2" />排版设置</span>,
            children: (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Text>段落首行缩进</Text>
                  <InputNumber
                    min={0}
                    max={8}
                    value={settings.indent}
                    onChange={(value) => updateSettings('indent', value || 0)}
                    size="small"
                    style={{ width: 80 }}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <Text>保留空行</Text>
                  <Switch
                    checked={settings.preserve_empty_lines}
                    onChange={(checked) => updateSettings('preserve_empty_lines', checked)}
                    size="small"
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <Text>中英文间智能空格</Text>
                  <Switch
                    checked={settings.smart_spacing}
                    onChange={(checked) => updateSettings('smart_spacing', checked)}
                    size="small"
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <Text>省略号标准化</Text>
                  <Switch
                    checked={settings.ellipsis_standardization}
                    onChange={(checked) => updateSettings('ellipsis_standardization', checked)}
                    size="small"
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <Text>换行符标准化</Text>
                  <Switch
                    checked={settings.line_break_standardization}
                    onChange={(checked) => updateSettings('line_break_standardization', checked)}
                    size="small"
                  />
                </div>
              </div>
            )
          }
        ]}
      />

      {/* 排版说明 */}
      <div className="mt-3 text-xs text-gray-500">
        <div className="space-y-1">
          <div>• 智能排版：根据设置进行完整排版</div>
          <div>• 快速排版：使用推荐设置快速排版</div>
          <div>• 使用 &lt;!--preserve--&gt; 标记可保留特定空行</div>
        </div>
      </div>
    </Card>
  )
}
