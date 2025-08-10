# AI交互式小说网站

一个基于AI的实时交互式小说创作平台，用户可以通过投票影响故事的发展方向。

## 功能特点

- 🤖 **AI驱动**: 使用DeepSeek AI生成高质量故事内容
- 👥 **实时交互**: 多用户同时在线，实时投票影响故事走向
- 🎯 **民主选择**: 每5分钟一轮投票，得票最多的选项决定故事发展
- 🔐 **用户系统**: 安全的注册登录机制
- 📱 **现代界面**: Material-UI打造的美观响应式界面
- ⚡ **实时通信**: WebSocket确保即时更新

## 技术栈

### 后端
- Node.js + Express
- Socket.IO (实时通信)
- OpenAI API (DeepSeek)
- JWT认证
- JSON文件存储

### 前端
- React 18
- Material-UI
- Socket.IO Client
- React Router
- Axios

## 项目结构

```
AINovel/
├── Demo/
│   └── main.py          # 原始Python版本
├── server/              # Node.js后端
│   ├── app.js          # 主应用入口
│   ├── package.json    # 后端依赖
│   ├── routes/         # 路由
│   │   └── auth.js     # 认证路由
│   ├── services/       # 服务层
│   │   └── novelService.js  # 小说生成服务
│   ├── middleware/     # 中间件
│   │   └── socketAuth.js    # Socket认证
│   ├── utils/          # 工具函数
│   │   └── fileUtils.js     # 文件操作
│   └── data/           # 数据存储
│       └── users.json  # 用户数据
└── client/             # React前端
    ├── public/
    ├── src/
    │   ├── components/ # React组件
    │   ├── contexts/   # 上下文
    │   └── App.js      # 主应用
    └── package.json    # 前端依赖
```

## 运行说明

### 1. 安装依赖

后端：
```bash
cd server
npm install
```

前端：
```bash
cd client
npm install
```

### 2. 启动服务

启动后端服务器（端口3001）：
```bash
cd server
npm start
# 或开发模式: npm run dev
```

启动前端应用（端口3000）：
```bash
cd client
npm start
```

### 3. 访问应用

打开浏览器访问：http://localhost:3000

## 使用流程

1. **注册/登录**: 创建账号或登录现有账号
2. **等待故事**: AI自动生成初始故事段落
3. **查看选项**: 故事会在关键节点停下，提供多个选择
4. **参与投票**: 点击你喜欢的选项进行投票
5. **等待结果**: 5分钟后，得票最多的选项将继续故事
6. **循环发展**: 故事根据投票结果持续发展

## 配置说明

### API密钥
在`server/services/novelService.js`中修改DeepSeek API密钥：
```javascript
this.client = new OpenAI({
  apiKey: "your_api_key_here",
  baseURL: "https://api.deepseek.com"
});
```

### JWT密钥
在`server/routes/auth.js`和`server/middleware/socketAuth.js`中修改：
```javascript
const JWT_SECRET = 'your_jwt_secret_key_here';
```

## 投票机制

- 每个用户每轮只能投一票
- 投票时间为5分钟
- 如果无人投票，自动延长5分钟
- 得票最多的选项决定故事走向
- 实时显示投票进度和倒计时

## 故事设定

当前使用的故事背景：
- 主人公：高中生小叶，拥有读心术能力
- 世界观：现代都市，隐藏的超能力世界
- 人物关系：母亲、同桌、神秘组织等
- 主题：成长、选择、超能力觉醒

## 开发说明

### 添加新功能
1. 后端API：在`server/routes/`添加新路由
2. 前端组件：在`client/src/components/`添加新组件
3. 实时功能：在`novelService.js`和Socket上下文中添加事件

### 数据存储
- 用户数据：`server/data/users.json`
- 小说状态：内存存储，重启后重置
- 投票数据：临时存储，每轮重置

## 注意事项

- 需要有效的DeepSeek API密钥
- 服务器重启会清空当前小说进度
- 投票数据不会持久化
- 建议在生产环境中使用真实数据库

## 许可证

MIT License