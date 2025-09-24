/**
 * 投票管理器
 * 负责处理房间内的投票逻辑，包括投票添加、统计、计时器管理等
 */
class VotingManager {
  constructor(roomId, logger) {
    this.roomId = roomId;
    this.logger = logger;
    
    // 投票状态
    this.votingState = {
      isVoting: false,
      votingEndTime: null,
      votes: {},          // 选项 -> 票数的映射
      userVotes: {},      // 用户ID -> 投票详情的映射
      choices: [],        // 当前可选项
      customOptions: [],  // 用户添加的自定义选项
      customOptionCosts: [10, 20, 30, 50, 100] // 自定义选项的金币递增列表
    };
    
    // 金币消费记录（用于故事生成失败时退款）
    this.coinSpendingRecords = [];
    
    this.votingTimer = null;
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
   * 立即扣除用户金币并记录
   * @param {string} userId - 用户ID
   * @param {number} amount - 扣除金币数量
   * @param {string} reason - 扣除原因
   * @param {string} socketId - Socket ID
   * @returns {boolean} 扣除是否成功
   */
  async deductCoinsImmediately(userId, amount, reason, socketId) {
    try {
      const { readUsers, writeUsers } = require('../../../utils/fileUtils');
      
      const users = readUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        this.logger.logWarning(`用户 ${userId} 不存在`);
        return false;
      }
      
      const currentCoins = users[userIndex].coins || 0;
      if (currentCoins < amount) {
        this.logger.logWarning(`用户 ${userId} 金币不足，无法扣除 ${amount} 金币 (当前: ${currentCoins})`);
        return false;
      }
      
      // 扣除金币
      users[userIndex].coins = currentCoins - amount;
      users[userIndex].updatedAt = new Date().toISOString();
      writeUsers(users);
      
      // 记录消费
      this.coinSpendingRecords.push({
        userId,
        socketId,
        amount,
        reason,
        timestamp: new Date().toISOString()
      });
      
      this.logger.logVoting(`用户 ${userId} 立即扣除 ${amount} 金币 (${reason})`);
      
      // 通知前端用户金币变化
      if (this.io && socketId) {
        this.io.to(socketId).emit('coins_deducted', {
          amount,
          remainingCoins: users[userIndex].coins,
          reason
        });
      }
      
      return true;
    } catch (error) {
      this.logger.logError(`扣除用户 ${userId} 金币失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 故事生成失败时退还金币
   * @returns {boolean} 退款是否成功
   */
  async refundCoinsOnStoryFailure() {
    try {
      const { readUsers, writeUsers } = require('../../../utils/fileUtils');
      
      if (this.coinSpendingRecords.length === 0) {
        this.logger.logVoting('没有需要退款的金币消费记录');
        return true;
      }
      
      const users = readUsers();
      let refundCount = 0;
      
      for (const record of this.coinSpendingRecords) {
        const userIndex = users.findIndex(u => u.id === record.userId);
        
        if (userIndex !== -1) {
          // 退还金币
          users[userIndex].coins = (users[userIndex].coins || 0) + record.amount;
          users[userIndex].updatedAt = new Date().toISOString();
          
          this.logger.logVoting(`用户 ${record.userId} 退还 ${record.amount} 金币 (故事生成失败: ${record.reason})`);
          
          // 通知前端用户金币变化
          if (this.io && record.socketId) {
            this.io.to(record.socketId).emit('coins_refunded', {
              amount: record.amount,
              remainingCoins: users[userIndex].coins,
              reason: `故事生成失败，退还: ${record.reason}`
            });
          }
          
          refundCount++;
        } else {
          this.logger.logWarning(`用户 ${record.userId} 不存在，无法退还金币`);
        }
      }
      
      // 保存用户数据
      writeUsers(users);
      
      // 清空消费记录
      this.coinSpendingRecords = [];
      
      this.logger.logVoting(`故事生成失败，成功退还 ${refundCount} 个用户的金币`);
      return true;
    } catch (error) {
      this.logger.logError(`退还金币失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 初始化投票
   * @param {Array} choices - 可选项数组
   */
  initializeVoting(choices) {
    this.votingState.choices = choices;
    this.votingState.votes = {};
    this.votingState.userVotes = {};
    this.votingState.isVoting = true;
    this.votingState.customOptions = []; // 重置自定义选项
    this.coinSpendingRecords = []; // 重置金币消费记录
    
    // 为每个选项初始化票数
    choices.forEach(choice => {
      this.votingState.votes[choice] = 0;
    });
  }

  /**
   * 添加自定义选项
   * @param {string} userId - 用户ID
   * @param {string} customOption - 自定义选项内容
   * @param {string} socketId - Socket ID
   * @returns {Object} 添加结果
   */
  async addCustomOption(userId, customOption, socketId = null) {
    if (!this.votingState.isVoting) {
      return { success: false, message: '当前不在投票阶段' };
    }

    // 检查自定义选项是否已达到最大数量
    const currentCustomCount = this.votingState.customOptions.length;
    if (currentCustomCount >= this.votingState.customOptionCosts.length) {
      return { success: false, message: '自定义选项已达到最大数量' };
    }

    // 检查选项是否重复
    const allOptions = [...this.votingState.choices, ...this.votingState.customOptions.map(opt => opt.content)];
    if (allOptions.includes(customOption)) {
      return { success: false, message: '选项内容重复' };
    }

    // 获取当前需要的金币数量
    const requiredCoins = this.votingState.customOptionCosts[currentCustomCount];

    // 立即扣除金币
    const deductionSuccess = await this.deductCoinsImmediately(
      userId, 
      requiredCoins, 
      `添加自定义选项: ${customOption}`,
      socketId
    );

    if (!deductionSuccess) {
      return { success: false, message: '金币不足或扣费失败' };
    }

    // 创建自定义选项对象
    const customOptionObj = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: customOption,
      addedBy: userId,
      requiredCoins,
      timestamp: new Date().toISOString()
    };

    // 添加到自定义选项列表
    this.votingState.customOptions.push(customOptionObj);

    // 为新选项初始化票数
    this.votingState.votes[customOption] = 0;

    this.logger.logVoting(`用户 ${userId} 添加自定义选项: ${customOption} (已扣除${requiredCoins}金币)`);

    // 使用现有的extendVoting方法重置投票时间
    const resetDuration = 60 * 1000; // 1分钟
    this.extendVoting(resetDuration, this.onVotingEnd);

    // 重写广播消息为更准确的描述
    if (this.io) {
      this.io.to(this.roomId).emit('voting_time_reset', {
        endTime: this.votingState.votingEndTime,
        message: '有用户添加了自定义选项，投票时间已重置'
      });
    }

    return {
      success: true,
      customOption: customOptionObj,
      requiredCoins,
      message: `成功添加自定义选项，已扣除${requiredCoins}金币，投票时间已重置`
    };
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
    if (!this.votingState.isVoting) {
      this.logger.logWarning('当前不在投票阶段');
      return { success: false, message: '当前不在投票阶段' };
    }

    // 检查是否为有效选项（包括自定义选项）
    const allOptions = [...this.votingState.choices, ...this.votingState.customOptions.map(opt => opt.content)];
    if (!allOptions.includes(choice)) {
      return { success: false, message: '无效的选项' };
    }

    // 验证金币数量
    if (coinsSpent < 0 || !Number.isInteger(coinsSpent)) {
      return { success: false, message: '金币数量无效' };
    }

    // 如果需要消费金币，立即扣除
    if (coinsSpent > 0) {
      const deductionSuccess = await this.deductCoinsImmediately(
        userId, 
        coinsSpent, 
        `投票: ${choice}`,
        socketId
      );

      if (!deductionSuccess) {
        return { success: false, message: '金币不足或扣费失败' };
      }
    }

    // 移除用户之前的投票（如果有的话）
    const previousVote = this.votingState.userVotes[userId];
    if (previousVote && this.votingState.votes[previousVote.choice] !== undefined) {
      this.votingState.votes[previousVote.choice] -= previousVote.totalVotes;
    }

    // 计算总投票数：默认1票 + 金币票数
    const totalVotes = 1 + coinsSpent;
    
    // 记录新投票
    this.votingState.userVotes[userId] = {
      choice,
      coinsSpent,
      totalVotes,
      timestamp: new Date().toISOString()
    };
    
    // 更新选项的总票数
    this.votingState.votes[choice] = (this.votingState.votes[choice] || 0) + totalVotes;
    
    // 记录投票日志
    this.logger.logVoting(`用户 ${userId} 投票: ${choice} (已扣除${coinsSpent}金币，总计${totalVotes}票)`);

    const message = coinsSpent > 0 
      ? `投票成功！已扣除${coinsSpent}金币，总计${totalVotes}票` 
      : '投票成功！使用基础投票权（1票）';

    return { 
      success: true, 
      votes: this.votingState.votes,
      userVote: this.votingState.userVotes[userId],
      message
    };
  }

  /**
   * 开始投票计时器
   * @param {number} duration - 投票持续时间（毫秒）
   * @param {Function} onVotingEnd - 投票结束回调函数
   */
  startVotingTimer(duration, onVotingEnd) {
    this.votingState.votingEndTime = Date.now() + duration;
    this.onVotingEnd = onVotingEnd; // 保存回调函数

    if (this.votingTimer) {
      clearTimeout(this.votingTimer);
    }

    this.votingTimer = setTimeout(async () => {
      const result = this.processVotingResult();
      if (onVotingEnd) {
        await onVotingEnd(result);
      }
    }, duration);

    // 广播投票开始到房间
    if (this.io) {
      this.io.to(this.roomId).emit('voting_started', {
        endTime: this.votingState.votingEndTime,
        choices: this.votingState.choices,
        customOptions: this.votingState.customOptions,
        customOptionCosts: this.votingState.customOptionCosts,
        discussionActive: true
      });
    }
  }

  /**
   * 处理投票结果
   * @returns {Object} 投票结果信息
   */
  processVotingResult() {
    this.votingState.isVoting = false;
    
    // 统计投票结果
    let winningChoice = '';
    let maxVotes = 0;
    
    for (const [choice, votes] of Object.entries(this.votingState.votes)) {
      if (votes > maxVotes) {
        maxVotes = votes;
        winningChoice = choice;
      }
    }

    // 如果没有投票，返回需要延长的信号
    if (maxVotes === 0) {
      return {
        needExtension: true,
        winningChoice: this.votingState.choices[0],
        maxVotes: 0
      };
    }

    this.logger.logVoting(`投票结果: ${winningChoice} (${maxVotes}票)`);

    return {
      needExtension: false,
      winningChoice,
      maxVotes,
      votes: { ...this.votingState.votes },
      userVotes: { ...this.votingState.userVotes },
      customOptions: [...this.votingState.customOptions],
      coinSpendingRecords: [...this.coinSpendingRecords] // 返回消费记录供外部使用
    };
  }

  /**
   * 延长投票时间
   * @param {number} extensionDuration - 延长时间（毫秒）
   * @param {Function} onVotingEnd - 投票结束回调函数
   */
  extendVoting(extensionDuration, onVotingEnd) {
    this.votingState.isVoting = true;
    this.startVotingTimer(extensionDuration, onVotingEnd);
    
    if (this.io) {
      this.io.to(this.roomId).emit('voting_extended', {
        message: '没有人投票，投票时间延长5分钟',
        endTime: this.votingState.votingEndTime
      });
    }
  }

  /**
   * 重置投票状态
   */
  resetVoting() {
    this.votingState.votes = {};
    this.votingState.userVotes = {};
    this.votingState.isVoting = false;
    this.votingState.votingEndTime = null;
    
    if (this.votingTimer) {
      clearTimeout(this.votingTimer);
      this.votingTimer = null;
    }
  }

  /**
   * 故事生成成功后清理消费记录
   */
  clearCoinSpendingRecords() {
    this.coinSpendingRecords = [];
    this.logger.logVoting('故事生成成功，清理金币消费记录');
  }

  /**
   * 获取投票状态
   * @returns {Object} 当前投票状态
   */
  getVotingState() {
    return {
      ...this.votingState,
      timeRemaining: this.votingState.votingEndTime ? 
        Math.max(0, this.votingState.votingEndTime - Date.now()) : 0,
      availableCustomOptionSlots: Math.max(0, this.votingState.customOptionCosts.length - this.votingState.customOptions.length),
      nextCustomOptionCost: this.votingState.customOptions.length < this.votingState.customOptionCosts.length ? 
        this.votingState.customOptionCosts[this.votingState.customOptions.length] : null
    };
  }

  /**
   * 检查是否在投票中
   * @returns {boolean} 是否在投票中
   */
  isVoting() {
    return this.votingState.isVoting;
  }

  /**
   * 获取用户投票信息
   * @param {string} userId - 用户ID
   * @returns {Object|null} 用户投票信息
   */
  getUserVote(userId) {
    return this.votingState.userVotes[userId] || null;
  }

  /**
   * 获取选项票数
   * @param {string} choice - 选项
   * @returns {number} 票数
   */
  getChoiceVotes(choice) {
    return this.votingState.votes[choice] || 0;
  }

  /**
   * 获取所有可选项（包括自定义选项）
   * @returns {Array} 所有可选项数组
   */
  getAllChoices() {
    return [...this.votingState.choices, ...this.votingState.customOptions.map(opt => opt.content)];
  }

  /**
   * 检查是否可以添加自定义选项
   * @returns {Object} 检查结果
   */
  canAddCustomOption() {
    const currentCount = this.votingState.customOptions.length;
    const maxCount = this.votingState.customOptionCosts.length;
    
    return {
      canAdd: currentCount < maxCount && this.votingState.isVoting,
      requiredCoins: currentCount < maxCount ? this.votingState.customOptionCosts[currentCount] : null,
      remainingSlots: Math.max(0, maxCount - currentCount)
    };
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (this.votingTimer) {
      clearTimeout(this.votingTimer);
      this.votingTimer = null;
    }
  }
}

module.exports = VotingManager;