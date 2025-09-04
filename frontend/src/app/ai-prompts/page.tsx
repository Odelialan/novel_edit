'use client'

import { useState } from 'react'
import { Card, Tabs, Button, Space, message, Typography, Divider } from 'antd'
import { PlusOutlined, SettingOutlined, BookOutlined } from '@ant-design/icons'
import AIPromptManager from '@/components/AIPromptManager'

const { Title, Paragraph } = Typography
const { TabPane } = Tabs

export default function AIPromptsPage() {
  const [activeTab, setActiveTab] = useState('global')

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>
          <SettingOutlined className="mr-2" />
          AI提示词模板管理
        </Title>
        <Paragraph>
          在这里管理所有AI功能的提示词模板，包括全局模板和小说级模板。
          全局模板对所有小说生效，小说级模板仅对特定小说生效。
        </Paragraph>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane 
          tab={
            <span>
              <BookOutlined />
              全局提示词模板
            </span>
          } 
          key="global"
        >
          <Card>
            <div className="mb-4">
              <Title level={4}>全局提示词模板</Title>
              <Paragraph>
                全局提示词模板对所有小说生效，建议在这里设置通用的、标准化的提示词。
                修改后会影响所有使用该模板的小说。
              </Paragraph>
            </div>
            <AIPromptManager />
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <BookOutlined />
              小说级提示词模板
            </span>
          } 
          key="novel"
        >
          <Card>
            <div className="mb-4">
              <Title level={4}>小说级提示词模板</Title>
              <Paragraph>
                小说级提示词模板仅对特定小说生效，可以针对特定小说的风格和需求进行定制。
                如果没有设置小说级模板，系统会自动使用全局模板。
              </Paragraph>
              <Divider />
              <Paragraph>
                <strong>使用方法：</strong>
                <br />
                1. 在小说编辑页面中，可以设置该小说的专属提示词模板
                <br />
                2. 小说级模板会覆盖全局模板的相同配置
                <br />
                3. 建议在全局模板中设置基础配置，在小说级模板中进行个性化调整
              </Paragraph>
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  )
}
