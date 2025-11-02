const templateService = require('../../templateService');
const ttsService = require('../../ttsService');
const imageService = require('../../imageService');
const fs = require('fs');
const path = require('path');

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
    
    // TTS配置
    this.enableTTS = true; // 默认启用TTS
  }

  /**
   * 生成初始故事
   * @param {Function} onAudioReady - 音频生成完成的回调函数（可选）
   * @param {Function} onImageReady - 图片生成完成的回调函数（可选）
   * @returns {Promise<Object>} 包含story和choices的对象
   */
  async generateInitialStory(onAudioReady = null, onImageReady = null) {
    if (!this.templateData || !this.templateData.promptTemplate) {
      throw new Error('模板数据缺失，无法生成故事');
    }
    
    const role = this.templateData.promptTemplate.systemPrompt;
    const prompt = templateService.generateInitialPrompt(this.templateData);
    
    this.logger.logPrompt(prompt);

    try {
      let response;
      if(false){
        response = await this.callWithRetry(async () => {
          return await this.aiClient.generateContent(role, prompt);
        });
      }else{
        //调试模式：从固定文件读取示例作为响应
        const responsePath = path.join(__dirname, 'response1.txt');
        response = fs.readFileSync(responsePath, 'utf-8');
      }
      this.logger.logResponse(response);
      return this.processResponse(response, onAudioReady, onImageReady);
    } catch (error) {
      this.logger.logError(`生成初始故事失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 继续故事
   * @param {string} selectedChoice - 选择的选项
   * @param {Function} onAudioReady - 音频生成完成的回调函数（可选）
   * @param {Function} onImageReady - 图片生成完成的回调函数（可选）
   * @returns {Promise<Object>} 包含story和choices的对象
   */
  async continueStory(selectedChoice, onAudioReady = null, onImageReady = null) {
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
      return this.processResponse(response, onAudioReady, onImageReady);
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
        const response = await promptFunction();
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
   * @param {Function} onAudioReady - 音频生成完成的回调函数（可选）
   * @param {Function} onImageReady - 图片生成完成的回调函数（可选）
   * @returns {Object} 包含story、choices的对象（audioUrl为null，稍后异步生成）
   */
  processResponse(response, onAudioReady = null, onImageReady = null) {
    try {
      const parts = response.split('[');
      if (parts.length < 2) {
        throw new Error('回答格式不正确：缺少选项部分\n${response}');
      }
      
      const story = parts[0].trim();
      if (!story) {
        throw new Error('回答格式不正确：故事内容为空\n${response}');
      }
      
      const choicesStr = '[' + parts[1];
      let choices;
      
      try {
        choices = JSON.parse(choicesStr);
      } catch (parseError) {
        throw new Error(`回答格式不正确：选项JSON解析失败 - ${parseError.message}\n${response}`);
      }
      
      if (!Array.isArray(choices) || choices.length === 0) {
        throw new Error('回答格式不正确：选项格式无效或为空\n${response}');
      }
      
      // 验证选项内容
      for (let i = 0; i < choices.length; i++) {
        if (typeof choices[i] !== 'string' || choices[i].trim().length === 0) {
          throw new Error(`回答格式不正确：选项${i + 1}为空或格式无效\n${response}`);
        }
      }
      
      // 异步生成TTS音频（不阻塞主流程）
      if (this.enableTTS) {
        this.logger.logInfo('开始异步生成故事音频...');
        
        // 使用 setImmediate 或 Promise 异步执行
        setImmediate(async () => {
          try {
            const ttsResult = await ttsService.textToSpeech(story);
            
            if (ttsResult.success) {
              this.logger.logSuccess(`故事音频生成成功: ${ttsResult.fileName}`);
              
              // 如果提供了回调函数，调用它通知音频已准备好
              if (onAudioReady && typeof onAudioReady === 'function') {
                onAudioReady(ttsResult.relativePath);
              }
            } else {
              this.logger.logError(`故事音频生成失败: ${ttsResult.error}`);
            }
          } catch (ttsError) {
            // TTS失败不应该影响故事生成
            this.logger.logError(`TTS服务异步生成异常: ${ttsError.message}`);
          }
        });
      }
      
      // 异步生成图片提示词和图片（不阻塞主流程）
      setImmediate(async () => {
        try {
          const imagePrompts = await this.generateImagePrompts(story);
          
          // 如果生成了图片提示词，调用图片生成服务
          if (imagePrompts && imagePrompts.length > 0 && onImageReady) {
            this.logger.logInfo('开始生成故事配图...');
            
            // 调试模式：只生成前4张图片
            const maxImages = 4;
            
            // 提取提示词数组
            const promptTexts = imagePrompts.map(item => item.prompt);
            
            await imageService.generateImages(
              promptTexts, 
              (progress) => {
                // 每张图片生成完成时的回调
                if (progress.status === 'image_ready') {
                  this.logger.logSuccess(`图片 ${progress.index + 1}/${progress.total} 生成完成`);
                  
                  // 获取对应的文段
                  const paragraphData = imagePrompts[progress.index];
                  
                  // 通知外部（NovelRoom）有新图片
                  if (onImageReady && typeof onImageReady === 'function') {
                    onImageReady({
                      index: progress.index,
                      total: progress.total,
                      imageUrl: progress.imageUrl,
                      prompt: progress.prompt,
                      paragraph: paragraphData ? paragraphData.paragraph : '' // 对应的文段
                    });
                  }
                }
              },
              maxImages // 限制生成数量
            );
            
            this.logger.logSuccess('所有故事配图生成完成');
          }
        } catch (error) {
          // 图片生成失败不应该影响故事生成
          this.logger.logError(`图片生成异常: ${error.message}`);
        }
      });
      
      // 立即返回故事和选项，不等待音频生成
      return { story, choices, audioUrl: null };
    } catch (error) {
      this.logger.logError(`处理回答失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成图片提示词（异步，不阻塞主流程）
   * @param {string} story - 故事内容
   * @param {number} maxRetries - 最大重试次数
   */
  async generateImagePrompts(story, maxRetries = 5) {
    this.logger.logInfo('开始生成图片提示词...');
    
    const systemPrompt = '你是一个专业的文生图提示词生成助手。';
    const userPrompt = `${story}\n\n以上小说片段，请用一系列图片表达小说的内容。对于每张图片，你需要：
1. 提取对应的故事文段（原文）
2. 生成该场景的文生图提示词

返回JSON格式数组，每个元素包含：
- "paragraph": 对应的故事文段（直接从原文中提取）
- "prompt": 该场景的文生图提示词（可以使用中文，要详细描述画面）

格式示例：
[
  {
    "paragraph": "李明走进了黑暗的森林，周围传来奇怪的声音。",
    "prompt": "黑暗森林，月光透过树叶，神秘氛围，电影感"
  },
  {
    "paragraph": "突然，一只巨大的生物出现在他面前。",
    "prompt": "巨大怪物特写，恐怖气氛，逆光，阴影效果"
  }
]

只输出JSON数组，不要其他文字。`;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 调用AI生成图片提示词
        let response;
        if(false){
          response = await this.aiClient.generateContent(systemPrompt, userPrompt);
        }else{
          //调试模式：从固定文件读取示例作为响应
          const responsePath = path.join(__dirname, 'response2.txt');
          response = fs.readFileSync(responsePath, 'utf-8');
        }
        
        // 尝试解析JSON
        const imagePrompts = this.parseImagePrompts(response);
        
        if (imagePrompts && imagePrompts.length > 0) {
          this.logger.log(`response`, `图片提示词生成成功（第${attempt}次尝试）`, imagePrompts);
          return imagePrompts;
        } else {
          this.logger.logError(`第${attempt}次尝试解析失败: 解析结果为空`);
        }
        
      } catch (error) {
        this.logger.logError(`第${attempt}次尝试生成图片提示词失败: ${error.message}`);
        
        if (attempt === maxRetries) {
          this.logger.logError('所有重试都失败了，放弃生成图片提示词');
          return null;
        }
        
        // 等待一段时间再重试
        //await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return null;
  }

  /**
   * 解析AI返回的图片提示词
   * @param {string} response - AI的原始回答
   * @returns {Array|null} 图片提示词数组，解析失败返回null
   * 返回格式：[{paragraph: "文段", prompt: "提示词"}, ...]
   */
  parseImagePrompts(response) {
    try {
      // 尝试直接解析
      let parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        // 验证数据格式
        const isValid = parsed.every(item => 
          item && typeof item === 'object' && 
          item.paragraph && item.prompt
        );
        if (isValid) {
          return parsed;
        }
      }
      
      // 如果不是数组，可能外面还有其他文本
      throw new Error('直接解析不是有效格式');
      
    } catch (error) {
      // 尝试提取JSON数组
      try {
        // 查找 [ 和 ] 之间的内容
        const match = response.match(/\[([\s\S]*)\]/);
        if (match) {
          const jsonStr = '[' + match[1] + ']';
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // 验证数据格式
            const isValid = parsed.every(item => 
              item && typeof item === 'object' && 
              item.paragraph && item.prompt
            );
            if (isValid) {
              return parsed;
            }
          }
        }
      } catch (extractError) {
        this.logger.logError(`提取JSON失败: ${extractError.message}`);
      }
      
      // 尝试从markdown代码块中提取
      try {
        const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        if (codeBlockMatch) {
          const parsed = JSON.parse(codeBlockMatch[1].trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            // 验证数据格式
            const isValid = parsed.every(item => 
              item && typeof item === 'object' && 
              item.paragraph && item.prompt
            );
            if (isValid) {
              return parsed;
            }
          }
        }
      } catch (codeBlockError) {
        this.logger.logError(`从代码块提取失败: ${codeBlockError.message}`);
      }
      
      return null;
    }
  }

  /**
   * 添加故事到历史记录
   * @param {string} story - 故事内容
   * @param {string} winningChoice - 获胜选项
   * @param {Object} votes - 投票结果
   * @param {Object} userVotes - 用户投票详情
   * @param {Array} discussion - 讨论记录
   * @param {string|null} audioUrl - 音频URL
   * @param {Array} images - 图片列表
   */
  addToHistory(story, winningChoice, votes, userVotes, discussion, audioUrl = null, images = []) {
    const historyEntry = {
      story,
      winningChoice,
      votes: { ...votes },
      userVotes: { ...userVotes },
      discussion: [...discussion],
      audioUrl: audioUrl || null,
      images: images ? [...images] : [],
      timestamp: new Date().toISOString()
    };
    
    this.storyHistory.push(historyEntry);
    
    this.logger.logInfo(`故事已添加到历史记录，当前历史长度: ${this.storyHistory.length}, 包含${images?.length || 0}张图片`);
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