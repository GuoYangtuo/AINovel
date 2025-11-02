require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const templateRoutes = require('./routes/templates');
const ttsService = require('./services/ttsService');
const { 
  initializeNovel, 
  getNovelState, 
  addVote, 
  getRoom,
  joinRoom,
  leaveRoom,
  getAllRoomsInfo,
  addDiscussionMessage,
  getDiscussionMessages,
  addCustomOption
} = require('./services/novelService');
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

// 静态文件服务 - 提供音频文件访问
app.use('/audio', express.static(path.join(__dirname, 'public/audio')));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);

// 获取所有活跃小说列表的API
app.get('/api/novels', (req, res) => {
  try {
    const novels = getAllRoomsInfo();
    res.json({ success: true, novels });
  } catch (error) {
    console.error('获取小说列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// TTS 服务状态检查API
app.get('/api/tts/status', async (req, res) => {
  try {
    const status = await ttsService.checkHealth();
    res.json({ success: true, ...status });
  } catch (error) {
    console.error('检查TTS服务状态失败:', error);
    res.status(500).json({ 
      success: false, 
      status: 'error',
      message: error.message 
    });
  }
});

// TTS 配置API
app.get('/api/tts/config', (req, res) => {
  try {
    const config = ttsService.getConfig();
    res.json({ success: true, config });
  } catch (error) {
    console.error('获取TTS配置失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新TTS配置API
app.post('/api/tts/config', (req, res) => {
  try {
    const newConfig = req.body;
    ttsService.updateConfig(newConfig);
    res.json({ success: true, message: '配置已更新', config: ttsService.getConfig() });
  } catch (error) {
    console.error('更新TTS配置失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// Socket.IO 连接处理
io.use(authenticateSocket);
io.on('connection', (socket) => {
  console.log('用户连接:', socket.userId);
  let currentRoomId = null;
  
  // 用户加入小说房间
  socket.on('join_room', (data) => {
    const { roomId } = data;
    const userId = socket.userId;
    
    console.log(`用户 ${userId} 请求加入房间 ${roomId}`);
    // 离开之前的房间
    if (currentRoomId) {
      socket.leave(currentRoomId);
      leaveRoom(userId, currentRoomId);
      console.log(`用户 ${userId} 离开房间 ${currentRoomId}`);
    }
    
    // 加入新房间
    const room = joinRoom(userId, roomId);
    if (room) {
      socket.join(roomId);
      currentRoomId = roomId;
      console.log(`用户 ${userId} 成功加入房间 ${roomId}`);
      
      // 发送房间的小说状态
      socket.emit('novel_state', room.getNovelState());
      socket.emit('join_room_success', { roomId, title: room.title });
    } else {
      socket.emit('join_room_error', { message: '房间不存在' });
    }
  });
  
  // 处理投票
  socket.on('vote', async (data) => {
    const { choice, coinsSpent = 0 } = data;
    const userId = socket.userId;
    
    if (!currentRoomId) {
      socket.emit('vote_error', { message: '请先加入房间' });
      return;
    }
    
    const result = await addVote(userId, choice, currentRoomId, coinsSpent, socket.id);
    
    if (result.success) {
      // 向房间内所有用户广播投票更新
      io.to(currentRoomId).emit('vote_update', {
        votes: result.votes,
        userVote: { [userId]: result.userVote },
        message: result.message
      });
      
      // 向投票用户发送确认信息
      socket.emit('vote_success', {
        choice,
        coinsSpent,
        totalVotes: result.userVote.totalVotes,
        message: result.message
      });
    } else {
      socket.emit('vote_error', { message: result.message });
    }
  });
  
  // 处理讨论区消息
  socket.on('discussion_message', (data) => {
    const { message } = data;
    const userId = socket.userId;
    const username = socket.username || '匿名用户';
    
    if (!currentRoomId) {
      socket.emit('discussion_error', { message: '请先加入房间' });
      return;
    }
    
    const result = addDiscussionMessage(userId, username, message, currentRoomId);
    
    if (result.success) {
      // 向房间内所有用户广播新消息
      io.to(currentRoomId).emit('discussion_message', result.message);
    } else {
      socket.emit('discussion_error', { message: result.message });
    }
  });

  // 处理添加自定义选项
  socket.on('add_custom_option', async (data) => {
    const { customOption } = data;
    const userId = socket.userId;
    
    if (!currentRoomId) {
      socket.emit('custom_option_error', { message: '请先加入房间' });
      return;
    }
    
    if (!customOption || typeof customOption !== 'string' || customOption.trim().length === 0) {
      socket.emit('custom_option_error', { message: '自定义选项内容不能为空' });
      return;
    }
    
    const result = await addCustomOption(userId, customOption.trim(), currentRoomId, socket.id);
    
    if (result.success) {
      // 向房间内所有用户广播新的自定义选项
      io.to(currentRoomId).emit('custom_option_added', {
        customOption: result.customOption,
        requiredCoins: result.requiredCoins,
        message: result.message,
        votes: getNovelState(currentRoomId)?.votes || {}
      });
      
      // 向添加者发送确认信息
      socket.emit('custom_option_success', {
        customOption: result.customOption,
        requiredCoins: result.requiredCoins,
        message: result.message
      });
    } else {
      socket.emit('custom_option_error', { message: result.message });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.userId);
    // 用户断开连接时离开房间
    if (currentRoomId) {
      leaveRoom(socket.userId, currentRoomId);
    }
  });
});

// 启动小说生成器
initializeNovel(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});