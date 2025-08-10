const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const { initializeNovel, getNovelState } = require('./services/novelService');
const { authenticateSocket } = require('./middleware/socketAuth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/auth', authRoutes);

// Socket.IO 连接处理
io.use(authenticateSocket);
io.on('connection', (socket) => {
  console.log('用户连接:', socket.userId);
  
  // 发送当前小说状态
  socket.emit('novel_state', getNovelState());
  
  // 处理投票
  socket.on('vote', (data) => {
    const { choice } = data;
    const userId = socket.userId;
    
    const novelService = require('./services/novelService');
    const result = novelService.addVote(userId, choice);
    
    if (result.success) {
      // 广播投票更新
      io.emit('vote_update', {
        votes: result.votes,
        userVote: { [userId]: choice }
      });
    } else {
      socket.emit('vote_error', { message: result.message });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.userId);
  });
});

// 启动小说生成器
initializeNovel(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});