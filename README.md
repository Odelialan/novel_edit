# Novel Edit - 智能小说写作云端平台

一个面向小说作者的多端写作平台，支持AI辅助创作、角色管理、版本控制和远程同步。

## 📋 版本信息

- **当前版本**: v1.0.0
- **发布日期**: 2025年9月4日
- **系统作者**: OdeliaLan
- **Git仓库**: https://github.com/Odelialan/novel_edit.git
- **版本状态**: 初始版本，功能完整

### 🎉 版本1.0.0 主要特性

#### 核心功能
- ✅ **完整的小说写作平台**: 支持多小说项目管理
- ✅ **专业编辑器**: 基于Monaco Editor，支持大文件流畅编辑
- ✅ **AI辅助写作**: 集成多种AI模型，支持扩写、润色、总结
- ✅ **角色管理系统**: 完整的角色档案系统，支持关系管理
- ✅ **版本控制**: 自动保存和版本快照，支持历史回滚
- ✅ **多端同步**: 支持iPad、iPhone、电脑等多设备访问

#### 技术架构
- ✅ **前端**: Next.js 14 + React 18 + TypeScript + Tailwind CSS + Ant Design 5
- ✅ **后端**: FastAPI + Python 3.10+ + Uvicorn + Pydantic v2
- ✅ **AI集成**: Provider Adapter模式，支持OpenAI、本地LLM等
- ✅ **部署**: Docker + docker-compose，支持本地开发模式

#### 安全特性
- ✅ **JWT认证**: 完整的用户认证和授权系统
- ✅ **敏感信息保护**: 密钥和用户信息安全存储
- ✅ **访问控制**: 支持局域网和公网访问控制
- ✅ **数据安全**: 本地存储，支持定期备份

#### 开发工具
- ✅ **PowerShell启动脚本**: 一键启动和配置
- ✅ **Docker支持**: 容器化部署，环境一致性
- ✅ **环境配置**: 完整的.env配置系统
- ✅ **日志系统**: 完整的日志记录和监控

#### 项目结构
- ✅ **模块化设计**: 前后端分离，组件化开发
- ✅ **配置管理**: 统一的配置管理系统
- ✅ **API设计**: RESTful API设计，完整的文档
- ✅ **错误处理**: 完善的错误处理和用户反馈

### 🔧 版本1.0.0 技术细节

#### 后端技术栈
- **框架**: FastAPI 0.104+
- **Python版本**: 3.10+
- **数据库**: SQLite (可扩展至PostgreSQL/MySQL)
- **认证**: JWT + bcrypt
- **AI集成**: 支持OpenAI API和本地LLM
- **文件存储**: 基于文件系统的存储方案

#### 前端技术栈
- **框架**: Next.js 14
- **UI库**: Ant Design 5 + Tailwind CSS
- **编辑器**: Monaco Editor
- **状态管理**: React Context + useReducer
- **类型安全**: TypeScript 5+

#### 部署方案
- **开发环境**: 本地开发模式，支持热重载
- **生产环境**: Docker容器化部署
- **远程访问**: ngrok隧道支持
- **数据持久化**: 本地文件存储 + 版本控制

### 📊 版本1.0.0 文件结构

```
novel_edit/
├── backend/                 # FastAPI后端服务
│   ├── app/                # 应用核心代码
│   │   ├── api/           # API路由层
│   │   ├── services/      # 业务逻辑层
│   │   ├── models/        # 数据模型层
│   │   └── utils/         # 工具函数
│   ├── secrets/           # 敏感信息存储
│   ├── logs/              # 日志文件
│   └── requirements.txt   # Python依赖
├── frontend/               # Next.js前端应用
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── app/          # 页面路由
│   │   ├── store/        # 状态管理
│   │   └── lib/          # 工具库
│   └── package.json      # Node.js依赖
├── novel_repo/            # 小说内容存储
│   ├── ai_prompts/       # AI提示词模板
│   └── [小说项目]/       # 各小说项目目录
├── scripts/               # 启动和管理脚本
├── docker-compose.yml     # Docker编排配置
├── start.ps1             # PowerShell启动脚本
└── .gitignore            # Git忽略文件配置
```

### 🚀 版本1.0.0 快速开始

1. **环境准备**
   - Python 3.10+
   - Node.js 18+
   - Docker (可选)

2. **克隆项目**
   ```bash
   git clone https://github.com/Odelialan/novel_edit.git
   cd novel_edit
   ```

3. **配置环境**
   ```bash
   # 复制环境变量模板
   cp env.example .env
   # 编辑 .env 文件配置必要参数
   ```

4. **启动服务**
   ```powershell
   # Windows PowerShell (推荐)
   .\start.ps1
   
   # 或使用Docker
   docker-compose up -d
   ```

5. **访问系统**
   - 前端: http://localhost:3000
   - 后端API: http://localhost:8000
   - API文档: http://localhost:8000/docs

### 📝 版本1.0.0 修改总结

