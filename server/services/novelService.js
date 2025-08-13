const { OpenAI } = require('openai');
const templateService = require('./templateService');

// 旧的硬编码人物数据（仅用于向后兼容，新房间应使用模板系统）
const 人物s = [
  {
    "基本信息": "主人公小叶，一个现代都市的高中生，宅男，比较瘦弱，因为意外，唯一的亲人只剩母亲",
    "性格": "内向，喜欢独处，不善言辞",
    "背景故事": [
      "看起来有点高冷，但有时也会内心戏很多",
      "过去的十几年过着两点一线的普通高中生生活，看起来和别人没什么不一样，在班里没什么存在感",
      "但有一天睡醒突然莫名其妙觉醒了读心术，能听到别人心里在想什么，他一直隐藏着这个能力，但也因此更对世间冷暖看淡，对人际关系不再抱有期待，看起来更加冷漠孤僻了"
    ],
    "人际关系": []
  },
  {
    "基本信息": "小叶的母亲",
    "性格": "很年轻有活力，又有些幽默和乐观，看起来有点天然",
    "背景故事": [
      "过着一个普通的都市家庭主妇的生活"
    ],
    "人际关系": []
  },
  {
    "基本信息": "小叶的同桌小七",
    "性格": "活泼开朗，成绩优异，在班级里很受欢迎",
    "背景故事": [
      "对所有人都很友好",
      "注意到小叶的与众不同，对他产生了好奇",
      "经常主动找小叶说话，但总是得不到太多回应"
    ],
    "人际关系": []
  },
  {
    "基本信息": "神秘的超能力组织的头目",
    "性格": "神出鬼没，有点喜欢玩弄人心",
    "背景故事": [
      "暗中观察着所有超能力者的动向",
      "拥有强大的精神控制能力",
      "表面上经营着一家心理咨询诊所作为掩护"
    ],
    "人际关系": [
      "与多个超能力者保持联系，但从不透露自己的身份",
      "对小叶的能力特别关注，但还未主动接触"
    ]
  },
  {
    "基本信息": "小叶的班主任大刘",
    "性格": "严肃认真，对学生要求严格",
    "背景故事": [
      "对小叶的冷漠态度感到困惑"
    ],
    "人际关系": []
  },
  {
    "基本信息": "小叶的同桌的朋友小晴",
    "性格": "活泼开朗，成绩优异，在班级里很受欢迎",
    "背景故事": [
      "对所有人都很友好",
      "同样也是超能力者，但和小叶并不相识",
      "从属于神秘的超能力组织，经常消失一段时间去完成特殊任务"
    ],
    "人际关系": []
  }
];

// 单个小说房间类
class NovelRoom {
  constructor(roomId, title = '未命名小说', templateData = null) {
    this.roomId = roomId;
    this.title = title;
    this.createdAt = new Date();
    this.connectedUsers = new Set();
    this.templateData = templateData; // 模板数据
    
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
    
    this.io = null;
    this.votingTimer = null;
  }

  // 添加用户到房间
  addUser(userId) {
    this.connectedUsers.add(userId);
  }

