# AI交互式小说创作平台

一个基于人工智能的实时多人协作小说创作平台，用户可以通过投票共同决定故事的发展方向，创造独特的交互式阅读体验。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-%3E%3D14.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-18.2.0-blue.svg)

## 🌟 功能特色

### 核心功能
- 🤖 **AI智能创作**: 集成OpenAI API（支持DeepSeek等模型），生成高质量故事内容
- 👥 **多人实时协作**: 支持多个用户同时在线，实时参与故事创作
- 🗳️ **民主投票机制**: 每轮投票决定故事走向，让每个人都能影响剧情
- 🏠 **多房间系统**: 支持创建和管理多个独立的故事房间
- 💬 **实时讨论区**: 用户可以在投票期间讨论剧情走向
- 📚 **故事模板系统**: 预设多种故事模板，支持自定义创建

### 用户体验
- 📱 **响应式设计**: 适配桌面端和移动端设备
- 🎨 **现代化界面**: 基于Material-UI的美观界面设计
- 🌗 **主题切换**: 支持明亮/暗黑主题切换
- ⚡ **实时更新**: WebSocket确保所有用户同步获得最新内容
- 🔐 **安全认证**: JWT令牌认证保障用户安全

### 管理功能
- 📊 **HTML日志系统**: 自动生成详细的房间操作日志
- 👤 **用户管理**: 完整的注册、登录、用户设置系统
- 🔧 **房间管理**: 房间创建、加入、离开等完整生命周期管理

## 🏗️ 技术架构

### 后端技术栈
- **Node.js** + **Express.js** - 服务器框架
- **Socket.IO** - 实时双向通信
- **OpenAI API** - AI内容生成（支持DeepSeek等）
- **JWT** - 用户认证和授权
- **bcryptjs** - 密码加密
- **JSON文件存储** - 轻量级数据持久化

### 前端技术栈
- **React 18** - 现代化UI框架
- **Material-UI (MUI)** - 组件库和设计系统
- **React Router** - 单页应用路由
- **Socket.IO Client** - 实时通信客户端
- **Axios** - HTTP请求库
- **React Hot Toast** - 优雅的通知系统

### 架构特点
- **前后端分离**: React SPA + Node.js API
- **实时通信**: WebSocket保证即时性
- **模块化设计**: 组件化架构，易于维护和扩展
- **状态管理**: React Context管理应用状态

## 📁 项目结构

```
AINovel/
├── client/                    # React前端应用
│   ├── public/
│   │   └── index.html        # HTML模板
│   ├── src/
│   │   ├── components/       # React组件
│   │   │   ├── HomePage.js      # 主页 - 房间列表
│   │   │   ├── CreateRoom.js    # 创建房间页面
│   │   │   ├── Novel.js         # 小说阅读页面
│   │   │   ├── VotingPanel.js   # 投票面板组件
│   │   │   ├── DiscussionPanel.js # 讨论区组件
│   │   │   ├── StoryDisplay.js  # 故事展示组件
│   │   │   ├── Login.js         # 登录页面
│   │   │   ├── Register.js      # 注册页面
│   │   │   └── UserSettings.js  # 用户设置
│   │   ├── contexts/         # React上下文
│   │   │   ├── AuthContext.js   # 认证上下文
│   │   │   ├── SocketContext.js # Socket通信上下文
│   │   │   └── ThemeContext.js  # 主题上下文
│   │   ├── App.js           # 主应用组件
│   │   ├── index.js         # 应用入口
│   │   ├── index.css        # 全局样式
│   │   └── setupProxy.js    # 开发代理配置
│   └── package.json         # 前端依赖配置
├── server/                   # Node.js后端应用
│   ├── routes/              # API路由
│   │   ├── auth.js             # 用户认证路由
│   │   └── templates.js        # 故事模板路由
│   ├── services/            # 业务逻辑服务
│   │   ├── novelService.js     # 核心小说生成服务
│   │   └── templateService.js  # 模板管理服务
│   ├── middleware/          # 中间件
│   │   └── socketAuth.js       # Socket认证中间件
│   ├── utils/               # 工具函数
│   │   └── fileUtils.js        # 文件操作工具
│   ├── data/                # 数据存储
│   │   ├── users.json          # 用户数据
│   │   ├── novel-templates.json # 故事模板
│   │   └── room_*_logs.html    # 房间日志文件
│   ├── app.js               # 服务器主入口
│   ├── package.json         # 后端依赖配置
│   └── nodemon.json         # 开发环境配置
├── start.bat                # Windows启动脚本
├── start.sh                 # Linux/Mac启动脚本
└── README.md               # 项目文档
```

