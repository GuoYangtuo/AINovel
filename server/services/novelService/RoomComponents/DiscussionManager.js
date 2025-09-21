/**
 * 讨论区管理器
 * 负责处理房间内的讨论区功能，包括消息管理、激活状态控制等
 */
class DiscussionManager {
  constructor(roomId, logger) {
    this.roomId = roomId;
    this.logger = logger;
    
    // 讨论区状态
    this.discussionState = {
      messages: [],       // 当前讨论区的消息
      isActive: false,    // 讨论区是否激活（在投票阶段激活）
      maxMessages: 100,   // 最大消息数量
      keepMessages: 50    // 清理时保留的消息数量
    };
    
    this.io = null;
  }

  /**
   * 设置Socket.IO实例
   * @param {Object} io - Socket.IO实例
   */
  setIO(io) {
    this.io = io;
  }

  /**
   * 配置讨论区设置
   * @param {Object} settings - 配置选项
   * @param {number} settings.maxMessages - 最大消息数量
   * @param {number} settings.keepMessages - 清理时保留的消息数量
   */
  configure(settings = {}) {
    if (settings.maxMessages) {
      this.discussionState.maxMessages = settings.maxMessages;
    }
    if (settings.keepMessages) {
      this.discussionState.keepMessages = settings.keepMessages;
    }
  }

  /**
   * 添加讨论区消息
   * @param {string} userId - 用户ID
   * @param {string} username - 用户名
   * @param {string} message - 消息内容
   * @returns {Object} 添加结果
   */
  addMessage(userId, username, message) {
    // 验证讨论区状态
    if (!this.discussionState.isActive) {
      return { success: false, message: '当前讨论区未激活' };
    }

    // 验证消息内容
    const validationResult = this.validateMessage(message);
    if (!validationResult.valid) {
      return { success: false, message: validationResult.error };
    }

    // 创建新消息
    const newMessage = {
      id: this.generateMessageId(),
      userId,
      username,
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    // 添加消息
    this.discussionState.messages.push(newMessage);
    
    // 记录日志（可选，避免日志过多）
    // this.logger.logInfo(`讨论区消息 - ${username}: ${message}`);

    // 限制消息数量，避免内存过多占用
    this.limitMessages();

    // 广播新消息到房间
    if (this.io) {
      this.io.to(this.roomId).emit('discussion_message', newMessage);
    }

    return { 
      success: true, 
      message: newMessage
    };
  }

  /**
   * 验证消息内容
   * @param {string} message - 消息内容
   * @returns {Object} 验证结果
   */
  validateMessage(message) {
    if (!message || typeof message !== 'string') {
      return { valid: false, error: '消息内容不能为空' };
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return { valid: false, error: '消息内容不能为空' };
    }

    if (trimmedMessage.length > 500) {
      return { valid: false, error: '消息长度不能超过500字符' };
    }

    // 可以添加更多验证规则，如敏感词过滤等
    if (this.containsInappropriateContent(trimmedMessage)) {
      return { valid: false, error: '消息包含不当内容' };
    }

    return { valid: true };
  }

  /**
   * 检查消息是否包含不当内容（简单示例）
   * @param {string} message - 消息内容
   * @returns {boolean} 是否包含不当内容
   */
  containsInappropriateContent(message) {
    // 这里可以实现更复杂的内容过滤逻辑
    const inappropriateWords = ['垃圾', '傻逼']; // 示例敏感词
    return inappropriateWords.some(word => message.includes(word));
  }

  /**
   * 生成消息ID
   * @returns {string} 消息ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 限制消息数量
   */
  limitMessages() {
    if (this.discussionState.messages.length > this.discussionState.maxMessages) {
      const messagesToKeep = this.discussionState.keepMessages;
      this.discussionState.messages = this.discussionState.messages.slice(-messagesToKeep);
      
      this.logger.logInfo(`讨论区消息数量超限，保留最近${messagesToKeep}条消息`);
    }
  }

  /**
   * 获取讨论区消息
   * @param {number} limit - 获取消息数量限制（可选）
   * @returns {Array} 消息数组
   */
  getMessages(limit = null) {
    if (limit && limit > 0) {
      return this.discussionState.messages.slice(-limit);
    }
    return [...this.discussionState.messages];
  }

  /**
   * 获取最近的消息
   * @param {number} count - 消息数量
   * @returns {Array} 最近的消息数组
   */
  getRecentMessages(count = 20) {
    return this.discussionState.messages.slice(-count);
  }

  /**
   * 激活讨论区
   */
  activate() {
    this.discussionState.isActive = true;
    this.logger.logInfo('讨论区已激活');
    
    // 广播讨论区激活状态
    if (this.io) {
      this.io.to(this.roomId).emit('discussion_activated', {
        isActive: true,
        messages: this.getRecentMessages()
      });
    }
  }

  /**
   * 关闭讨论区
   */
  deactivate() {
    this.discussionState.isActive = false;
    this.logger.logInfo('讨论区已关闭');
    
    // 广播讨论区关闭状态
    if (this.io) {
      this.io.to(this.roomId).emit('discussion_deactivated', {
        isActive: false
      });
    }
  }

  /**
   * 清空讨论区并归档
   * @returns {Array} 归档的消息
   */
  clearAndArchive() {
    const archivedMessages = [...this.discussionState.messages];
    this.discussionState.messages = [];
    this.discussionState.isActive = false;
    
    this.logger.logInfo(`讨论区已清空，归档了${archivedMessages.length}条消息`);
    
    return archivedMessages;
  }

  /**
   * 删除特定消息
   * @param {string} messageId - 消息ID
   * @param {string} operatorId - 操作者ID（可用于权限验证）
   * @returns {Object} 删除结果
   */
  deleteMessage(messageId, operatorId = null) {
    const messageIndex = this.discussionState.messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) {
      return { success: false, message: '消息不存在' };
    }

    const deletedMessage = this.discussionState.messages[messageIndex];
    
    // 可以添加权限验证逻辑
    // if (operatorId && !this.canDeleteMessage(operatorId, deletedMessage)) {
    //   return { success: false, message: '没有删除权限' };
    // }

    this.discussionState.messages.splice(messageIndex, 1);
    
    this.logger.logInfo(`删除消息: ${messageId} (操作者: ${operatorId})`);
    
    // 广播消息删除事件
    if (this.io) {
      this.io.to(this.roomId).emit('message_deleted', {
        messageId,
        operatorId
      });
    }

    return { 
      success: true, 
      deletedMessage 
    };
  }

