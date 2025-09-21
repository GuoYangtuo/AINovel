const { OpenAI } = require('openai');

/**
 * AI客户端类
 * 专门负责与OpenAI API的交互，只处理底层API调用
 */
class AIClient {
  constructor(config = {}) {
    this.config = {
      apiKey: config.apiKey || "sk-48d5645fd30347fe905e51c2d431113f",
      baseURL: config.baseURL || "https://api.deepseek.com",
      model: config.model || "deepseek-chat",
      ...config
    };
    
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL
    });
  }

  /**
   * 基础的AI内容生成调用
   * @param {string} systemPrompt - 系统提示词
   * @param {string} userPrompt - 用户提示词
   * @param {Object} options - 可选配置
   * @returns {Promise<string>} AI生成的内容
   */
  async generateContent(systemPrompt, userPrompt, options = {}) {
    try {
      const requestConfig = {
        model: options.model || this.config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: false,
        ...options
      };

      const response = await this.client.chat.completions.create(requestConfig);
      
      if (!response.choices || response.choices.length === 0) {
        throw new Error('API响应中没有生成的内容');
      }
      
      return response.choices[0].message.content;
    } catch (error) {
      // 区分不同类型的错误
      if (error.response) {
        // API响应错误
        throw new Error(`API响应错误 (${error.response.status}): ${error.response.data?.error?.message || error.message}`);
      } else if (error.request) {
        // 网络错误
        throw new Error(`网络请求失败: ${error.message}`);
      } else {
        // 其他错误
        throw new Error(`AI调用失败: ${error.message}`);
      }
    }
  }

  /**
   * 多轮对话调用
   * @param {Array} messages - 消息数组
   * @param {Object} options - 可选配置
   * @returns {Promise<string>} AI生成的内容
   */
  async chat(messages, options = {}) {
    try {
      const requestConfig = {
        model: options.model || this.config.model,
        messages,
        stream: false,
        ...options
      };

      const response = await this.client.chat.completions.create(requestConfig);
      
      if (!response.choices || response.choices.length === 0) {
        throw new Error('API响应中没有生成的内容');
      }
      
      return response.choices[0].message.content;
    } catch (error) {
      if (error.response) {
        throw new Error(`API响应错误 (${error.response.status}): ${error.response.data?.error?.message || error.message}`);
      } else if (error.request) {
        throw new Error(`网络请求失败: ${error.message}`);
      } else {
        throw new Error(`AI调用失败: ${error.message}`);
      }
    }
  }

  /**
   * 流式生成内容
   * @param {string} systemPrompt - 系统提示词
   * @param {string} userPrompt - 用户提示词
   * @param {Function} onChunk - 数据块回调函数
   * @param {Object} options - 可选配置
   * @returns {Promise<string>} 完整的生成内容
   */
  async generateContentStream(systemPrompt, userPrompt, onChunk, options = {}) {
    try {
      const requestConfig = {
        model: options.model || this.config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: true,
        ...options
      };

      const stream = await this.client.chat.completions.create(requestConfig);
      let fullContent = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullContent += delta;
          if (onChunk) {
            onChunk(delta, fullContent);
          }
        }
      }

      return fullContent;
    } catch (error) {
      if (error.response) {
        throw new Error(`API响应错误 (${error.response.status}): ${error.response.data?.error?.message || error.message}`);
      } else if (error.request) {
        throw new Error(`网络请求失败: ${error.message}`);
      } else {
        throw new Error(`AI流式调用失败: ${error.message}`);
      }
    }
  }

  /**
   * 获取API状态
   * @returns {Promise<Object>} API状态信息
   */
  async getStatus() {
    try {
      // 发送一个简单的测试请求
      const response = await this.generateContent(
        "你是一个测试助手",
        "请回复'测试成功'",
        { max_tokens: 10 }
      );
      
      return {
        status: 'healthy',
        message: '连接正常',
        testResponse: response
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        testResponse: null
      };
    }
  }

  /**
   * 更新配置
   * @param {Object} newConfig - 新配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // 重新创建client实例
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL
    });
  }

  /**
   * 获取当前配置
   * @returns {Object} 当前配置（隐藏敏感信息）
   */
  getConfig() {
    return {
      baseURL: this.config.baseURL,
      model: this.config.model,
      apiKey: this.config.apiKey ? '***' + this.config.apiKey.slice(-4) : null
    };
  }
}

module.exports = AIClient;