const { OpenAI } = require('openai');
const templateService = require('./templateService');
const fs = require('fs');
const path = require('path');

// HTML日志记录器类
class HtmlLogger {
  constructor(roomId) {
    this.roomId = roomId;
    this.logFilePath = path.join(__dirname, '..', 'data', `room_${roomId}_logs.html`);
    this.initializeLogFile();
  }

  initializeLogFile() {
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>房间 ${this.roomId} 日志</title>
    <style>
        body {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            background-color: #1e1e1e;
            color: #d4d4d4;
            margin: 0;
            padding: 20px;
            line-height: 1.4;
        }
        .log-entry {
            margin-bottom: 15px;
            padding: 10px;
            border-left: 3px solid #007acc;
            background-color: #2d2d30;
            border-radius: 3px;
        }
        .log-timestamp {
            color: #608b4e;
            font-size: 0.9em;
            margin-bottom: 5px;
        }
        .log-type {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .log-prompt {
            color: #ce9178;
            background-color: #3c3c3c;
            padding: 8px;
            border-radius: 3px;
            white-space: pre-wrap;
            font-size: 0.9em;
        }
        .log-response {
            color: #9cdcfe;
            background-color: #3c3c3c;
            padding: 8px;
            border-radius: 3px;
            white-space: pre-wrap;
            font-size: 0.9em;
        }
        .log-error {
            color: #f44747;
            background-color: #3c3c3c;
            padding: 8px;
            border-radius: 3px;
            white-space: pre-wrap;
        }
        .log-info {
            color: #4ec9b0;
        }
        .log-warning {
            color: #dcdcaa;
        }
        .log-success {
            color: #4ec9b0;
        }
        .log-voting {
            color: #dcdcaa;
            background-color: #3c3c3c;
            padding: 8px;
            border-radius: 3px;
        }
        .log-state {
            color: #c586c0;
            background-color: #3c3c3c;
            padding: 8px;
            border-radius: 3px;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <h1>房间 ${this.roomId} 实时日志</h1>
    <div id="logs-container">
    </div>
    <script>
        // 自动滚动到最新日志
        function scrollToBottom() {
            window.scrollTo(0, document.body.scrollHeight);
        }
        
        // 页面加载完成后滚动到底部
        window.addEventListener('load', scrollToBottom);
    </script>
</body>
</html>`;

    fs.writeFileSync(this.logFilePath, htmlContent, 'utf8');
  }

  log(type, content, data = null) {
    const timestamp = new Date().toLocaleString('zh-CN');
    const logEntry = this.createLogEntry(type, content, data, timestamp);
    
    // 读取现有内容
    let existingContent = '';
    if (fs.existsSync(this.logFilePath)) {
      existingContent = fs.readFileSync(this.logFilePath, 'utf8');
    }
    
    // 在 </div> 标签前插入新日志
    const insertPosition = existingContent.lastIndexOf('</div>');
    if (insertPosition !== -1) {
      const newContent = existingContent.slice(0, insertPosition) + logEntry + existingContent.slice(insertPosition);
      fs.writeFileSync(this.logFilePath, newContent, 'utf8');
    }
  }

  createLogEntry(type, content, data, timestamp) {
    let logClass = 'log-info';
    let displayContent = content;
    
    switch (type) {
      case 'prompt':
        logClass = 'log-prompt';
        displayContent = `[PROMPT] ${content}`;
        break;
      case 'response':
        logClass = 'log-response';
        displayContent = `[RESPONSE] ${content}`;
        break;
      case 'error':
        logClass = 'log-error';
        displayContent = `[ERROR] ${content}`;
        break;
      case 'warning':
        logClass = 'log-warning';
        displayContent = `[WARNING] ${content}`;
        break;
      case 'success':
        logClass = 'log-success';
        displayContent = `[SUCCESS] ${content}`;
        break;
      case 'voting':
        logClass = 'log-voting';
        displayContent = `[VOTING] ${content}`;
        break;
      case 'state':
        logClass = 'log-state';
        displayContent = `[STATE] ${content}`;
        break;
    }

    let dataSection = '';
    if (data) {
      dataSection = `<div class="log-state">${JSON.stringify(data, null, 2)}</div>`;
    }

    return `
    <div class="log-entry">
        <div class="log-timestamp">${timestamp}</div>
        <div class="log-type ${logClass}">${displayContent}</div>
        ${dataSection}
    </div>`;
  }

  logPrompt(prompt) {
    this.log('prompt', prompt);
  }

  logResponse(response) {
    this.log('response', response);
  }

  logError(error) {
    this.log('error', error.message || error);
  }

  logInfo(info) {
    this.log('info', info);
  }

  logWarning(warning) {
    this.log('warning', warning);
  }

  logSuccess(success) {
    this.log('success', success);
  }

  logVoting(voting) {
    this.log('voting', voting);
  }

  logState(state) {
    this.log('state', '房间状态更新', state);
  }
}


// 单个小说房间类
class NovelRoom {
  constructor(roomId, title = '未命名小说', templateData) {
    if (!templateData) {
      throw new Error('templateData is required to create a room');
    }
    this.roomId = roomId;
    this.title = title;
    this.createdAt = new Date();
    this.connectedUsers = new Set();
    this.templateData = templateData; // 模板数据
    this.logger = new HtmlLogger(roomId); // 初始化日志记录器
    
    this.client = new OpenAI({
      apiKey: "sk-48d5645fd30347fe905e51c2d431113f",
      baseURL: "https://api.deepseek.com"
    });
    
    this.novelState = {
      currentStory: '',
      choices: [],
      votes: {},
      userVotes: {},
      isVoting: false,
      votingEndTime: null,
      storyHistory: []
    };
    
    // 讨论区数据
    this.discussion = {
      messages: [], // 当前讨论区的消息
      isActive: false // 讨论区是否激活（在投票阶段激活）
    };
    
    this.io = null;
    this.votingTimer = null;
  }

  // 添加用户到房间
  addUser(userId) {
    this.connectedUsers.add(userId);
    //this.logger.logInfo(`用户 ${userId} 加入房间`);
  }

  // 移除用户从房间
  removeUser(userId) {
    this.connectedUsers.delete(userId);
    //this.logger.logInfo(`用户 ${userId} 离开房间`);
  }

  // 获取房间信息
  getRoomInfo() {
    return {
      roomId: this.roomId,
      title: this.title,
      createdAt: this.createdAt,
      connectedUsers: this.connectedUsers.size,
      currentStory: this.novelState.currentStory ? this.novelState.currentStory.substring(0, 200) + '...' : '',
      isActive: this.novelState.currentStory !== ''
    };
  }

  // 初始化小说
  async initializeNovel(io) {
    this.io = io;
    try {
      this.logger.logInfo(`正在为房间 ${this.roomId} 生成初始故事...`);
      
      const processed = await this.调用AI带重试(async () => {
        return await this.生成初始故事();
      });
      
      this.logger.logSuccess(`房间 ${this.roomId} 初始故事生成完成`);
      
      this.novelState.currentStory = processed.story;
      this.novelState.choices = processed.choices;
      this.novelState.isVoting = true;
      this.novelState.votes = {};
      this.novelState.userVotes = {};
      
      // 记录房间状态
      this.logger.logState({
        currentStory: this.novelState.currentStory.substring(0, 200) + '...',
        choices: this.novelState.choices,
        isVoting: this.novelState.isVoting,
        connectedUsers: this.connectedUsers.size
      });
      
      this.startVotingTimer();
      
      // 广播初始状态到房间内的用户
      if (this.io) {
        this.io.to(this.roomId).emit('novel_state', this.getNovelState());
      }
      
    } catch (error) {
      this.logger.logError(`房间 ${this.roomId} 初始化小说失败: ${error.message}`);
      // 广播错误状态
      if (this.io) {
        this.io.to(this.roomId).emit('novel_error', {
          message: '故事初始化失败，请刷新页面重试'
        });
      }
    }
  }

  // 生成初始故事
  async 生成初始故事() {
    if (!this.templateData || !this.templateData.promptTemplate) {
      throw new Error('模板数据缺失，无法生成故事');
    }
    
    const role = this.templateData.promptTemplate.systemPrompt;
    const prompt = templateService.generateInitialPrompt(this.templateData);
    
    this.logger.logPrompt(prompt);

    try {
      const response = await this.client.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: role },
          { role: "user", content: prompt }
        ],
        stream: false
      });
      this.logger.logResponse(response.choices[0].message.content);
      
      return response.choices[0].message.content;
    } catch (error) {
      this.logger.logError(`生成初始故事失败: ${error.message}`);
      throw error;
    }
  }

  // 继续故事
  async 继续故事(选择的选项) {
    if (!this.templateData || !this.templateData.promptTemplate) {
      throw new Error('模板数据缺失，无法继续故事');
    }
    
    const role = this.templateData.promptTemplate.systemPrompt;
    const prompt = templateService.generateContinuePrompt(this.templateData, this.novelState.storyHistory, 选择的选项);
    
    this.logger.logPrompt(prompt);

    try {
      const response = await this.client.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: role },
          { role: "user", content: prompt }
        ],
        stream: false
      });
      
      this.logger.logResponse(response.choices[0].message.content);

      return response.choices[0].message.content;
    } catch (error) {
      this.logger.logError(`继续故事失败: ${error.message}`);
      throw error;
    }
  }

  // 带重试机制的AI调用
  async 调用AI带重试(promptFunction, maxRetries = 4) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.logInfo(`第${attempt}次尝试调用AI...`);
        const response = await promptFunction();
        const processed = this.处理回答(response);
        this.logger.logSuccess(`第${attempt}次尝试成功`);
        return processed;
      } catch (error) {
        this.logger.logError(`第${attempt}次尝试失败: ${error.message}`);
        if (attempt === maxRetries) {
          this.logger.logError('所有重试都失败了');
          throw new Error(`AI调用失败，已重试${maxRetries}次: ${error.message}`);
        }
        // 等待一段时间再重试
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // 处理AI回答
  处理回答(回答) {
    try {
      const parts = 回答.split('[');
      if (parts.length < 2) {
        throw new Error('回答格式不正确：缺少选项部分');
      }
      
      const story = parts[0].trim();
      if (!story) {
        throw new Error('回答格式不正确：故事内容为空');
      }
      
      const choicesStr = '[' + parts[1];
      const choices = JSON.parse(choicesStr);
      
      if (!Array.isArray(choices) || choices.length === 0) {
        throw new Error('回答格式不正确：选项格式无效');
      }
      
      return { story, choices };
    } catch (error) {
      this.logger.logError(`处理回答失败: ${error.message}`);
      throw error; // 抛出错误而不是返回默认值
    }
  }

  // 添加投票
  addVote(userId, choice, coinsSpent = 0) {
    if (!this.novelState.isVoting) {
      this.logger.logWarning('当前不在投票阶段');
      return { success: false, message: '当前不在投票阶段' };
    }

    if (!this.novelState.choices.includes(choice)) {
      return { success: false, message: '无效的选项' };
    }

    // 验证金币数量
    if (coinsSpent < 0 || !Number.isInteger(coinsSpent)) {
      return { success: false, message: '金币数量无效' };
    }

    // 移除用户之前的投票（如果有的话）
    const previousVote = this.novelState.userVotes[userId];
    if (previousVote && this.novelState.votes[previousVote.choice]) {
      this.novelState.votes[previousVote.choice] -= previousVote.totalVotes;
    }

    // 计算总投票数：默认1票 + 金币票数
    const totalVotes = 1 + coinsSpent;
    
    // 记录新投票
    this.novelState.userVotes[userId] = {
      choice,
      coinsSpent,
      totalVotes,
      timestamp: new Date().toISOString()
    };
    
    // 更新选项的总票数
    this.novelState.votes[choice] = (this.novelState.votes[choice] || 0) + totalVotes;
    
    // 记录投票日志
    this.logger.logVoting(`用户 ${userId} 投票: ${choice} (使用${coinsSpent}金币，总计${totalVotes}票)`);

    const message = coinsSpent > 0 
      ? `投票成功！使用${coinsSpent}金币，总计${totalVotes}票` 
      : '投票成功！使用基础投票权（1票）';

    return { 
      success: true, 
      votes: this.novelState.votes,
      userVote: this.novelState.userVotes[userId],
      message
    };
  }

  // 添加讨论区消息
  addDiscussionMessage(userId, username, message) {
    if (!this.discussion.isActive) {
      return { success: false, message: '当前讨论区未激活' };
    }

    if (!message || message.trim().length === 0) {
      return { success: false, message: '消息内容不能为空' };
    }

    if (message.length > 500) {
      return { success: false, message: '消息长度不能超过500字符' };
    }

    const newMessage = {
      id: Date.now() + Math.random(), // 简单的ID生成
      userId,
      username,
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    this.discussion.messages.push(newMessage);
    
    // 记录讨论区消息
    //this.logger.logInfo(`讨论区消息 - ${username}: ${message}`);

    // 限制讨论区消息数量，避免内存过多占用
    if (this.discussion.messages.length > 100) {
      this.discussion.messages = this.discussion.messages.slice(-50); // 保留最近50条
    }

    return { 
      success: true, 
      message: newMessage
    };
  }

  // 获取当前讨论区消息
  getDiscussionMessages() {
    return this.discussion.messages;
  }

  // 激活讨论区
  activateDiscussion() {
    this.discussion.isActive = true;
  }

  // 清空讨论区并归档
  clearDiscussion() {
    const archivedMessages = [...this.discussion.messages];
    this.discussion.messages = [];
    this.discussion.isActive = false;
    return archivedMessages;
  }

  // 开始投票计时器
  startVotingTimer() {
    // 根据模板设置确定投票时长，默认为1分钟
    const VOTING_DURATION = this.templateData?.settings?.votingDuration || (1 * 60 * 1000);
    this.novelState.votingEndTime = Date.now() + VOTING_DURATION;

    if (this.votingTimer) {
      clearTimeout(this.votingTimer);
    }

    // 激活讨论区
    this.activateDiscussion();
    
    // 记录投票开始
    //this.logger.logVoting(`投票开始，时长: ${VOTING_DURATION / 1000}秒`);

    this.votingTimer = setTimeout(async () => {
      await this.processVotingResult();
    }, VOTING_DURATION);

    // 广播投票开始到房间
    if (this.io) {
      this.io.to(this.roomId).emit('voting_started', {
        endTime: this.novelState.votingEndTime,
        choices: this.novelState.choices,
        discussionActive: true
      });
    }
  }

  // 处理投票结果
  async processVotingResult() {
    this.novelState.isVoting = false;
    
    // 统计投票结果
    let winningChoice = '';
    let maxVotes = 0;
    
    for (const [choice, votes] of Object.entries(this.novelState.votes)) {
      if (votes > maxVotes) {
        maxVotes = votes;
        winningChoice = choice;
      }
    }

    // 如果没有投票，选择第一个选项
    if (maxVotes === 0) {
      winningChoice = this.novelState.choices[0];
      //this.logger.logVoting('没有投票，延长5分钟');
      
      // 延长5分钟
      this.startVotingTimer();
      if (this.io) {
        this.io.to(this.roomId).emit('voting_extended', {
          message: '没有人投票，投票时间延长5分钟',
          endTime: this.novelState.votingEndTime
        });
      }
      this.novelState.isVoting = true;
      return;
    }

    this.logger.logVoting(`投票结果: ${winningChoice} (${maxVotes}票)`);

    // 收集需要扣除金币的用户信息
    const coinDeductions = [];
    for (const [userId, userVote] of Object.entries(this.novelState.userVotes)) {
      if (userVote.coinsSpent > 0) {
        coinDeductions.push({
          userId,
          amount: userVote.coinsSpent,
          choice: userVote.choice,
          totalVotes: userVote.totalVotes
        });
      }
    }

    try {
      // 广播AI生成状态
      if (this.io) {
        this.io.to(this.roomId).emit('story_generating', {
          message: 'AI正在生成新的故事段落，请稍候...',
          winningChoice
        });
      }

      // 清空讨论区并归档消息
      const archivedDiscussion = this.clearDiscussion();

      // 保存当前故事到历史
      this.novelState.storyHistory.push({
        story: this.novelState.currentStory,
        winningChoice,
        votes: { ...this.novelState.votes },
        userVotes: { ...this.novelState.userVotes }, // 保存用户投票详情
        discussion: archivedDiscussion, // 添加讨论记录到历史
        timestamp: new Date().toISOString()
      });

      // 使用重试机制生成下一段故事
      const processed = await this.调用AI带重试(async () => {
        return await this.继续故事(winningChoice);
      });

      // 故事生成成功后，扣除用户金币
      await this.processCoinDeductions(coinDeductions);

      // 更新状态
      this.novelState.currentStory = processed.story;
      this.novelState.choices = processed.choices;
      this.novelState.isVoting = true;
      this.novelState.votes = {};
      this.novelState.userVotes = {};
      // 为新的选项初始化投票数
      processed.choices.forEach(choice => {
        this.novelState.votes[choice] = 0;
      });

      // 广播新故事到房间
      if (this.io) {
        this.io.to(this.roomId).emit('story_updated', {
          story: processed.story,
          choices: processed.choices,
          winningChoice,
          votes: this.novelState.votes,
          storyHistory: this.novelState.storyHistory,
          coinDeductions: coinDeductions // 告知前端哪些用户被扣除了金币
        });
      }

      // 开始新的投票
      this.startVotingTimer();

    } catch (error) {
      this.logger.logError(`生成下一段故事失败: ${error.message}`);
      
      // 如果生成失败，重新开始投票（不扣除金币）
      this.novelState.isVoting = true;
      this.startVotingTimer();
      
      if (this.io) {
        this.io.to(this.roomId).emit('story_error', {
          message: `故事生成失败: ${error.message}，请重新投票`
        });
      }
    }
  }

  // 处理金币扣除
  async processCoinDeductions(coinDeductions) {
    for (const deduction of coinDeductions) {
      try {
        // 这里应该调用认证服务的扣币接口
        // 由于我们在同一个服务内，直接调用文件系统
        const { readUsers, writeUsers } = require('../utils/fileUtils');
        
        const users = readUsers();
        const userIndex = users.findIndex(u => u.id === deduction.userId);
        
        if (userIndex !== -1) {
          const currentCoins = users[userIndex].coins || 0;
          if (currentCoins >= deduction.amount) {
            users[userIndex].coins = currentCoins - deduction.amount;
            users[userIndex].updatedAt = new Date().toISOString();
            writeUsers(users);
            
            this.logger.logVoting(`用户 ${deduction.userId} 扣除 ${deduction.amount} 金币 (投票: ${deduction.choice})`);
            
            // 通知前端用户金币变化
            if (this.io) {
              this.io.to(deduction.userId).emit('coins_deducted', {
                amount: deduction.amount,
                remainingCoins: users[userIndex].coins,
                reason: `投票消费: ${deduction.choice}`
              });
            }
          } else {
            this.logger.logWarning(`用户 ${deduction.userId} 金币不足，无法扣除 ${deduction.amount} 金币`);
          }
        }
      } catch (error) {
        this.logger.logError(`扣除用户 ${deduction.userId} 金币失败: ${error.message}`);
      }
    }
  }

  // 获取当前小说状态
  getNovelState() {
    return {
      ...this.novelState,
      timeRemaining: this.novelState.votingEndTime ? 
        Math.max(0, this.novelState.votingEndTime - Date.now()) : 0,
      discussion: {
        messages: this.discussion.messages,
        isActive: this.discussion.isActive
      }
    };
  }
}

// 多房间管理器
class NovelRoomManager {
  constructor() {
    this.rooms = new Map();
    this.io = null;
  }

  // 创建房间
  createRoom(roomId, title, templateData) {
    if (!templateData) {
      throw new Error('templateData is required to create a room');
    }
    
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId);
    }

    const room = new NovelRoom(roomId, title, templateData);
    this.rooms.set(roomId, room);
    // 房间创建日志由房间内部的logger处理
    return room;
  }

  // 获取房间
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  // 获取所有活跃房间信息
  getAllRoomsInfo() {
    const roomsInfo = [];
    for (const room of this.rooms.values()) {
      roomsInfo.push(room.getRoomInfo());
    }
    return roomsInfo.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // 删除房间
  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room && room.votingTimer) {
      clearTimeout(room.votingTimer);
    }
    this.rooms.delete(roomId);
    // 房间删除日志由房间内部的logger处理
  }

  // 用户加入房间
  joinRoom(userId, roomId) {
    const room = this.getRoom(roomId);
    if (room) {
      room.addUser(userId);
      return room;
    }
    return null;
  }

  // 用户离开房间
  leaveRoom(userId, roomId) {
    const room = this.getRoom(roomId);
    if (room) {
      room.removeUser(userId);
      // 如果房间没有用户了，可以考虑删除房间（可选）
      // if (room.connectedUsers.size === 0) {
      //   this.deleteRoom(roomId);
      // }
    }
  }

  // 初始化测试房间
  async initializeTestRooms(io) {
    this.io = io; // 保存io实例供后续创建的房间使用
    
    try {
      // 等待模板服务加载完成
      await templateService.waitForLoad();
      
      // 获取模板
      const testTemplate = templateService.getTemplateById('test-room-template');
      const fantasyTemplate = templateService.getTemplateById('fantasy-adventure-template');
      
      // 创建测试房间1，使用测试模板
      if (testTemplate) {
        const roomData1 = templateService.createRoomFromTemplate(testTemplate);
        const room1 = this.createRoom('room1', '小叶的超能力觉醒之路', roomData1);
        await room1.initializeNovel(io);
        // 测试房间1创建成功
      } else {
        console.warn('测试模板未找到，跳过创建房间1');
      }
      
      // 创建测试房间2，使用奇幻模板
      if (fantasyTemplate) {
        const roomData2 = templateService.createRoomFromTemplate(fantasyTemplate);
        const room2 = this.createRoom('room2', '魔法学院的奇幻冒险', roomData2);
        await room2.initializeNovel(io);
        // 测试房间2创建成功
      } else {
        console.warn('奇幻模板未找到，跳过创建房间2');
      }
      
      // 测试房间初始化完成
    } catch (error) {
      // 测试房间初始化失败，错误信息由各个房间的logger记录
    }
  }
}

// 单例实例
const novelRoomManager = new NovelRoomManager();

module.exports = {
  // 兼容旧接口
  initializeNovel: (io) => novelRoomManager.initializeTestRooms(io),
  getNovelState: (roomId = 'room1') => {
    const room = novelRoomManager.getRoom(roomId);
    return room ? room.getNovelState() : null;
  },
  addVote: (userId, choice, roomId = 'room1', coinsSpent = 0) => {
    const room = novelRoomManager.getRoom(roomId);
    return room ? room.addVote(userId, choice, coinsSpent) : { success: false, message: '房间不存在' };
  },
  
  // 讨论区相关接口
  addDiscussionMessage: (userId, username, message, roomId) => {
    const room = novelRoomManager.getRoom(roomId);
    return room ? room.addDiscussionMessage(userId, username, message) : { success: false, message: '房间不存在' };
  },
  getDiscussionMessages: (roomId) => {
    const room = novelRoomManager.getRoom(roomId);
    return room ? room.getDiscussionMessages() : [];
  },
  
  // 新的房间管理接口
  createRoom: (roomId, title, templateData) => novelRoomManager.createRoom(roomId, title, templateData),
  getRoom: (roomId) => novelRoomManager.getRoom(roomId),
  getAllRoomsInfo: () => novelRoomManager.getAllRoomsInfo(),
  joinRoom: (userId, roomId) => novelRoomManager.joinRoom(userId, roomId),
  leaveRoom: (userId, roomId) => novelRoomManager.leaveRoom(userId, roomId),
  novelRoomManager
};