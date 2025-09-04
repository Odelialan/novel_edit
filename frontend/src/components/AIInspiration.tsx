'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, Form, Input, Select, Button, Space, message, Typography, Tag } from 'antd'
import { BulbOutlined, SaveOutlined, PlusOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'

const { TextArea } = Input
const { Text, Title, Paragraph } = Typography

interface GeneratedInspiration {
  id: string
  title: string
  summary: string
  genre: string
  length: string
  heroine_role: string
  hero_role: string
  tags: string[]
  plot_outline: string
  world_building: string
  created_at: string
}

export default function AIInspiration() {
  const { token } = useAuthStore()
  const router = useRouter()
  const [form] = Form.useForm()
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentInspiration, setCurrentInspiration] = useState<GeneratedInspiration | null>(null)
  const headers = useMemo(() => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])

  const genreOptions = [
    { label: '古代言情', value: '古代言情' },
    { label: '现代言情', value: '现代言情' },
    { label: '悬疑', value: '悬疑' },
    { label: '脑洞', value: '脑洞' },
    { label: '职场', value: '职场' },
    { label: '校园', value: '校园' },
    { label: '仙侠', value: '仙侠' },
    { label: '穿越', value: '穿越' },
    { label: '恐怖', value: '恐怖' }
  ]

  const lengthOptions = [
    { label: '1w字以下超短篇', value: '1w字以下超短篇' },
    { label: '1w-5w字短篇', value: '1w-5w字短篇' },
    { label: '15w-20w字中篇', value: '15w-20w字中篇' },
    { label: '20w-50w字长篇', value: '20w-50w字长篇' },
    { label: '50w-100w字长篇', value: '50w-100w字长篇' }
  ]

  const heroineRoleOptions = [
    { label: '公主', value: '公主' },
    { label: '丞相千金', value: '丞相千金' },
    { label: '富家小姐', value: '富家小姐' },
    { label: '商馆老板', value: '商馆老板' },
    { label: '王爷的千金', value: '王爷的千金' },
    { label: '皇宫里的女官', value: '皇宫里的女官' },
    { label: '王爷的侍女', value: '王爷的侍女' }
  ]

  const heroRoleOptions = [
    { label: '皇帝', value: '皇帝' },
    { label: '将军', value: '将军' },
    { label: '摄政王', value: '摄政王' },
    { label: '王爷', value: '王爷' },
    { label: '首辅', value: '首辅' },
    { label: '丞相', value: '丞相' },
    { label: '商人', value: '商人' },
    { label: '锦衣卫', value: '锦衣卫' },
    { label: '有才干的小人物', value: '有才干的小人物' }
  ]

  const tagOptions = [
    { label: '穿越', value: '穿越' },
    { label: '先婚后爱', value: '先婚后爱' },
    { label: '破镜重圆', value: '破镜重圆' },
    { label: '正剧', value: '正剧' },
    { label: '爽文', value: '爽文' },
    { label: '魂穿', value: '魂穿' },
    { label: '身穿', value: '身穿' },
    { label: '性别互换', value: '性别互换' },
    { label: '虐恋情深', value: '虐恋情深' },
    { label: '欢喜冤家', value: '欢喜冤家' },
    { label: '师徒', value: '师徒' },
    { label: '黑莲花', value: '黑莲花' },
    { label: '救赎', value: '救赎' },
    { label: '甜文', value: '甜文' },
    { label: '情有独钟', value: '情有独钟' },
    { label: '穿越时空', value: '穿越时空' },
    { label: '穿书', value: '穿书' },
    { label: '成长', value: '成长' },
    { label: '天作之合', value: '天作之合' },
    { label: '豪门世家', value: '豪门世家' },
    { label: '强强', value: '强强' },
    { label: '天之骄子', value: '天之骄子' },
    { label: '系统', value: '系统' },
    { label: '都市', value: '都市' },
    { label: '种田文', value: '种田文' },
    { label: '宫廷侯爵', value: '宫廷侯爵' },
    { label: '重生', value: '重生' },
    { label: '日常', value: '日常' },
    { label: '娱乐圈', value: '娱乐圈' },
    { label: '年代文', value: '年代文' },
    { label: '升级流', value: '升级流' },
    { label: '快穿', value: '快穿' },
    { label: '仙侠修真', value: '仙侠修真' },
    { label: '灵异神怪', value: '灵异神怪' },
    { label: '无限流', value: '无限流' },
    { label: '业界精英', value: '业界精英' },
    { label: '逆袭', value: '逆袭' },
    { label: '万人迷', value: '万人迷' },
    { label: '幻想空间', value: '幻想空间' },
    { label: '星际', value: '星际' },
    { label: '直播', value: '直播' },
    { label: '校园', value: '校园' },
    { label: '综漫', value: '综漫' },
    { label: '励志', value: '励志' },
    { label: '沙雕', value: '沙雕' },
    { label: '美食', value: '美食' },
    { label: '追爱火葬场', value: '追爱火葬场' },
    { label: '团宠', value: '团宠' },
    { label: '打脸', value: '打脸' },
    { label: '末世', value: '末世' },
    { label: 'ABO', value: 'ABO' },
    { label: '咒回', value: '咒回' },
    { label: '年下', value: '年下' },
    { label: '基建', value: '基建' },
    { label: '治愈', value: '治愈' },
    { label: '现代架空', value: '现代架空' },
    { label: '生子', value: '生子' },
    { label: '异能', value: '异能' },
    { label: '群像', value: '群像' },
    { label: '柯南', value: '柯南' },
    { label: '朝堂', value: '朝堂' },
    { label: '青梅竹马', value: '青梅竹马' },
    { label: 'HE', value: 'HE' },
    { label: '悬疑推理', value: '悬疑推理' },
    { label: '文野', value: '文野' },
    { label: '萌宠', value: '萌宠' },
    { label: '未来架空', value: '未来架空' },
    { label: '高岭之花', value: '高岭之花' },
    { label: '美强惨', value: '美强惨' },
    { label: '婚恋', value: '婚恋' },
    { label: '女强', value: '女强' },
    { label: '马甲文', value: '马甲文' },
    { label: '女配', value: '女配' },
    { label: '相爱相杀', value: '相爱相杀' },
    { label: '少年漫', value: '少年漫' },
    { label: '暗恋', value: '暗恋' },
    { label: '萌娃', value: '萌娃' },
    { label: '历史衍生', value: '历史衍生' },
    { label: '因缘邂逅', value: '因缘邂逅' },
    { label: '英美衍生', value: '英美衍生' },
    { label: '轻松', value: '轻松' },
    { label: '体育竞技', value: '体育竞技' },
    { label: '单元文', value: '单元文' },
    { label: '钓系', value: '钓系' },
    { label: '游戏网游', value: '游戏网游' },
    { label: '市井生活', value: '市井生活' },
    { label: '综艺', value: '综艺' },
    { label: '玄学', value: '玄学' },
    { label: '布衣生活', value: '布衣生活' },
    { label: '宅斗', value: '宅斗' },
    { label: '超级英雄', value: '超级英雄' },
    { label: '魔幻', value: '魔幻' },
    { label: '复仇虐渣', value: '复仇虐渣' },
    { label: '花季雨季', value: '花季雨季' },
    { label: '迪化流', value: '迪化流' },
    { label: '克苏鲁', value: '克苏鲁' },
    { label: '爆笑', value: '爆笑' },
    { label: '西幻', value: '西幻' },
    { label: '废土', value: '废土' },
    { label: '近水楼台', value: '近水楼台' },
    { label: '东方玄幻', value: '东方玄幻' },
    { label: '日韩泰', value: '日韩泰' },
    { label: '西方罗曼', value: '西方罗曼' },
    { label: '日久生情', value: '日久生情' },
    { label: '姐弟恋', value: '姐弟恋' },
    { label: '清穿', value: '清穿' },
    { label: '赛博朋克', value: '赛博朋克' },
    { label: '惊悚', value: '惊悚' },
    { label: '经营', value: '经营' },
    { label: '科举', value: '科举' },
    { label: '随身空间', value: '随身空间' },
    { label: '白月光', value: '白月光' },
    { label: '炮灰', value: '炮灰' },
    { label: '脑洞', value: '脑洞' },
    { label: '机甲', value: '机甲' },
    { label: '虫族', value: '虫族' },
    { label: '全息', value: '全息' },
    { label: '古早', value: '古早' },
    { label: '异世大陆', value: '异世大陆' },
    { label: '江湖', value: '江湖' },
    { label: '对照组', value: '对照组' },
    { label: '创业', value: '创业' },
    { label: '电竞', value: '电竞' },
    { label: '阴差阳错', value: '阴差阳错' },
    { label: '宫斗', value: '宫斗' },
    { label: '失忆', value: '失忆' },
    { label: '平步青云', value: '平步青云' },
    { label: '剧透', value: '剧透' },
    { label: '网王', value: '网王' },
    { label: '读心术', value: '读心术' },
    { label: '论坛体', value: '论坛体' },
    { label: '开挂', value: '开挂' },
    { label: '神豪流', value: '神豪流' },
    { label: '囤货', value: '囤货' },
    { label: '港风', value: '港风' },
    { label: '排球少年', value: '排球少年' },
    { label: '天选之子', value: '天选之子' },
    { label: '恋爱合约', value: '恋爱合约' },
    { label: '灵魂转换', value: '灵魂转换' },
    { label: '前世今生', value: '前世今生' },
    { label: '反套路', value: '反套路' },
    { label: '女扮男装', value: '女扮男装' },
    { label: '足球', value: '足球' },
    { label: '第四天灾', value: '第四天灾' },
    { label: '腹黑', value: '腹黑' },
    { label: '家教', value: '家教' },
    { label: '忠犬', value: '忠犬' },
    { label: '时代奇缘', value: '时代奇缘' },
    { label: '火影', value: '火影' },
    { label: '龙傲天', value: '龙傲天' },
    { label: '热血', value: '热血' },
    { label: '职场', value: '职场' },
    { label: '哨向', value: '哨向' },
    { label: '异想天开', value: '异想天开' },
    { label: '都市异闻', value: '都市异闻' },
    { label: '史诗奇幻', value: '史诗奇幻' },
    { label: '乙女向', value: '乙女向' },
    { label: '科幻', value: '科幻' },
    { label: '御兽', value: '御兽' },
    { label: '规则怪谈', value: '规则怪谈' },
    { label: '民国', value: '民国' },
    { label: '学霸', value: '学霸' },
    { label: '转生', value: '转生' },
    { label: '乔装改扮', value: '乔装改扮' },
    { label: '虐文', value: '虐文' },
    { label: '商战', value: '商战' },
    { label: '古代幻想', value: '古代幻想' },
    { label: '猎人', value: '猎人' },
    { label: '制服情缘', value: '制服情缘' },
    { label: '神话传说', value: '神话传说' },
    { label: '海贼王', value: '海贼王' },
    { label: '武侠', value: '武侠' },
    { label: '三教九流', value: '三教九流' },
    { label: '权谋', value: '权谋' },
    { label: '预知', value: '预知' },
    { label: '异闻传说', value: '异闻传说' },
    { label: '红楼梦', value: '红楼梦' },
    { label: '原神', value: '原神' },
    { label: '高智商', value: '高智商' },
    { label: '吐槽役', value: '吐槽役' },
    { label: '荒野求生', value: '荒野求生' },
    { label: '星穹铁道', value: '星穹铁道' },
    { label: '抽奖抽卡', value: '抽奖抽卡' },
    { label: '古典名著', value: '古典名著' },
    { label: '古穿今', value: '古穿今' },
    { label: '边缘恋歌', value: '边缘恋歌' },
    { label: '黑篮', value: '黑篮' },
    { label: '总裁', value: '总裁' },
    { label: '宋穿', value: '宋穿' },
    { label: '时代新风', value: '时代新风' },
    { label: '明穿', value: '明穿' },
    { label: '西方名著', value: '西方名著' },
    { label: '吐槽', value: '吐槽' },
    { label: '唐穿', value: '唐穿' },
    { label: '男配', value: '男配' },
    { label: '大冒险', value: '大冒险' },
    { label: '现实', value: '现实' },
    { label: '召唤流', value: '召唤流' },
    { label: '烧脑', value: '烧脑' },
    { label: '御姐', value: '御姐' },
    { label: '位面', value: '位面' },
    { label: '真假千金', value: '真假千金' },
    { label: '卡牌', value: '卡牌' },
    { label: '傲娇', value: '傲娇' },
    { label: '网红', value: '网红' },
    { label: '鬼灭', value: '鬼灭' },
    { label: '模拟器', value: '模拟器' },
    { label: '签到流', value: '签到流' },
    { label: '纸片人', value: '纸片人' },
    { label: '交换人生', value: '交换人生' },
    { label: '七五', value: '七五' },
    { label: '刀剑乱舞', value: '刀剑乱舞' },
    { label: '吃货', value: '吃货' },
    { label: '女尊', value: '女尊' },
    { label: '替身', value: '替身' },
    { label: '时尚圈', value: '时尚圈' },
    { label: '燃', value: '燃' },
    { label: 'NPC', value: 'NPC' },
    { label: '秦穿', value: '秦穿' },
    { label: '萌', value: '萌' },
    { label: '汉穿', value: '汉穿' },
    { label: '灵气复苏', value: '灵气复苏' },
    { label: '极品亲戚', value: '极品亲戚' },
    { label: '少女漫', value: '少女漫' },
    { label: '三国穿越', value: '三国穿越' },
    { label: '非遗', value: '非遗' },
    { label: '性别转换', value: '性别转换' },
    { label: '奇谭', value: '奇谭' },
    { label: '多重人格', value: '多重人格' },
    { label: '盲盒', value: '盲盒' },
    { label: '公路文', value: '公路文' },
    { label: 'app', value: 'app' },
    { label: '群穿', value: '群穿' },
    { label: '田园', value: '田园' },
    { label: 'FGO', value: 'FGO' },
    { label: '洪荒', value: '洪荒' },
    { label: 'JOJO', value: 'JOJO' },
    { label: '读档流', value: '读档流' },
    { label: '开荒', value: '开荒' },
    { label: '犬夜叉', value: '犬夜叉' },
    { label: '中二', value: '中二' },
    { label: '齐神', value: '齐神' },
    { label: '中世纪', value: '中世纪' },
    { label: '毒舌', value: '毒舌' },
    { label: '冰山', value: '冰山' },
    { label: '赶山赶海', value: '赶山赶海' },
    { label: '魔法少女', value: '魔法少女' },
    { label: '聊斋', value: '聊斋' },
    { label: '暖男', value: '暖男' },
    { label: '亚人', value: '亚人' },
    { label: '锦鲤', value: '锦鲤' },
    { label: '银魂', value: '银魂' },
    { label: '血族', value: '血族' },
    { label: '骑士与剑', value: '骑士与剑' },
    { label: '美娱', value: '美娱' },
    { label: '亡灵异族', value: '亡灵异族' },
    { label: '天降', value: '天降' },
    { label: '封神', value: '封神' },
    { label: '死神', value: '死神' },
    { label: '七年之痒', value: '七年之痒' },
    { label: '蒸汽朋克', value: '蒸汽朋克' },
    { label: 'BE', value: 'BE' },
    { label: '曲艺', value: '曲艺' },
    { label: '红包群', value: '红包群' },
    { label: '原始社会', value: '原始社会' },
    { label: '恶役', value: '恶役' },
    { label: '对话体', value: '对话体' },
    { label: '悲剧', value: '悲剧' },
    { label: '扶贫', value: '扶贫' },
    { label: '网配', value: '网配' },
    { label: '港台', value: '港台' },
    { label: '婆媳', value: '婆媳' },
    { label: 'SD', value: 'SD' },
    { label: '圣斗士', value: '圣斗士' },
    { label: '绝区零', value: '绝区零' },
    { label: '真假少爷', value: '真假少爷' }
  ]

  useEffect(() => {
    // 可在此读取默认模板或用户上次输入
  }, [])

  const generate = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      
      const response = await fetch('/api/ai/inspiration', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          genre: values.genre,
          length: values.length,
          heroine_role: values.heroine_role || '',
          hero_role: values.hero_role || '',
          tags: values.tags || []
        })
      })

      const result = await response.json()
      if (response.ok && result.ok) {
        const aiResponse = result.data?.result_text || ''
        setResult(aiResponse)
        
        // 解析AI响应，提取关键信息
        const inspiration: GeneratedInspiration = {
          id: `insp_${Date.now()}`,
          title: extractTitle(aiResponse) || 'AI生成的故事',
          summary: extractSummary(aiResponse) || aiResponse,
          genre: values.genre,
          length: values.length,
          heroine_role: values.heroine_role,
          hero_role: values.hero_role,
          tags: values.tags || [],
          plot_outline: extractPlotOutline(aiResponse) || '基于AI生成内容',
          world_building: extractWorldBuilding(aiResponse) || '基于AI生成内容',
          created_at: new Date().toISOString()
        }
        
        setCurrentInspiration(inspiration)
        message.success('灵感生成成功！')
      } else {
        message.error(result.error?.msg || '生成失败')
      }
    } catch (error) {
      message.error('请检查输入内容')
    } finally {
      setLoading(false)
    }
  }

  // 辅助函数：从AI响应中提取标题
  const extractTitle = (text: string): string => {
    const titleMatch = text.match(/标题[：:]\s*(.+)/)
    if (titleMatch) return titleMatch[1].trim()
    
    const titleMatch2 = text.match(/《(.+?)》/)
    if (titleMatch2) return titleMatch2[1].trim()
    
    return 'AI生成的故事'
  }

  // 辅助函数：从AI响应中提取概要
  const extractSummary = (text: string): string => {
    const summaryMatch = text.match(/概要[：:]\s*(.+?)(?=\n|$)/)
    if (summaryMatch) return summaryMatch[1].trim()
    
    // 如果没有找到概要标记，返回前200个字符
    return text.length > 200 ? text.substring(0, 200) + '...' : text
  }

  // 辅助函数：从AI响应中提取剧情大纲
  const extractPlotOutline = (text: string): string => {
    const plotMatch = text.match(/剧情大纲[：:]\s*(.+?)(?=\n|$)/)
    if (plotMatch) return plotMatch[1].trim()
    
    const plotMatch2 = text.match(/大纲[：:]\s*(.+?)(?=\n|$)/)
    if (plotMatch2) return plotMatch2[1].trim()
    
    return '基于AI生成内容'
  }

  // 辅助函数：从AI响应中提取世界观设定
  const extractWorldBuilding = (text: string): string => {
    const worldMatch = text.match(/世界观[：:]\s*(.+?)(?=\n|$)/)
    if (worldMatch) return worldMatch[1].trim()
    
    const worldMatch2 = text.match(/设定[：:]\s*(.+?)(?=\n|$)/)
    if (worldMatch2) return worldMatch2[1].trim()
    
    return '基于AI生成内容'
  }

  const createNovelFromInspiration = async () => {
    if (!currentInspiration) {
      message.error('请先生成灵感')
      return
    }

    try {
      setLoading(true)
      
      // 创建小说
      const novelResponse = await fetch('/api/novels', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: currentInspiration.title,
          slug: currentInspiration.title.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          meta: {
            genre: currentInspiration.genre,
            themes: currentInspiration.tags,
            summary: currentInspiration.summary,
            inspiration_id: currentInspiration.id
          }
        })
      })

      const novelResult = await novelResponse.json()
      if (novelResponse.ok && novelResult.ok) {
        const novelId = novelResult.data?.novel_id || novelResult.data?.id
        
        // 创建世界观设定文件
        if (currentInspiration.world_building) {
          await fetch('/api/sync/push', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              novel_id: novelId,
              path: 'worldbuilding/世界观设定.md',
              content: `# ${currentInspiration.title} - 世界观设定\n\n${currentInspiration.world_building}`,
              timestamp: new Date().toISOString()
            })
          })
        }

        // 创建大纲文件
        if (currentInspiration.plot_outline) {
          await fetch('/api/sync/push', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              novel_id: novelId,
              path: 'outlines/故事大纲.md',
              content: `# ${currentInspiration.title} - 故事大纲\n\n${currentInspiration.plot_outline}`,
              timestamp: new Date().toISOString()
            })
          })
        }

        message.success('小说创建成功！')
        router.push(`/editor/${novelId}`)
      } else {
        message.error(novelResult.error?.msg || '创建小说失败')
      }
    } catch (error) {
      message.error('创建小说失败')
    } finally {
      setLoading(false)
    }
  }

  const saveToOutline = async () => {
    try {
      const values = await form.getFieldsValue()
      const title = `${values.genre || '灵感'}-${new Date().toISOString().slice(0,10)}`
      const path = `outlines/${title}.md`
      const res = await fetch('/api/sync/push', { method: 'POST', headers, body: JSON.stringify({ novel_id: values.novelId || 'MyNovel1', path, content: `# 主体故事灵感\n\n${result}`, timestamp: new Date().toISOString() }) })
      if (res.ok) message.success('已保存到大纲')
    } catch {}
  }

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <Title level={1}>
          <BulbOutlined className="mr-3 text-yellow-500" />
          AI 灵感发掘
        </Title>
        <Text className="text-lg text-gray-600">
          让AI帮你发掘创作灵感，生成独特的故事构思
        </Text>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 灵感生成表单 - 占据左侧2列 */}
        <div className="xl:col-span-2">
          <Card title={<span><BulbOutlined className="mr-2" />生成灵感</span>}>
            <Form form={form} layout="vertical" initialValues={{ 
              genre: '古代言情', 
              length: '1w-5w字短篇',
              heroine_role: '（自动生成）',
              hero_role: '（自动生成）'
            }}>
              {/* 第一行：故事类型和篇幅体量 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Form.Item label="故事类型" name="genre" rules={[{ required: true, message: '请选择类型' }]}>
                  <Select options={genreOptions} placeholder="选择故事类型" />
                </Form.Item>
                
                <Form.Item label="篇幅体量" name="length" rules={[{ required: true, message: '请选择篇幅' }]}>
                  <Select options={lengthOptions} placeholder="选择故事长度" />
                </Form.Item>
              </div>

              {/* 第二行：男女主角角色（可选） */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Form.Item label="女主角角色（可选）" name="heroine_role">
                  <Select 
                    options={heroineRoleOptions} 
                    placeholder="选择女主角角色（可选）" 
                    allowClear
                  />
                </Form.Item>

                <Form.Item label="男主角角色（可选）" name="hero_role">
                  <Select 
                    options={heroRoleOptions} 
                    placeholder="选择男主角角色（可选）" 
                    allowClear
                  />
                </Form.Item>
              </div>

              {/* 第三行：标签和偏好说明 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Form.Item label="标签（可多选）" name="tags">
                  <Select
                    mode="multiple"
                    options={tagOptions}
                    placeholder="选择核心主题标签"
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                <Form.Item label="偏好/说明（可选）" name="preference">
                  <TextArea rows={3} placeholder="例如：强张力、反转、成长线清晰等" />
                </Form.Item>
              </div>

              {/* 第四行：小说ID */}
              <div className="mb-4">
                <Form.Item label="小说ID（可选，保存到该小说大纲）" name="novelId">
                  <Input placeholder="输入小说ID（slug），用于保存灵感到其大纲" />
                </Form.Item>
              </div>
              
              {/* 按钮行 */}
              <div className="flex flex-wrap gap-3">
                <Button type="primary" onClick={generate} loading={loading} icon={<BulbOutlined />} size="large">
                  生成灵感
                </Button>
                <Button icon={<SaveOutlined />} onClick={saveToOutline} disabled={!result} size="large">
                  保存到大纲
                </Button>
                {currentInspiration && (
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={createNovelFromInspiration}
                    loading={loading}
                    size="large"
                  >
                    创建小说
                  </Button>
                )}
              </div>
            </Form>
          </Card>
        </div>

        {/* 当前灵感展示 - 占据右侧1列 */}
        <div className="xl:col-span-1">
          {currentInspiration ? (
            <Card title={<span><BulbOutlined className="mr-2" />当前灵感</span>} className="h-fit">
              <div className="space-y-4">
                <div>
                  <Title level={4}>{currentInspiration.title}</Title>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Tag color="blue">{currentInspiration.genre}</Tag>
                    {currentInspiration.tags.slice(0, 3).map((tag, index) => (
                      <Tag key={index} color="green">{tag}</Tag>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Text strong>故事概要：</Text>
                  <Paragraph className="mt-2 text-sm" ellipsis={{ rows: 3 }}>
                    {currentInspiration.summary}
                  </Paragraph>
                </div>
                
                <div>
                  <Text strong>篇幅体量：</Text>
                  <Paragraph className="mt-2 text-sm">{currentInspiration.length}</Paragraph>
                </div>
                
                <div>
                  <Text strong>女主角身份：</Text>
                  <Paragraph className="mt-2 text-sm">{currentInspiration.heroine_role}</Paragraph>
                </div>
                
                <div>
                  <Text strong>男主角身份：</Text>
                  <Paragraph className="mt-2 text-sm">{currentInspiration.hero_role}</Paragraph>
                </div>
                
                <div>
                  <Text strong>剧情大纲：</Text>
                  <Paragraph className="mt-2 text-sm" ellipsis={{ rows: 2 }}>
                    {currentInspiration.plot_outline}
                  </Paragraph>
                </div>
                
                <div>
                  <Text strong>世界观设定：</Text>
                  <Paragraph className="mt-2 text-sm" ellipsis={{ rows: 2 }}>
                    {currentInspiration.world_building}
                  </Paragraph>
                </div>
              </div>
            </Card>
          ) : (
            <Card title={<span><BulbOutlined className="mr-2" />灵感预览</span>} className="h-fit">
              <div className="text-center text-gray-500 py-8">
                <BulbOutlined className="text-4xl mb-4 block" />
                <Text>填写左侧表单并生成灵感后，</Text>
                <br />
                <Text>将在此显示灵感详情</Text>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* 生成结果显示 - 占据全宽 */}
      <Card title="生成结果">
        <TextArea 
          rows={8} 
          value={result} 
          readOnly 
          placeholder="生成结果将显示在此" 
          className="text-sm"
        />
      </Card>
    </div>
  )
}


