'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, Form, Input, Select, Button, Space, message, Tabs, Typography, List, Tag, Divider, Row, Col } from 'antd'
import { RobotOutlined, BulbOutlined, GlobalOutlined, HistoryOutlined, ThunderboltOutlined, SaveOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { TextArea } = Input
const { Text, Title } = Typography

interface AIWorldPanelProps {
  novelId: string
}

interface GenerationResult {
  id: string
  type: string
  title: string
  content: string
  tags: string[]
  created_at: string
}

export default function AIWorldPanel({ novelId }: AIWorldPanelProps) {
  const { token } = useAuthStore()
  const [form] = Form.useForm()
  const [results, setResults] = useState<GenerationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('setting')
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])

  useEffect(() => {
    loadResults()
  }, [novelId])

  const loadResults = async () => {
    try {
      // 这里应该调用API加载已生成的结果
      // 暂时使用模拟数据
      const mockResults: GenerationResult[] = [
        {
          id: '1',
          type: 'setting',
          title: '魔法体系设定',
          content: '这个世界存在元素魔法、召唤魔法、炼金术三大体系...',
          tags: ['魔法', '体系', '设定'],
          created_at: new Date().toISOString()
        }
      ]
      setResults(mockResults)
    } catch (error) {
      message.error('加载生成结果失败')
    }
  }

  const generateContent = async (type: string) => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      // 根据类型构建不同的提示词
      let promptTemplate = ''
      let promptType = ''

      switch (type) {
        case 'setting':
          promptTemplate = `基于以下要素生成世界观设定：
类型：${values.genre || '奇幻'}
风格：${values.style || '史诗'}
元素：${values.elements || '魔法、剑术'}
要求：${values.requirements || '详细且富有想象力'}

请生成包含以下内容的设定：
1. 世界背景
2. 核心规则
3. 特色元素
4. 文化特色`
          promptType = '世界观设定'
          break

        case 'location':
          promptTemplate = `基于以下要素生成地点描述：
地点类型：${values.locationType || '城市'}
地理位置：${values.geography || '平原'}
文化背景：${values.culture || '古代'}
特色要求：${values.features || '繁华、神秘'}

请生成包含以下内容的描述：
1. 地理特征
2. 建筑风格
3. 人文环境
4. 历史传说`
          promptType = '地点描述'
          break

        case 'history':
          promptTemplate = `基于以下要素生成历史事件：
时代背景：${values.era || '古代'}
事件类型：${values.eventType || '战争'}
影响范围：${values.scope || '全国'}
重要程度：${values.importance || '重大'}

请生成包含以下内容的历史：
1. 事件背景
2. 发展过程
3. 关键人物
4. 历史影响`
          promptType = '历史事件'
          break

        case 'culture':
          promptTemplate = `基于以下要素生成文化设定：
文化类型：${values.cultureType || '魔法文化'}
社会结构：${values.socialStructure || '等级制'}
信仰体系：${values.beliefSystem || '多神教'}
艺术特色：${values.artStyle || '古典'}

请生成包含以下内容的文化：
1. 社会制度
2. 信仰体系
3. 艺术文化
4. 风俗习惯`
          promptType = '文化设定'
          break

        default:
          promptTemplate = `基于以下要素生成内容：
类型：${values.genre || '奇幻'}
要求：${values.requirements || '详细且富有想象力'}`
          promptType = '通用生成'
      }

      // 调用AI API生成内容
      const res = await fetch('/api/ai/expand', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          novel_id: novelId,
          prompt_template: promptTemplate,
          input_summary: values.context || '',
          style: values.style || 'default',
          max_tokens: 800
        })
      })

      if (res.ok) {
        const result = await res.json()
        if (result.ok) {
          const newResult: GenerationResult = {
            id: `result_${Date.now()}`,
            type,
            title: `${promptType}-${new Date().toLocaleString()}`,
            content: result.data?.result_text || '',
            tags: values.tags || [],
            created_at: new Date().toISOString()
          }
          setResults(prev => [newResult, ...prev])
          message.success('内容生成成功')
          form.resetFields()
        } else {
          message.error(result.error?.msg || '生成失败')
        }
      } else {
        message.error('生成请求失败')
      }
    } catch (error) {
      message.error('生成失败')
    } finally {
      setLoading(false)
    }
  }

  const saveToOutline = async (result: GenerationResult) => {
    try {
      const path = `outlines/${result.title}.md`
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          novel_id: novelId,
          path,
          content: `# ${result.title}\n\n${result.content}`,
          timestamp: new Date().toISOString()
        })
      })
      if (res.ok) {
        message.success('已保存到大纲')
      } else {
        message.error('保存失败')
      }
    } catch (error) {
      message.error('保存失败')
    }
  }

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'setting': '世界观设定',
      'location': '地点描述',
      'history': '历史事件',
      'culture': '文化设定'
    }
    return typeMap[type] || type
  }

  const getTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      'setting': 'blue',
      'location': 'green',
      'history': 'orange',
      'culture': 'purple'
    }
    return colorMap[type] || 'default'
  }

  return (
    <Card title={<span><RobotOutlined className="mr-2" />AI 世界观生成</span>}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'setting',
            label: '世界观设定',
            children: (
              <Form form={form} layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="genre" label="世界类型">
                      <Select placeholder="选择世界类型">
                        <Select.Option value="奇幻">奇幻</Select.Option>
                        <Select.Option value="科幻">科幻</Select.Option>
                        <Select.Option value="现代">现代</Select.Option>
                        <Select.Option value="古代">古代</Select.Option>
                        <Select.Option value="末日">末日</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="style" label="风格特色">
                      <Select placeholder="选择风格">
                        <Select.Option value="史诗">史诗</Select.Option>
                        <Select.Option value="温馨">温馨</Select.Option>
                        <Select.Option value="黑暗">黑暗</Select.Option>
                        <Select.Option value="轻松">轻松</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.Item name="elements" label="核心元素">
                  <Input placeholder="如：魔法、剑术、科技、超能力等" />
                </Form.Item>
                
                <Form.Item name="requirements" label="特殊要求">
                  <TextArea rows={3} placeholder="描述你希望的世界观特色和要求" />
                </Form.Item>
                
                <Form.Item name="context" label="已有背景（可选）">
                  <TextArea rows={3} placeholder="已有的世界观设定或背景信息" />
                </Form.Item>
                
                <Form.Item name="tags" label="标签">
                  <Select mode="tags" placeholder="输入标签，回车确认" />
                </Form.Item>
                
                <Button 
                  type="primary" 
                  icon={<BulbOutlined />} 
                  onClick={() => generateContent('setting')}
                  loading={loading}
                  block
                >
                  生成世界观设定
                </Button>
              </Form>
            )
          },
          {
            key: 'location',
            label: '地点描述',
            children: (
              <Form form={form} layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="locationType" label="地点类型">
                      <Select placeholder="选择地点类型">
                        <Select.Option value="城市">城市</Select.Option>
                        <Select.Option value="村庄">村庄</Select.Option>
                        <Select.Option value="城堡">城堡</Select.Option>
                        <Select.Option value="神殿">神殿</Select.Option>
                        <Select.Option value="学院">学院</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="geography" label="地理环境">
                      <Select placeholder="选择地理环境">
                        <Select.Option value="平原">平原</Select.Option>
                        <Select.Option value="山地">山地</Select.Option>
                        <Select.Option value="海滨">海滨</Select.Option>
                        <Select.Option value="森林">森林</Select.Option>
                        <Select.Option value="沙漠">沙漠</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.Item name="culture" label="文化背景">
                  <Input placeholder="如：古代、现代、魔法、科技等" />
                </Form.Item>
                
                <Form.Item name="features" label="特色要求">
                  <TextArea rows={3} placeholder="描述你希望的地点特色" />
                </Form.Item>
                
                <Form.Item name="tags" label="标签">
                  <Select mode="tags" placeholder="输入标签，回车确认" />
                </Form.Item>
                
                <Button 
                  type="primary" 
                  icon={<GlobalOutlined />} 
                  onClick={() => generateContent('location')}
                  loading={loading}
                  block
                >
                  生成地点描述
                </Button>
              </Form>
            )
          },
          {
            key: 'history',
            label: '历史事件',
            children: (
              <Form form={form} layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="era" label="时代背景">
                      <Select placeholder="选择时代背景">
                        <Select.Option value="古代">古代</Select.Option>
                        <Select.Option value="中世纪">中世纪</Select.Option>
                        <Select.Option value="近代">近代</Select.Option>
                        <Select.Option value="现代">现代</Select.Option>
                        <Select.Option value="未来">未来</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="eventType" label="事件类型">
                      <Select placeholder="选择事件类型">
                        <Select.Option value="战争">战争</Select.Option>
                        <Select.Option value="政治">政治</Select.Option>
                        <Select.Option value="灾难">灾难</Select.Option>
                        <Select.Option value="发现">发现</Select.Option>
                        <Select.Option value="变革">变革</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="scope" label="影响范围">
                      <Select placeholder="选择影响范围">
                        <Select.Option value="局部">局部</Select.Option>
                        <Select.Option value="地区">地区</Select.Option>
                        <Select.Option value="全国">全国</Select.Option>
                        <Select.Option value="世界">世界</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="importance" label="重要程度">
                      <Select placeholder="选择重要程度">
                        <Select.Option value="轻微">轻微</Select.Option>
                        <Select.Option value="一般">一般</Select.Option>
                        <Select.Option value="重要">重要</Select.Option>
                        <Select.Option value="重大">重大</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.Item name="tags" label="标签">
                  <Select mode="tags" placeholder="输入标签，回车确认" />
                </Form.Item>
                
                <Button 
                  type="primary" 
                  icon={<HistoryOutlined />} 
                  onClick={() => generateContent('history')}
                  loading={loading}
                  block
                >
                  生成历史事件
                </Button>
              </Form>
            )
          },
          {
            key: 'culture',
            label: '文化设定',
            children: (
              <Form form={form} layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="cultureType" label="文化类型">
                      <Select placeholder="选择文化类型">
                        <Select.Option value="魔法文化">魔法文化</Select.Option>
                        <Select.Option value="科技文化">科技文化</Select.Option>
                        <Select.Option value="宗教文化">宗教文化</Select.Option>
                        <Select.Option value="商业文化">商业文化</Select.Option>
                        <Select.Option value="军事文化">军事文化</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="socialStructure" label="社会结构">
                      <Select placeholder="选择社会结构">
                        <Select.Option value="等级制">等级制</Select.Option>
                        <Select.Option value="民主制">民主制</Select.Option>
                        <Select.Option value="部落制">部落制</Select.Option>
                        <Select.Option value="联邦制">联邦制</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="beliefSystem" label="信仰体系">
                      <Select placeholder="选择信仰体系">
                        <Select.Option value="一神教">一神教</Select.Option>
                        <Select.Option value="多神教">多神教</Select.Option>
                        <Select.Option value="无神论">无神论</Select.Option>
                        <Select.Option value="自然崇拜">自然崇拜</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="artStyle" label="艺术风格">
                      <Select placeholder="选择艺术风格">
                        <Select.Option value="古典">古典</Select.Option>
                        <Select.Option value="现代">现代</Select.Option>
                        <Select.Option value="抽象">抽象</Select.Option>
                        <Select.Option value="民族">民族</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.Item name="tags" label="标签">
                  <Select mode="tags" placeholder="输入标签，回车确认" />
                </Form.Item>
                
                <Button 
                  type="primary" 
                  icon={<ThunderboltOutlined />} 
                  onClick={() => generateContent('culture')}
                  loading={loading}
                  block
                >
                  生成文化设定
                </Button>
              </Form>
            )
          },
          {
            key: 'results',
            label: '生成结果',
            children: (
              <div className="space-y-4">
                <Title level={5}>已生成的内容</Title>
                <List
                  dataSource={results}
                  renderItem={(result) => (
                    <List.Item
                      actions={[
                        <Button 
                          key="save" 
                          size="small" 
                          icon={<SaveOutlined />} 
                          onClick={() => saveToOutline(result)}
                        >
                          保存到大纲
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <div className="flex items-center gap-2">
                            {result.title}
                            <Tag color={getTypeColor(result.type)}>
                              {getTypeLabel(result.type)}
                            </Tag>
                          </div>
                        }
                        description={
                          <div>
                            <div className="text-gray-600 mb-2">
                              {result.content.length > 150 
                                ? `${result.content.substring(0, 150)}...` 
                                : result.content
                              }
                            </div>
                            <div className="flex items-center gap-2">
                              {result.tags.map(tag => (
                                <Tag key={tag} size="small">{tag}</Tag>
                              ))}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              生成时间: {new Date(result.created_at).toLocaleString()}
                            </div>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </div>
            )
          }
        ]}
      />
    </Card>
  )
}


