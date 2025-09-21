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
      choices: []         // 当前可选项
    };
    
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
   * 初始化投票
   * @param {Array} choices - 可选项数组
   */
  initializeVoting(choices) {
    this.votingState.choices = choices;
    this.votingState.votes = {};
    this.votingState.userVotes = {};
    this.votingState.isVoting = true;
    
    // 为每个选项初始化票数
    choices.forEach(choice => {
      this.votingState.votes[choice] = 0;
    });
  }

  /**
   * 添加投票
   * @param {string} userId - 用户ID
   * @param {string} choice - 选择的选项
   * @param {number} coinsSpent - 消费的金币数量
   * @returns {Object} 投票结果
   */
  addVote(userId, choice, coinsSpent = 0) {
    if (!this.votingState.isVoting) {
      this.logger.logWarning('当前不在投票阶段');
      return { success: false, message: '当前不在投票阶段' };
    }

    if (!this.votingState.choices.includes(choice)) {
      return { success: false, message: '无效的选项' };
    }

    // 验证金币数量
    if (coinsSpent < 0 || !Number.isInteger(coinsSpent)) {
      return { success: false, message: '金币数量无效' };
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
    this.logger.logVoting(`用户 ${userId} 投票: ${choice} (使用${coinsSpent}金币，总计${totalVotes}票)`);

    const message = coinsSpent > 0 
      ? `投票成功！使用${coinsSpent}金币，总计${totalVotes}票` 
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
        maxVotes: 0,
        coinDeductions: []
      };
    }

    this.logger.logVoting(`投票结果: ${winningChoice} (${maxVotes}票)`);

    // 收集需要扣除金币的用户信息
    const coinDeductions = [];
    for (const [userId, userVote] of Object.entries(this.votingState.userVotes)) {
      if (userVote.coinsSpent > 0) {
        coinDeductions.push({
          userId,
          amount: userVote.coinsSpent,
          choice: userVote.choice,
          totalVotes: userVote.totalVotes
        });
      }
    }

    return {
      needExtension: false,
      winningChoice,
      maxVotes,
      coinDeductions,
      votes: { ...this.votingState.votes },
      userVotes: { ...this.votingState.userVotes }
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
   * 获取投票状态
   * @returns {Object} 当前投票状态
   */
  getVotingState() {
    return {
      ...this.votingState,
      timeRemaining: this.votingState.votingEndTime ? 
        Math.max(0, this.votingState.votingEndTime - Date.now()) : 0
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