  // 移除用户从房间
  removeUser(userId) {
    this.connectedUsers.delete(userId);
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
      console.log(`正在为房间 ${this.roomId} 生成初始故事...`);
      
      const processed = await this.调用AI带重试(async () => {
        return await this.生成初始故事();
      });
      
      console.log(`房间 ${this.roomId} 初始故事生成完成`);
      
      this.novelState.currentStory = processed.story;
      this.novelState.choices = processed.choices;
      this.novelState.isVoting = true;
      this.novelState.votes = {};
      this.novelState.userVotes = {};
      
      this.startVotingTimer();
      
      // 广播初始状态到房间内的用户
      if (this.io) {
        this.io.to(this.roomId).emit('novel_state', this.getNovelState());
      }
      
    } catch (error) {
      console.error(`房间 ${this.roomId} 初始化小说失败:`, error);
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
    let role, prompt;
    
    if (this.templateData && this.templateData.promptTemplate) {
      // 使用模板数据
      role = this.templateData.promptTemplate.systemPrompt;
      prompt = templateService.generateInitialPrompt(this.templateData);
    } else {
      // 使用默认提示词（兼容旧代码）
      role = "你是一个高水平小说作家";
      prompt = `请根据以下信息写一个小说的开头，直到小叶遇到了人生轨迹转折点，面临关键抉择时停下，并给出几个可能的选项供我选择，以主人公的第一视角叙事，
人物：${JSON.stringify(人物s)}
我会给出选择并让你续写。主人公的选择会严重影响他的人生轨迹和整个故事的发展，甚至整个故事的结局和世界的走向都会因为主人公选择的不同而改变，保持一定的叙事节奏，不要提前透露所有世界观设定和人物信息，而是随着故事发展才逐渐揭露信息，选择不同，揭露信息的顺序和程度也不同，故事的发展方向也不同，给出选项即可，无需给出每个选项可能的后续发展
你的输出格式：
{小说正文内容}
["{选项1}","{选项2}","{选项3}"]
用生成的内容替换掉上述格式中大括号包含的部分以及大括号，正文部分不要出现中括号，请完全按照格式输出，不要输出任何无关内容`;
    }

    try {
      const response = await this.client.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: role },
          { role: "user", content: prompt }
        ],
        stream: false
      });
      console.log("生成初始故事的response");
      console.log(response.choices[0].message.content);
      console.log("生成初始故事的response结束");
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('生成初始故事失败:', error);
      throw error;
    }
  }

  // 继续故事
  async 继续故事(选择的选项) {
    let role, prompt;
    
    if (this.templateData && this.templateData.promptTemplate) {
      // 使用模板数据
      role = this.templateData.promptTemplate.systemPrompt;
      prompt = templateService.generateContinuePrompt(this.templateData, this.novelState.storyHistory);
    } else {
      // 使用默认提示词（兼容旧代码）
      role = "你是一个高水平小说作家";
      //获取到之前的故事
      let past_story = ''
      this.novelState.storyHistory.forEach(element => {
        past_story += element.story + '\n\n' + '主人公选择了：' + element.winningChoice + '\n\n'
      }); 
      prompt = `请根据主人公上一次的抉择，续写小说，直到主人公面临新的抉择时停下。
一些信息:
人物：${JSON.stringify(人物s)}
世界观：暂无
之前的故事：${past_story}

主人公的选择会严重影响他的人生轨迹和整个故事的发展，甚至整个故事的结局和世界的走向都会因为主人公选择的不同而改变，保持一定的叙事节奏，不要提前透露所有世界观设定和人物信息，而是随着故事发展才逐渐揭露信息，选择不同，揭露信息的顺序和程度也不同，故事的发展方向也不同，给出选项即可，无需给出每个选项可能的后续发展
你的输出格式：
{小说正文内容}
["{选项1}","{选项2}","{选项3}"]
用生成的内容替换掉上述格式中大括号包含的部分以及大括号，正文部分不要出现中括号，请完全按照格式输出，不要输出任何无关内容`;
    }

    console.log("继续故事的prompt");
    console.log(prompt);
    console.log("继续故事的prompt结束");

    try {
      const response = await this.client.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: role },
          { role: "user", content: prompt }
        ],
        stream: false
      });
      
      console.log("继续故事的response");
      console.log(response.choices[0].message.content);
      console.log("继续故事的response结束");

      return response.choices[0].message.content;
    } catch (error) {
      console.error('继续故事失败:', error);
      throw error;
    }
  }

  // 带重试机制的AI调用
  async 调用AI带重试(promptFunction, maxRetries = 4) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`第${attempt}次尝试调用AI...`);
        const response = await promptFunction();
        const processed = this.处理回答(response);
        console.log(`第${attempt}次尝试成功`);
        return processed;
      } catch (error) {
        console.error(`第${attempt}次尝试失败:`, error.message);
        if (attempt === maxRetries) {
          console.error('所有重试都失败了');
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
      console.error('处理回答失败:', error);
      throw error; // 抛出错误而不是返回默认值
    }
  }

  // 添加投票
  addVote(userId, choice) {
    if (!this.novelState.isVoting) {
      console.log('当前不在投票阶段s');
      return { success: false, message: '当前不在投票阶段' };
    }

    if (!this.novelState.choices.includes(choice)) {
      return { success: false, message: '无效的选项' };
    }

    // 移除用户之前的投票
    const previousVote = this.novelState.userVotes[userId];
    if (previousVote && this.novelState.votes[previousVote]) {
      this.novelState.votes[previousVote]--;
    }

    // 添加新投票
    this.novelState.userVotes[userId] = choice;
    this.novelState.votes[choice] = (this.novelState.votes[choice] || 0) + 1;

    return { 
      success: true, 
      votes: this.novelState.votes,
      message: '投票成功'
    };
  }

  // 开始投票计时器
  startVotingTimer() {
    // 根据模板设置确定投票时长，默认为1分钟
    const VOTING_DURATION = this.templateData?.settings?.votingDuration || (1 * 60 * 1000);
    this.novelState.votingEndTime = Date.now() + VOTING_DURATION;

    if (this.votingTimer) {
      clearTimeout(this.votingTimer);
    }

    this.votingTimer = setTimeout(async () => {
      await this.processVotingResult();
    }, VOTING_DURATION);

    // 广播投票开始到房间
    if (this.io) {
      this.io.to(this.roomId).emit('voting_started', {
        endTime: this.novelState.votingEndTime,
        choices: this.novelState.choices
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
      console.log('没有投票，延长5分钟');
      
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

    console.log(`投票结果: ${winningChoice} (${maxVotes}票)`);

    try {
      // 广播AI生成状态
      if (this.io) {
        this.io.to(this.roomId).emit('story_generating', {
          message: 'AI正在生成新的故事段落，请稍候...',
          winningChoice
        });
      }

      // 保存当前故事到历史
      this.novelState.storyHistory.push({
        story: this.novelState.currentStory,
        winningChoice,
        votes: { ...this.novelState.votes },
        timestamp: new Date().toISOString()
      });

      // 使用重试机制生成下一段故事
      const processed = await this.调用AI带重试(async () => {
        return await this.继续故事(winningChoice);
      });

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
          storyHistory: this.novelState.storyHistory
        });
      }

      // 开始新的投票
      this.startVotingTimer();

    } catch (error) {
      console.error('生成下一段故事失败:', error);
      
      // 如果生成失败，重新开始投票
      this.novelState.isVoting = true;
      this.startVotingTimer();
      
      if (this.io) {
        this.io.to(this.roomId).emit('story_error', {
          message: `故事生成失败: ${error.message}，请重新投票`
        });
      }
    }
  }

  // 获取当前小说状态
  getNovelState() {
    return {
      ...this.novelState,
      timeRemaining: this.novelState.votingEndTime ? 
        Math.max(0, this.novelState.votingEndTime - Date.now()) : 0
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
  createRoom(roomId, title, templateData = null) {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId);
    }

    const room = new NovelRoom(roomId, title, templateData);
    this.rooms.set(roomId, room);
    console.log(`创建新的小说房间: ${roomId} - ${title}`);
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
    console.log(`删除房间: ${roomId}`);
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
        console.log('测试房间1创建成功');
      } else {
        console.log('测试模板未找到，创建默认房间1');
        const room1 = this.createRoom('room1', '小叶的超能力觉醒之路');
        await room1.initializeNovel(io);
      }
      
      // 创建测试房间2，使用奇幻模板
      if (fantasyTemplate) {
        const roomData2 = templateService.createRoomFromTemplate(fantasyTemplate);
        const room2 = this.createRoom('room2', '魔法学院的奇幻冒险', roomData2);
        await room2.initializeNovel(io);
        console.log('测试房间2创建成功');
      } else {
        console.log('奇幻模板未找到，创建默认房间2');
        const room2 = this.createRoom('room2', '魔法学院的奇幻冒险');
        await room2.initializeNovel(io);
      }
      
      console.log('测试房间初始化完成');
    } catch (error) {
      console.error('测试房间初始化失败:', error);
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
  addVote: (userId, choice, roomId = 'room1') => {
    const room = novelRoomManager.getRoom(roomId);
    return room ? room.addVote(userId, choice) : { success: false, message: '房间不存在' };
  },
  
  // 新的房间管理接口
  createRoom: (roomId, title, templateData) => novelRoomManager.createRoom(roomId, title, templateData),
  getRoom: (roomId) => novelRoomManager.getRoom(roomId),
  getAllRoomsInfo: () => novelRoomManager.getAllRoomsInfo(),
  joinRoom: (userId, roomId) => novelRoomManager.joinRoom(userId, roomId),
  leaveRoom: (userId, roomId) => novelRoomManager.leaveRoom(userId, roomId),
  novelRoomManager
};