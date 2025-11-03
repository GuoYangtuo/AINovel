const HtmlLogger = require('./HtmlLogger');
const AIClient = require('../aiService');
const VotingManager = require('./RoomComponents/VotingManager');
const DiscussionManager = require('./RoomComponents/DiscussionManager');
const StoryGenerator = require('./RoomComponents/StoryGenerator');
const RoomDataManager = require('./RoomDataManager');

/**
 * 单个小说房间类
 * 管理单个房间的基本状态，协调各个组件的工作
 */
class NovelRoom {
  constructor(roomId, title = '未命名小说', templateData, dataManager = null) {
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
    
    // 数据持久化管理器
    this.dataManager = dataManager || new RoomDataManager();
    
    // 简化的房间状态，主要状态由各组件管理
    this.roomState = {
      currentStory: '',
      isActive: false,
      currentImages: [] // 当前故事的图片列表
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
   * 保存房间数据到文件
   */
  saveRoomData() {
    try {
      const roomData = this.dataManager.exportRoomData(this);
      this.dataManager.saveRoomData(this.roomId, roomData);
      this.logger.logInfo(`房间 ${this.roomId} 数据已保存`);
    } catch (error) {
      this.logger.logError(`保存房间 ${this.roomId} 数据失败: ${error.message}`);
    }
  }

  /**
   * 从保存的数据中恢复房间状态
   * @param {Object} savedData - 保存的房间数据
   */
  restoreFromSavedData(savedData) {
    try {
      // 恢复房间基本信息
      this.title = savedData.title || this.title;
      this.createdAt = savedData.createdAt ? new Date(savedData.createdAt) : this.createdAt;
      
      // 恢复房间状态
      this.roomState.currentStory = savedData.currentStory || '';
      this.roomState.currentAudioUrl = savedData.currentAudioUrl || null;
      this.roomState.isActive = savedData.isActive || false;
      this.roomState.currentImages = savedData.currentImages || [];
      
      // 恢复故事历史
      if (savedData.storyHistory && Array.isArray(savedData.storyHistory)) {
        this.storyGenerator.storyHistory = savedData.storyHistory;
      }
      
      // 恢复投票状态
      if (savedData.votingState) {
        this.votingManager.votingState = {
          ...this.votingManager.votingState,
          ...savedData.votingState
        };
      }
      
      // 恢复讨论区状态
      if (savedData.discussionState) {
        this.discussionManager.discussionState.messages = savedData.discussionState.messages || [];
        this.discussionManager.discussionState.isActive = savedData.discussionState.isActive || false;
      }
      
      this.logger.logSuccess(`房间 ${this.roomId} 状态已从保存的数据中恢复`);
    } catch (error) {
      this.logger.logError(`恢复房间 ${this.roomId} 状态失败: ${error.message}`);
    }
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
      
      // 创建音频准备就绪的回调函数
      const onAudioReady = (audioUrl) => {
        this.roomState.currentAudioUrl = audioUrl;
        this.logger.logSuccess(`房间 ${this.roomId} 音频已准备好: ${audioUrl}`);
        
        // 广播音频URL更新
        if (this.io) {
          this.io.to(this.roomId).emit('audio_ready', {
            audioUrl: audioUrl,
            storyIndex: this.storyGenerator.getHistory().length + 1
          });
        }
        
        // 音频生成后保存数据
        this.saveRoomData();
      };
      
      // 创建图片准备就绪的回调函数
      const onImageReady = (imageData) => {
        this.logger.logSuccess(`房间 ${this.roomId} 图片已准备好: ${imageData.index + 1}/${imageData.total}`);
        
        // 添加到当前图片列表
        const imageInfo = {
          index: imageData.index,
          imageUrl: imageData.imageUrl,
          prompt: imageData.prompt,
          paragraph: imageData.paragraph || '', // 对应的文段
          timestamp: new Date().toISOString()
        };
        
        this.roomState.currentImages.push(imageInfo);
        
        // 广播新图片到前端
        if (this.io) {
          this.io.to(this.roomId).emit('image_ready', {
            ...imageInfo,
            storyIndex: this.storyGenerator.getHistory().length + 1
          });
        }
        
        // 图片生成后保存数据
        this.saveRoomData();
      };
      
      // 使用故事生成器生成初始故事（传入音频和图片回调）
      const processed = await this.storyGenerator.generateInitialStory(onAudioReady, onImageReady);
      
      // 更新房间状态
      this.roomState.currentStory = processed.story;
      this.roomState.currentAudioUrl = processed.audioUrl; // 初始为null，异步生成
      this.roomState.currentImages = []; // 重置图片列表，等待异步生成
      this.roomState.isActive = true;
      
      // 初始化投票
      this.votingManager.initializeVoting(processed.choices);
      
      // 记录房间状态
      this.logger.logState({
        currentStory: this.roomState.currentStory.substring(0, 200) + '...',
        choices: processed.choices,
        audioUrl: processed.audioUrl,
        isVoting: this.votingManager.isVoting(),
        connectedUsers: this.connectedUsers.size
      });
      
      // 开始投票
      this.startVotingTimer();
      
      // 广播初始状态到房间内的用户
      if (this.io) {
        this.io.to(this.roomId).emit('novel_state', this.getNovelState());
      }
      
      // 保存房间数据
      this.saveRoomData();
      
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
    const result = await this.votingManager.addVote(userId, choice, coinsSpent, socketId);
    
    // 投票后保存数据
    if (result.success) {
      this.saveRoomData();
    }
    
    // 【调试】接收到投票后立即结束投票计时器
    const debugMode = false;
    if (this.votingManager.votingTimer && debugMode) {
      this.logger.logInfo('【调试模式】检测到投票，立即结束计时器');
      
      // 清除计时器
      clearTimeout(this.votingManager.votingTimer);
      this.votingManager.votingTimer = null;
      
      // 手动触发投票结束流程
      const votingResult = this.votingManager.processVotingResult();
      await this.processVotingResult(votingResult);
    }
    
    return result;
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

      // 保存当前故事到历史（包含音频和图片）
      this.storyGenerator.addToHistory(
        this.roomState.currentStory,
        winningChoice,
        votes,
        userVotes,
        archivedDiscussion,
        this.roomState.currentAudioUrl,
        this.roomState.currentImages
      );

      // 创建音频准备就绪的回调函数
      const onAudioReady = (audioUrl) => {
        this.roomState.currentAudioUrl = audioUrl;
        this.logger.logSuccess(`房间 ${this.roomId} 音频已准备好: ${audioUrl}`);
        
        // 广播音频URL更新
        if (this.io) {
          this.io.to(this.roomId).emit('audio_ready', {
            audioUrl: audioUrl,
            storyIndex: this.storyGenerator.getHistory().length + 1
          });
        }
        
        // 音频生成后保存数据
        this.saveRoomData();
      };
      
      // 创建图片准备就绪的回调函数
      const onImageReady = (imageData) => {
        this.logger.logSuccess(`房间 ${this.roomId} 图片已准备好: ${imageData.index + 1}/${imageData.total}`);
        
        // 添加到当前图片列表
        const imageInfo = {
          index: imageData.index,
          imageUrl: imageData.imageUrl,
          prompt: imageData.prompt,
          paragraph: imageData.paragraph || '', // 对应的文段
          timestamp: new Date().toISOString()
        };
        
        this.roomState.currentImages.push(imageInfo);
        
        // 广播新图片到前端
        if (this.io) {
          this.io.to(this.roomId).emit('image_ready', {
            ...imageInfo,
            storyIndex: this.storyGenerator.getHistory().length + 1
          });
        }
        
        // 图片生成后保存数据
        this.saveRoomData();
      };

      // 生成下一段故事（传入音频和图片回调）
      const processed = await this.storyGenerator.continueStory(winningChoice, onAudioReady, onImageReady);

      // 故事生成成功，清理金币消费记录
      this.votingManager.clearCoinSpendingRecords();

      // 更新房间状态
      this.roomState.currentStory = processed.story;
      this.roomState.currentAudioUrl = processed.audioUrl; // 初始为null，异步生成
      this.roomState.currentImages = []; // 重置图片列表，等待异步生成

      // 重新初始化投票
      this.votingManager.initializeVoting(processed.choices);

      // 广播新故事到房间
      if (this.io) {
        this.io.to(this.roomId).emit('story_updated', {
          story: processed.story,
          choices: processed.choices,
          audioUrl: processed.audioUrl, // 初始为null
          winningChoice,
          votes: this.votingManager.getVotingState().votes,
          storyHistory: this.storyGenerator.getHistory(),
        });
      }

      // 开始新的投票
      this.startVotingTimer();
      
      // 新故事生成后保存数据
      this.saveRoomData();

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
    const result = await this.votingManager.addCustomOption(userId, customOption, socketId);
    
    // 添加自定义选项后保存数据
    if (result.success) {
      this.saveRoomData();
    }
    
    return result;
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
      audioUrl: this.roomState.currentAudioUrl, // 包含音频URL
      currentImages: this.roomState.currentImages, // 包含图片列表
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