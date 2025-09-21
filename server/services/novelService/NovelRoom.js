const HtmlLogger = require('./HtmlLogger');
const AIClient = require('../aiService');
const VotingManager = require('./RoomComponents/VotingManager');
const DiscussionManager = require('./RoomComponents/DiscussionManager');
const StoryGenerator = require('./RoomComponents/StoryGenerator');

/**
 * 单个小说房间类
 * 管理单个房间的基本状态，协调各个组件的工作
 */
class NovelRoom {
  constructor(roomId, title = '未命名小说', templateData) {
    if (!templateData) {
      throw new Error('templateData is required to create a room');
    }
    
    this.roomId = roomId;
    this.title = title;
    this.createdAt = new Date();
    this.connectedUsers = new Set();
    this.templateData = templateData;
    
    // 初始化组件
    this.logger = new HtmlLogger(roomId);
    this.aiClient = new AIClient();
    this.votingManager = new VotingManager(roomId, this.logger);
    this.discussionManager = new DiscussionManager(roomId, this.logger);
    this.storyGenerator = new StoryGenerator(roomId, templateData, this.logger, this.aiClient);
    
    // 简化的房间状态，主要状态由各组件管理
    this.roomState = {
      currentStory: '',
      isActive: false
    };
    
    this.io = null;
  }

  /**
   * 添加用户到房间
   * @param {string} userId - 用户ID
   */
  addUser(userId) {
    this.connectedUsers.add(userId);
  }

  /**
   * 移除用户从房间
   * @param {string} userId - 用户ID
   */
  removeUser(userId) {
    this.connectedUsers.delete(userId);
  }

  /**
   * 设置Socket.IO实例
   * @param {Object} io - Socket.IO实例
   */
  setIO(io) {
    this.io = io;
    this.votingManager.setIO(io);
    this.discussionManager.setIO(io);
  }

  /**
   * 获取房间信息
   * @returns {Object} 房间基本信息
   */
  getRoomInfo() {
    return {
      roomId: this.roomId,
      title: this.title,
      createdAt: this.createdAt,
      connectedUsers: this.connectedUsers.size,
      currentStory: this.roomState.currentStory ? 
        this.roomState.currentStory.substring(0, 200) + '...' : '',
      isActive: this.roomState.isActive
    };
  }

