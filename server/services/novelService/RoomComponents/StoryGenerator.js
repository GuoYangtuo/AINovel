const templateService = require('../../templateService');

/**
 * 故事生成器
 * 负责处理故事生成相关的逻辑，包括AI调用重试、回答处理等
 */
class StoryGenerator {
  constructor(roomId, templateData, logger, aiClient) {
    this.roomId = roomId;
    this.templateData = templateData;
    this.logger = logger;
    this.aiClient = aiClient;
    
    // 故事历史
    this.storyHistory = [];
  }

  /**
   * 生成初始故事
   * @returns {Promise<Object>} 包含story和choices的对象
   */
  async generateInitialStory() {
    if (!this.templateData || !this.templateData.promptTemplate) {
      throw new Error('模板数据缺失，无法生成故事');
    }
    
    const role = this.templateData.promptTemplate.systemPrompt;
    const prompt = templateService.generateInitialPrompt(this.templateData);
    
    this.logger.logPrompt(prompt);

    try {
      const response = await this.callWithRetry(async () => {
        return await this.aiClient.generateContent(role, prompt);
      });
      
      this.logger.logResponse(response);
      return this.processResponse(response);
    } catch (error) {
      this.logger.logError(`生成初始故事失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 继续故事
   * @param {string} selectedChoice - 选择的选项
   * @returns {Promise<Object>} 包含story和choices的对象
   */
  async continueStory(selectedChoice) {
    if (!this.templateData || !this.templateData.promptTemplate) {
      throw new Error('模板数据缺失，无法继续故事');
    }
    
    const role = this.templateData.promptTemplate.systemPrompt;
    const prompt = templateService.generateContinuePrompt(
      this.templateData, 
      this.storyHistory, 
      selectedChoice
    );
    
    this.logger.logPrompt(prompt);

    try {
      const response = await this.callWithRetry(async () => {
        return await this.aiClient.generateContent(role, prompt);
      });
      
      this.logger.logResponse(response);
      return this.processResponse(response);
    } catch (error) {
      this.logger.logError(`继续故事失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 带重试机制的AI调用
   * @param {Function} promptFunction - 返回Promise的提示函数
   * @param {number} maxRetries - 最大重试次数
   * @returns {Promise<string>} AI生成的内容
   */
  async callWithRetry(promptFunction, maxRetries = 4) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.logInfo(`第${attempt}次尝试调用AI...`);
        const response = await promptFunction();
        this.logger.logSuccess(`第${attempt}次尝试成功`);
        return response;
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

  /**
   * 处理AI回答，解析故事和选项
   * @param {string} response - AI的原始回答
   * @returns {Object} 包含story和choices的对象
   */
  processResponse(response) {
    try {
      const parts = response.split('[');
      if (parts.length < 2) {
        throw new Error('回答格式不正确：缺少选项部分');
      }
      
      const story = parts[0].trim();
      if (!story) {
        throw new Error('回答格式不正确：故事内容为空');
      }
      
      const choicesStr = '[' + parts[1];
      let choices;
      
      try {
        choices = JSON.parse(choicesStr);
      } catch (parseError) {
        throw new Error(`回答格式不正确：选项JSON解析失败 - ${parseError.message}`);
      }
      
      if (!Array.isArray(choices) || choices.length === 0) {
        throw new Error('回答格式不正确：选项格式无效或为空');
      }
      
      // 验证选项内容
      for (let i = 0; i < choices.length; i++) {
        if (typeof choices[i] !== 'string' || choices[i].trim().length === 0) {
          throw new Error(`回答格式不正确：选项${i + 1}为空或格式无效`);
        }
      }
      
      return { story, choices };
    } catch (error) {
      this.logger.logError(`处理回答失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 添加故事到历史记录
   * @param {string} story - 故事内容
   * @param {string} winningChoice - 获胜选项
   * @param {Object} votes - 投票结果
   * @param {Object} userVotes - 用户投票详情
   * @param {Array} discussion - 讨论记录
   */
  addToHistory(story, winningChoice, votes, userVotes, discussion) {
    const historyEntry = {
      story,
      winningChoice,
      votes: { ...votes },
      userVotes: { ...userVotes },
      discussion: [...discussion],
      timestamp: new Date().toISOString()
    };
    
    this.storyHistory.push(historyEntry);
    
    this.logger.logInfo(`故事已添加到历史记录，当前历史长度: ${this.storyHistory.length}`);
  }

  /**
   * 获取故事历史
   * @returns {Array} 故事历史数组
   */
  getHistory() {
    return [...this.storyHistory];
  }

  /**
   * 获取最近的故事历史
   * @param {number} count - 获取数量
   * @returns {Array} 最近的故事历史
   */
  getRecentHistory(count = 5) {
    return this.storyHistory.slice(-count);
  }

  /**
   * 清空故事历史
   */
  clearHistory() {
    this.storyHistory = [];
    this.logger.logInfo('故事历史已清空');
  }

  /**
   * 获取故事统计信息
   * @returns {Object} 统计信息
   */
  getStatistics() {
    const totalStories = this.storyHistory.length;
    const choiceStats = {};
    let totalVotes = 0;
    
    this.storyHistory.forEach(entry => {
      const choice = entry.winningChoice;
      choiceStats[choice] = (choiceStats[choice] || 0) + 1;
      
      // 统计总投票数
      Object.values(entry.votes).forEach(voteCount => {
        totalVotes += voteCount;
      });
    });

    return {
      totalStories,
      totalVotes,
      averageVotesPerStory: totalStories > 0 ? totalVotes / totalStories : 0,
      choiceStatistics: choiceStats,
      firstStoryTime: totalStories > 0 ? this.storyHistory[0].timestamp : null,
      lastStoryTime: totalStories > 0 ? this.storyHistory[totalStories - 1].timestamp : null
    };
  }

  /**
   * 验证模板数据
   * @returns {boolean} 模板数据是否有效
   */
  validateTemplateData() {
    if (!this.templateData) {
      this.logger.logError('模板数据缺失');
      return false;
    }
    
    if (!this.templateData.promptTemplate) {
      this.logger.logError('模板提示数据缺失');
      return false;
    }
    
    if (!this.templateData.promptTemplate.systemPrompt) {
      this.logger.logError('系统提示词缺失');
      return false;
    }
    
    return true;
  }

  /**
   * 生成故事摘要
   * @param {number} maxLength - 最大长度
   * @returns {string} 故事摘要
   */
  generateStorySummary(maxLength = 200) {
    if (this.storyHistory.length === 0) {
      return '';
    }
    
    const allStories = this.storyHistory.map(entry => entry.story).join(' ');
    
    if (allStories.length <= maxLength) {
      return allStories;
    }
    
    return allStories.substring(0, maxLength - 3) + '...';
  }

  /**
   * 导出故事历史为JSON
   * @returns {string} JSON格式的故事历史
   */
  exportHistoryAsJson() {
    return JSON.stringify({
      roomId: this.roomId,
      templateData: this.templateData,
      storyHistory: this.storyHistory,
      exportTime: new Date().toISOString(),
      statistics: this.getStatistics()
    }, null, 2);
  }

  /**
   * 从JSON导入故事历史
   * @param {string} jsonData - JSON格式的数据
   * @returns {boolean} 导入是否成功
   */
  importHistoryFromJson(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.storyHistory && Array.isArray(data.storyHistory)) {
        this.storyHistory = data.storyHistory;
        this.logger.logSuccess(`成功导入${this.storyHistory.length}条故事历史`);
        return true;
      } else {
        this.logger.logError('导入数据格式不正确');
        return false;
      }
    } catch (error) {
      this.logger.logError(`导入故事历史失败: ${error.message}`);
      return false;
    }
  }
}

module.exports = StoryGenerator;