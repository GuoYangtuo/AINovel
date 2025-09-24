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
   * @param {string} socketId - Socket ID
   * @returns {Object} 投票结果
   */
  async addVote(userId, choice, coinsSpent = 0, socketId = null) {
    return await this.votingManager.addVote(userId, choice, coinsSpent, socketId);
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
    const { needExtension, winningChoice, maxVotes, votes, userVotes } = votingResult;

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

      // 故事生成成功，清理金币消费记录
      this.votingManager.clearCoinSpendingRecords();

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
        });
      }

      // 开始新的投票
      this.startVotingTimer();

    } catch (error) {
      this.logger.logError(`生成下一段故事失败: ${error.message}`);
      
      // 如果生成失败，退还已扣除的金币
      await this.votingManager.refundCoinsOnStoryFailure();
      
      // 重新开始投票
      const VOTING_DURATION = this.templateData?.settings?.votingDuration || (1 * 60 * 1000);
      this.votingManager.startVotingTimer(VOTING_DURATION, (result) => {
        return this.processVotingResult(result);
      });
      
      if (this.io) {
        this.io.to(this.roomId).emit('story_generation_failed', {
          message: '生成故事失败，已退还金币，投票重新开始',
          error: error.message
        });
      }
    }
  }

  /**
   * 添加自定义选项
   * @param {string} userId - 用户ID
   * @param {string} customOption - 自定义选项内容
   * @param {string} socketId - Socket ID
   * @returns {Object} 添加结果
   */
  async addCustomOption(userId, customOption, socketId = null) {
    return await this.votingManager.addCustomOption(userId, customOption, socketId);
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