## 🚀 快速开始

### 环境要求
- Node.js 14.0.0 或更高版本
- npm 6.0.0 或更高版本
- 有效的OpenAI API密钥（支持DeepSeek等兼容API）

### 一键启动（推荐）

**Windows用户:**
```bash
# 双击运行或在命令行执行
start.bat
```

**Linux/Mac用户:**
```bash
# 给予执行权限并运行
chmod +x start.sh
./start.sh
```

### 手动启动

1. **克隆项目**
```bash
git clone [项目地址]
cd AINovel
```

2. **安装后端依赖**
```bash
cd server
npm install
```

3. **安装前端依赖**
```bash
cd ../client
npm install
```

4. **配置API密钥**
编辑 `server/services/novelService.js`，设置你的API密钥：
```javascript
this.client = new OpenAI({
  apiKey: "your_api_key_here",
  baseURL: "https://api.deepseek.com"  // 或其他兼容的API端点
});
```

5. **启动后端服务器**
```bash
cd ../server
npm start
# 开发模式: npm run dev
```

6. **启动前端应用**
```bash
cd ../client
npm start
```

7. **访问应用**
打开浏览器访问: http://localhost:3000

## 🎮 使用指南

### 基本流程
1. **注册账号**: 创建新用户账号或使用现有账号登录
2. **选择房间**: 在主页浏览活跃的故事房间，或创建新房间
3. **创建房间**: 选择故事模板或自定义故事设定
4. **参与故事**: 阅读AI生成的故事内容
5. **投票选择**: 在关键节点为故事发展方向投票
6. **实时讨论**: 与其他用户讨论剧情和选择
7. **等待结果**: 投票结束后，AI根据获胜选项继续故事

### 投票机制详解
- **投票时间**: 每轮投票时长5分钟
- **投票权限**: 每个用户每轮只能投一票
- **结果决策**: 得票最多的选项决定故事走向
- **自动延期**: 如果无人投票，自动延长5分钟
- **实时更新**: 投票进度和倒计时实时显示

### 房间管理
- **创建房间**: 使用预设模板或完全自定义
- **房间状态**: 实时显示在线用户数和故事进度
- **权限控制**: 房间创建者拥有管理权限
- **生命周期**: 房间可以暂停、继续或结束

## ⚙️ 配置说明

### API配置
```javascript
// server/services/novelService.js
this.client = new OpenAI({
  apiKey: "your_api_key_here",
  baseURL: "https://api.deepseek.com",  // 支持多种AI服务
  defaultHeaders: {
    'Content-Type': 'application/json',
  }
});
```

### JWT密钥配置
```javascript
// server/routes/auth.js 和 server/middleware/socketAuth.js
const JWT_SECRET = 'your_secure_jwt_secret_key_here';
```

### 端口配置
- 后端API服务器: 3001端口
- 前端开发服务器: 3000端口
- Socket.IO通信: 与后端API共享3001端口

### 跨域配置
```javascript
// server/app.js
app.use(cors());
io.on('connection', {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
```

## 📊 数据存储

### 用户数据 (`server/data/users.json`)
```json
{
  "users": [
    {
      "id": "user_id",
      "username": "用户名",
      "password": "加密密码",
      "createdAt": "创建时间"
      "email": "邮箱",
      "theme": "选择的主题配色"
    }
  ]
}
```