  /**
   * 获取讨论区状态
   * @returns {Object} 讨论区状态
   */
  getState() {
    return {
      messages: this.getMessages(),
      isActive: this.discussionState.isActive,
      messageCount: this.discussionState.messages.length,
      recentMessages: this.getRecentMessages(10)
    };
  }

  /**
   * 检查讨论区是否激活
   * @returns {boolean} 是否激活
   */
  isActive() {
    return this.discussionState.isActive;
  }

  /**
   * 获取消息统计信息
   * @returns {Object} 统计信息
   */
  getStatistics() {
    const messages = this.discussionState.messages;
    const userMessageCounts = {};
    
    messages.forEach(msg => {
      userMessageCounts[msg.userId] = (userMessageCounts[msg.userId] || 0) + 1;
    });

    return {
      totalMessages: messages.length,
      uniqueUsers: Object.keys(userMessageCounts).length,
      userMessageCounts,
      isActive: this.discussionState.isActive,
      oldestMessage: messages.length > 0 ? messages[0].timestamp : null,
      newestMessage: messages.length > 0 ? messages[messages.length - 1].timestamp : null
    };
  }

  /**
   * 重置讨论区状态
   */
  reset() {
    this.discussionState.messages = [];
    this.discussionState.isActive = false;
    this.logger.logInfo('讨论区状态已重置');
  }
}

module.exports = DiscussionManager;