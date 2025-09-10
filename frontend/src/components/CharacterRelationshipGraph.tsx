'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, Typography, Button, Space, Spin, App } from 'antd'
import { ShareAltOutlined, FullscreenOutlined, ReloadOutlined } from '@ant-design/icons'

const { Title } = Typography

interface Character {
  id: string
  name: string
  role_type?: string
  relationships: Array<{
    target: string
    relation: string
  }>
}

interface CharacterRelationshipGraphProps {
  characters: Character[]
  loading?: boolean
}

export default function CharacterRelationshipGraph({ characters, loading = false }: CharacterRelationshipGraphProps) {
  const { message } = App.useApp()
  const networkRef = useRef<HTMLDivElement>(null)
  const [network, setNetwork] = useState<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (!networkRef.current || loading || characters.length === 0) return

    const initNetwork = async () => {
      try {
        // 动态导入 vis-network
        const { Network } = await import('vis-network')
        const { DataSet } = await import('vis-data')

        // 准备节点数据
        const nodes = new DataSet(
          characters.map(char => ({
            id: char.id,
            label: char.name,
            title: `${char.name}${char.role_type ? ` (${char.role_type})` : ''}`,
            color: {
              background: getNodeColor(char.role_type),
              border: '#2b7ce9'
            },
            font: { size: 14, color: '#ffffff' },
            shape: 'circle',
            size: char.role_type?.includes('主角') ? 30 : 20
          }))
        )

        // 准备边数据
        const edgeData = characters.flatMap(char =>
          char.relationships.map((rel, index) => {
            const targetChar = characters.find(c => c.name === rel.target || c.id === rel.target)
            if (!targetChar) return null
            
            return {
              id: `${char.id}-${targetChar.id}-${index}`,
              from: char.id,
              to: targetChar.id,
              label: rel.relation,
              color: { color: '#848484' },
              font: { size: 12, color: '#333333', strokeWidth: 3, strokeColor: '#ffffff' },
              arrows: 'to',
              smooth: { enabled: true, type: 'continuous', roundness: 0.5 }
            }
          })
        ).filter((item): item is NonNullable<typeof item> => item !== null)
        
        const edges = new DataSet(edgeData)

        const data = { nodes, edges }

        const options = {
          layout: {
            improvedLayout: true,
            hierarchical: false
          },
          physics: {
            enabled: true,
            stabilization: { iterations: 100 },
            barnesHut: {
              gravitationalConstant: -2000,
              centralGravity: 0.3,
              springLength: 95,
              springConstant: 0.04,
              damping: 0.09
            }
          },
          interaction: {
            dragNodes: true,
            dragView: true,
            zoomView: true,
            selectConnectedEdges: true
          },
          nodes: {
            borderWidth: 2,
            shadow: true,
            font: { color: '#ffffff', size: 14 }
          },
          edges: {
            width: 2,
            shadow: true,
            smooth: {
              enabled: true,
              type: 'continuous',
              roundness: 0.5
            }
          }
        }

        if (!networkRef.current) return
        const networkInstance = new Network(networkRef.current, data, options)
        setNetwork(networkInstance)

        // 添加点击事件
        networkInstance.on('click', (params) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0]
            const character = characters.find(c => c.id === nodeId)
            if (character) {
              message.info(`选中角色: ${character.name}`)
            }
          }
        })

      } catch (error) {
        console.error('Failed to load vis-network:', error)
        message.error('加载关系图失败')
      }
    }

    initNetwork()

    return () => {
      if (network) {
        network.destroy()
      }
    }
  }, [characters, loading])

  const getNodeColor = (roleType?: string) => {
    if (!roleType) return '#97c2fc'
    
    if (roleType.includes('男主')) return '#ff6b6b'
    if (roleType.includes('女主')) return '#ff9ff3'
    if (roleType.includes('男二')) return '#ffa726'
    if (roleType.includes('女二')) return '#ffcc02'
    if (roleType.includes('配角')) return '#97c2fc'
    
    return '#c7c7c7'
  }

  const handleRefresh = () => {
    if (network) {
      network.fit()
      network.stabilize()
    }
  }

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      networkRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center items-center h-96">
          <Spin size="large" tip="加载角色关系图..." />
        </div>
      </Card>
    )
  }

  if (characters.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <ShareAltOutlined className="text-4xl text-gray-400 mb-4" />
          <div className="text-gray-500">暂无角色数据，无法生成关系图</div>
        </div>
      </Card>
    )
  }

  return (
    <Card
      title={
        <div className="flex items-center">
          <ShareAltOutlined className="mr-2" />
          <Title level={4} className="!mb-0">角色关系图</Title>
        </div>
      }
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            size="small"
          >
            重新布局
          </Button>
          <Button
            icon={<FullscreenOutlined />}
            onClick={handleFullscreen}
            size="small"
          >
            全屏查看
          </Button>
        </Space>
      }
    >
      <div className="mb-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
            <span>男主角</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-pink-400 mr-2"></div>
            <span>女主角</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-orange-400 mr-2"></div>
            <span>男二</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-yellow-400 mr-2"></div>
            <span>女二</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-blue-400 mr-2"></div>
            <span>配角</span>
          </div>
        </div>
      </div>
      
      <div
        ref={networkRef}
        style={{ width: '100%', height: '500px' }}
        className="border rounded bg-gray-50"
      />
      
      <div className="mt-4 text-sm text-gray-500">
        <div>💡 提示：</div>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>拖拽节点可以调整位置</li>
          <li>滚轮缩放，鼠标拖拽移动视图</li>
          <li>点击角色查看详细信息</li>
          <li>连线表示角色间的关系</li>
        </ul>
      </div>
    </Card>
  )
}