  /**
   * 初始化小说
   * @param {Object} io - Socket.IO实例
   */
  async initializeNovel(io) {
    this.setIO(io);
    
    try {
      this.logger.logInfo(`正在为房间 ${this.roomId} 生成初始故事...`);
      
      // 使用故事生成器生成初始故事
      const processed = await this.storyGenerator.generateInitialStory();
      
      this.logger.logSuccess(`房间 ${this.roomId} 初始故事生成完成`);
      
      // 更新房间状态
      this.roomState.currentStory = processed.story;
      this.roomState.isActive = true;
      
      // 初始化投票
      this.votingManager.initializeVoting(processed.choices);
      
      // 记录房间状态
      this.logger.logState({
        currentStory: this.roomState.currentStory.substring(0, 200) + '...',
        choices: processed.choices,
        isVoting: this.votingManager.isVoting(),
        connectedUsers: this.connectedUsers.size
      });
      
      // 开始投票
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


  /**
   * 添加投票
   * @param {string} userId - 用户ID
   * @param {string} choice - 选择的选项
   * @param {number} coinsSpent - 消费的金币数量
   * @returns {Object} 投票结果
   */
  addVote(userId, choice, coinsSpent = 0) {
    return this.votingManager.addVote(userId, choice, coinsSpent);
  }

  /**
   * 添加讨论区消息
   * @param {string} userId - 用户ID
   * @param {string} username - 用户名
   * @param {string} message - 消息内容
   * @returns {Object} 添加结果
   */
  addDiscussionMessage(userId, username, message) {
    return this.discussionManager.addMessage(userId, username, message);
  }

  /**
   * 获取当前讨论区消息
   * @returns {Array} 讨论区消息数组
   */
  getDiscussionMessages() {
    return this.discussionManager.getMessages();
  }

  /**
   * 开始投票计时器
   */
  startVotingTimer() {
    // 根据模板设置确定投票时长，默认为1分钟
    const VOTING_DURATION = this.templateData?.settings?.votingDuration || (1 * 60 * 1000);
    
    // 激活讨论区
    this.discussionManager.activate();
    
    // 开始投票计时器，并传入投票结束回调
    this.votingManager.startVotingTimer(VOTING_DURATION, (result) => {
      return this.processVotingResult(result);
    });
  }

  /**
   * 处理投票结果
   * @param {Object} votingResult - 投票结果
   */
  async processVotingResult(votingResult) {
    const { needExtension, winningChoice, maxVotes, coinDeductions, votes, userVotes } = votingResult;

    // 如果需要延长投票时间
    if (needExtension) {
      const extensionDuration = 5 * 60 * 1000; // 5分钟
      this.votingManager.extendVoting(extensionDuration, (result) => {
        return this.processVotingResult(result);
      });
      return;
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
      const archivedDiscussion = this.discussionManager.clearAndArchive();

      // 保存当前故事到历史
      this.storyGenerator.addToHistory(
        this.roomState.currentStory,
        winningChoice,
        votes,
        userVotes,
        archivedDiscussion
      );

      // 生成下一段故事
      const processed = await this.storyGenerator.continueStory(winningChoice);

      // 故事生成成功后，扣除用户金币
      await this.processCoinDeductions(coinDeductions);

      // 更新房间状态
      this.roomState.currentStory = processed.story;

      // 重新初始化投票
      this.votingManager.initializeVoting(processed.choices);

      // 广播新故事到房间
      if (this.io) {
        this.io.to(this.roomId).emit('story_updated', {
          story: processed.story,
          choices: processed.choices,
          winningChoice,
          votes: this.votingManager.getVotingState().votes,
          storyHistory: this.storyGenerator.getHistory(),
          coinDeductions: coinDeductions
        });
      }

      // 开始新的投票
      this.startVotingTimer();

    } catch (error) {
      this.logger.logError(`生成下一段故事失败: ${error.message}`);
      
      // 如果生成失败，重新开始投票（不扣除金币）
      const VOTING_DURATION = this.templateData?.settings?.votingDuration || (1 * 60 * 1000);
      this.votingManager.startVotingTimer(VOTING_DURATION, (result) => {
        return this.processVotingResult(result);
      });
      
      if (this.io) {
        this.io.to(this.roomId).emit('story_error', {
          message: `故事生成失败: ${error.message}，请重新投票`
        });
      }
    }
  }

  /**
   * 处理金币扣除
   * @param {Array} coinDeductions - 需要扣除金币的用户信息
   */
  async processCoinDeductions(coinDeductions) {
    for (const deduction of coinDeductions) {
      try {
        // 这里应该调用认证服务的扣币接口
        // 由于我们在同一个服务内，直接调用文件系统
        const { readUsers, writeUsers } = require('../../utils/fileUtils');
        
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

  /**
   * 获取当前小说状态
   * @returns {Object} 小说状态对象
   */
  getNovelState() {
    const votingState = this.votingManager.getVotingState();
    const discussionState = this.discussionManager.getState();
    
    return {
      // 房间基本状态
      currentStory: this.roomState.currentStory,
      isActive: this.roomState.isActive,
      
      // 投票状态
      ...votingState,
      
      // 讨论区状态
      discussion: discussionState,
      
      // 故事历史
      storyHistory: this.storyGenerator.getHistory()
    };
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.votingManager.cleanup();
    this.discussionManager.reset();
    this.storyGenerator.clearHistory();
  }

  /**
   * 获取房间统计信息
   * @returns {Object} 统计信息
   */
  getStatistics() {
    return {
      roomInfo: this.getRoomInfo(),
      votingStats: this.votingManager.getVotingState(),
      discussionStats: this.discussionManager.getStatistics(),
      storyStats: this.storyGenerator.getStatistics()
    };
  }
}

module.exports = NovelRoom;