### 故事模板 (`server/data/novel-templates.json`)
- 预设故事背景和人物设定
- 自定义提示词模板
- 故事风格和类型定义

### 房间日志 (`server/data/room_*_logs.html`)
- HTML格式的详细操作日志
- 包含用户行为、投票记录、故事生成过程
- 便于调试和分析

## 🔧 开发指南

### 添加新功能
1. **后端API**: 在 `server/routes/` 目录下创建新路由文件
2. **前端组件**: 在 `client/src/components/` 目录下创建新组件
3. **实时功能**: 在 `novelService.js` 中添加Socket.IO事件处理
4. **状态管理**: 在相应的Context中添加状态和方法

### 自定义故事模板
```javascript
// 在 server/data/novel-templates.json 中添加
{
  "id": "custom_template",
  "name": "自定义模板",
  "description": "模板描述",
  "genre": "类型",
  "setting": "故事背景",
  "characters": ["角色1", "角色2"],
  "initialPrompt": "初始提示词",
  "choicePrompt": "选择生成提示词",
  "continuePrompt": "续写提示词"
}
```

### 扩展AI服务
系统设计支持多种AI服务，只需修改OpenAI客户端配置：
- DeepSeek API
- OpenAI GPT系列
- 其他兼容OpenAI格式的API

## 🐛 常见问题

### 安装和启动问题
**Q: Node.js版本兼容性问题**
A: 请确保使用Node.js 14.0.0或更高版本

**Q: 依赖安装失败**
A: 尝试清除缓存：`npm cache clean --force`，然后重新安装

**Q: 端口被占用**
A: 修改package.json中的启动端口，或终止占用端口的进程

### 功能使用问题
**Q: AI响应速度慢**
A: 检查网络连接和API密钥有效性，某些AI服务可能有响应延迟

**Q: 投票不生效**
A: 确保用户已登录且正确加入房间，检查网络连接状态

**Q: 房间无法创建**
A: 检查房间ID是否已存在，确保模板格式正确

### 开发调试
**Q: Socket连接失败**
A: 检查后端服务器是否正常运行，确认端口配置正确

**Q: 认证失败**
A: 检查JWT密钥配置，确保前后端密钥一致

## 🔒 安全考虑

- **密码加密**: 使用bcryptjs进行密码哈希
- **JWT认证**: 所有API请求需要有效令牌
- **Socket认证**: WebSocket连接需要通过认证中间件
- **数据验证**: 前后端双重数据验证
- **XSS防护**: 用户输入内容进行适当转义

## 🚀 部署建议

### 生产环境配置
1. **数据库**: 建议替换JSON文件存储为正式数据库（MySQL、PostgreSQL等）
2. **缓存**: 添加Redis等缓存层提升性能
3. **负载均衡**: 大规模部署时考虑负载均衡和集群
4. **SSL证书**: 生产环境必须启用HTTPS
5. **环境变量**: 使用环境变量管理敏感配置

### Docker部署
```dockerfile
# 示例Dockerfile配置
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🤝 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

1. Fork项目到你的GitHub账号
2. 创建功能分支: `git checkout -b feature/AmazingFeature`
3. 提交更改: `git commit -m 'Add some AmazingFeature'`
4. 推送分支: `git push origin feature/AmazingFeature`
5. 创建Pull Request

### 代码规范
- 使用ESLint进行代码检查
- 遵循React和Node.js最佳实践
- 添加适当的注释和文档
- 确保新功能有对应的测试

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

## 🙏 致谢

- [OpenAI](https://openai.com) - AI模型支持
- [DeepSeek](https://www.deepseek.com) - AI服务支持
- [React](https://reactjs.org) - 前端框架
- [Material-UI](https://mui.com) - UI组件库
- [Socket.IO](https://socket.io) - 实时通信
- [Express.js](https://expressjs.com) - 后端框架

---

**享受创造属于你们的独特故事！** ✨

如有问题或建议，请通过GitHub Issues联系我们。