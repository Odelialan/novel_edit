import { Inter } from 'next/font/google'
import { ConfigProvider, App } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: '小说写作云端平台',
  description: '支持多设备同步和AI辅助的小说写作平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <ConfigProvider
          locale={zhCN}
          theme={{
            token: {
              colorPrimary: '#1890ff',
              borderRadius: 6,
            },
          }}
        >
          <App>
            {children}
          </App>
        </ConfigProvider>
      </body>
    </html>
  )
} 