#### 2025年9月4日 - 版本1.0.0 发布
- **初始版本发布**: 完整的小说写作平台系统
- **核心功能实现**: 小说管理、章节编辑、AI辅助、角色管理
- **技术架构确立**: FastAPI + Next.js + TypeScript 技术栈
- **安全机制完善**: JWT认证、敏感信息保护、访问控制
- **部署方案优化**: Docker容器化、PowerShell启动脚本
- **文档体系建立**: 完整的README和使用指南

#### 主要技术成就
- ✅ 前后端分离架构设计
- ✅ 基于Monaco Editor的专业写作环境
- ✅ Provider Adapter模式的AI集成
- ✅ 完整的用户认证和授权系统
- ✅ 本地文件存储和版本控制
- ✅ Docker容器化部署方案
- ✅ PowerShell自动化启动脚本

#### 安全特性
- ✅ 敏感信息完全本地化存储
- ✅ JWT令牌认证机制
- ✅ 环境变量配置管理
- ✅ 完善的.gitignore配置

### 🔮 后续版本规划

- **v1.1.0**: 增强AI功能，支持更多AI模型
- **v1.2.0**: 添加协作功能，支持多人协作写作
- **v1.3.0**: 移动端优化，提升移动设备体验
- **v2.0.0**: 云端同步，支持多设备数据同步

## ✨ 主要特性

- 📝 **专业编辑器**: 基于Monaco Editor，支持大文件流畅编辑
- 🤖 **AI辅助写作**: 集成多种AI模型，支持扩写、润色、总结
- 👥 **角色管理**: 完整的角色档案系统，支持关系管理
- 📚 **小说管理**: 多小说项目管理，支持大纲和章节组织
- 🔄 **版本控制**: 自动保存和版本快照，支持历史回滚
- 🌐 **多端同步**: 支持iPad、iPhone、电脑等多设备访问
- 🚀 **远程访问**: 支持ngrok隧道，实现公网访问
- 💾 **本地存储**: 以.txt文件为核心，支持家庭存储同步

## 🏗️ 技术架构

- **前端**: Next.js 14 + React 18 + TypeScript + Tailwind CSS + Ant Design 5
- **后端**: FastAPI + Python 3.10+ + Uvicorn + Pydantic v2
- **编辑器**: Monaco Editor (支持大文件编辑)
- **AI集成**: Provider Adapter模式，支持OpenAI、本地LLM等
- **部署**: Docker + docker-compose，支持本地开发模式

## 📋 系统要求

- **操作系统**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **Python**: 3.10+
- **Node.js**: 18+
- **内存**: 4GB+ (推荐8GB+)
- **存储**: 2GB+ 可用空间

## 🚀 快速开始

### 方法一：PowerShell一键启动 (推荐Windows用户)

1. **克隆项目**
   ```powershell
   git clone <repository-url>
   cd novel_edit
   ```

2. **配置环境变量**
   ```powershell
   # 复制环境变量模板
   Copy-Item env.example .env
   
   # 编辑 .env 文件，配置必要的参数
   # 特别是 NGROK_AUTHTOKEN (如果需要远程访问)
   notepad .env
   ```

3. **运行PowerShell启动脚本**
   ```powershell
   # 使用Docker模式启动 (默认)
   .\start.ps1
   
   # 使用本地开发模式启动
   .\start.ps1 -Local
   
   # 显示帮助信息
   .\start.ps1 -Help
   ```

4. **访问系统**
   - 前端界面: http://localhost:3000
   - 后端API: http://localhost:8000
   - API文档: http://localhost:8000/docs

### 方法二：Docker部署

1. **确保Docker已安装并运行**

2. **启动服务**
   ```bash
   docker-compose up -d
   ```

3. **查看服务状态**
   ```bash
   docker-compose ps
   ```

4. **查看日志**
   ```bash
   docker-compose logs -f
   ```

### 方法三：本地开发模式

1. **后端设置**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Linux/macOS
   # 或
   venv\Scripts\activate     # Windows
   
   pip install -r requirements.txt
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **前端设置**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 🔧 配置说明

### 环境变量配置

主要配置项说明：

```bash
# AI配置
AI_PROVIDER=mock                    # AI提供者: mock/openai/local
OPENAI_API_KEY=your-api-key        # OpenAI API密钥

# 隧道配置
NGROK_AUTHTOKEN=your-token         # ngrok认证令牌
TUNNEL_TYPE=none                   # 隧道类型: none/ngrok/tailscale

# 安全配置
SECRET_KEY=your-secret-key         # JWT签名密钥
ACCESS_TOKEN_EXPIRE_MINUTES=10080  # 令牌过期时间(7天)
```

### ngrok远程访问配置

1. **获取ngrok令牌**
   - 访问 [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)
   - 注册账号并获取authtoken

2. **配置令牌**
   ```bash
   # 在 .env 文件中设置
   NGROK_AUTHTOKEN=your-ngrok-token
   ```

3. **启动隧道**
   ```powershell
   # PowerShell (推荐)
   .\scripts\start-ngrok.ps1
   ```

4. **获取公网地址**
   - 查看ngrok窗口输出的公网地址
   - 格式: `https://xxxxx.ngrok.io`

## 📖 使用指南

### 首次使用

1. **系统初始化**
   - 访问 http://localhost:3000
   - 点击"登录"按钮
   - 在初始化页面设置管理员密码和邮箱

2. **创建小说**
   - 登录后点击"创建新小说"
   - 填写小说标题、类型、简介等信息
   - 系统会自动创建小说目录结构

3. **开始写作**
   - 选择小说进入编辑模式
   - 创建章节并开始写作
   - 使用AI辅助功能提升创作效率

### 核心功能

#### 小说管理
- 创建、编辑、删除小说项目
- 设置小说类型、简介、作者等信息
- 支持多小说并行管理

#### 章节编辑
- 基于Monaco Editor的专业写作环境
- 支持Markdown语法
- 自动保存和版本管理
- 实时字数统计

#### AI辅助
- **扩写**: 根据已有内容进行创意扩写
- **润色**: 优化语言表达和文字质量
- **总结**: 生成内容摘要和要点

#### 角色管理
- 创建角色档案，记录姓名、性格、外貌等
- 管理角色间的关系网络
- 支持角色别名和备注

#### 版本控制
- 每次保存自动创建版本快照
- 支持历史版本查看和比较
- 可回滚到任意历史版本

## 🔒 安全说明

### 访问控制
- 默认仅支持局域网访问
- 公网访问需要手动启动ngrok隧道
- JWT认证保护所有API接口

### 数据安全
- 所有数据存储在本地`novel_repo`目录
- 支持定期备份和导出
- 敏感信息存储在`secrets`目录

### 生产环境建议
- 修改默认密钥和密码
- 使用HTTPS协议
- 配置防火墙规则
- 定期更新依赖包

## 🧪 测试

### 运行测试
```bash
# 后端测试
cd backend
python -m pytest

# 前端测试
cd frontend
npm test
```

### 集成测试
```bash
# 使用Docker Compose运行集成测试
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## 📁 项目结构

```
novel_edit/
├── backend/                 # FastAPI后端
│   ├── app/
│   │   ├── api/            # API路由
│   │   ├── services/       # 业务逻辑
│   │   ├── models/         # 数据模型
│   │   └── config.py       # 配置管理
│   ├── requirements.txt    # Python依赖
│   └── Dockerfile         # 后端容器化
├── frontend/               # Next.js前端
│   ├── src/
│   │   ├── components/     # React组件
│   │   ├── app/           # 页面路由
│   │   └── store/         # 状态管理
│   ├── package.json       # Node.js依赖
│   └── Dockerfile         # 前端容器化
├── novel_repo/            # 小说存储目录
├── novel_repo_sample/     # 示例数据
├── scripts/               # 启动和管理脚本
│   ├── start-ngrok.ps1   # ngrok隧道启动脚本
│   └── stop-ngrok.ps1    # ngrok隧道停止脚本
├── docker-compose.yml     # Docker编排配置
├── start.ps1             # PowerShell主启动脚本
└── README.md             # 项目文档
```

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🆘 常见问题

### Q: 启动失败怎么办？
A: 检查以下几点：
- Python和Node.js版本是否符合要求
- 端口8000和3000是否被占用
- 环境变量配置是否正确

### Q: AI功能不工作？
A: 确保：
- 在.env中正确配置了AI_PROVIDER
- 如果使用OpenAI，确保API_KEY有效
- 网络连接正常

### Q: 如何备份数据？
A: 数据存储在`novel_repo`目录，直接复制该目录即可备份

### Q: 支持哪些文件格式？
A: 目前支持：
- 章节内容：.txt格式
- 配置文件：JSON格式
- 导出格式：TXT、Markdown

### Q: PowerShell执行策略问题？
A: 如果遇到执行策略限制，请运行：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Q: 如何查看服务状态？
A: 
- Docker模式：`docker-compose ps`
- 本地模式：查看对应的PowerShell窗口

### Q: 为什么删除了批处理文件？
A: 为了提供更好的用户体验，我们：
- 保留了PowerShell脚本，功能更强大
- 删除了传统的批处理文件，避免维护多个版本
- PowerShell脚本提供更好的错误处理和用户交互

## 📞 技术支持

- 项目Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 文档: [项目Wiki](https://github.com/your-repo/wiki)
- 邮箱: support@example.com

## 🙏 致谢

- [FastAPI](https://fastapi.tiangolo.com/) - 高性能Python Web框架
- [Next.js](https://nextjs.org/) - React全栈框架
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - 代码编辑器
- [Ant Design](https://ant.design/) - 企业级UI组件库

---

**Novel Edit** - 让创作更简单，让灵感更自由 ✨ 