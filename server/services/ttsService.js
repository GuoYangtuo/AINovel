const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * 文本转语音服务类
 * 基于 GPT-SoVITS TTS API
 */
class TTSService {
  constructor(config = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'http://127.0.0.1:9880/tts',
      refAudioPath: config.refAudioPath || '',
      promptText: config.promptText || '',
      textLang: config.textLang || 'zh',
      promptLang: config.promptLang || 'zh',
      streamingMode: config.streamingMode || false,
      timeout: config.timeout || 300000, // 5分钟超时
      outputDir: config.outputDir || path.join(__dirname, '../public/audio'),
      ...config
    };

    // 确保输出目录存在
    this.ensureOutputDir();
  }

  /**
   * 确保输出目录存在
   */
  async ensureOutputDir() {
    try {
      await fs.mkdir(this.config.outputDir, { recursive: true });
    } catch (error) {
      console.error('创建音频输出目录失败:', error);
    }
  }

  /**
   * 生成音频文件名
   * @param {string} text - 文本内容（用于生成哈希）
   * @returns {string} 文件名
   */
  generateAudioFileName(text) {
    const hash = crypto.createHash('md5').update(text).digest('hex').substring(0, 12);
    const timestamp = Date.now();
    return `tts_${hash}_${timestamp}.wav`;
  }

  /**
   * 文本转语音
   * @param {string} text - 要合成的文本
   * @param {Object} options - 可选配置
   * @returns {Promise<Object>} 结果对象 {success: boolean, audioPath: string, fileName: string, error: string}
   */
  async textToSpeech(text, options = {}) {
    try {
      // 参数验证
      if (!text || text.trim().length === 0) {
        throw new Error('文本内容不能为空');
      }

      // 合并配置
      const requestData = {
        text: text.trim(),
        text_lang: options.textLang || this.config.textLang,
        ref_audio_path: options.refAudioPath || this.config.refAudioPath,
        prompt_text: options.promptText || this.config.promptText,
        prompt_lang: options.promptLang || this.config.promptLang,
        streaming_mode: options.streamingMode || this.config.streamingMode,
        // 支持额外参数
        text_split_method: options.textSplitMethod || 'cut5',
        top_k: options.topK !== undefined ? options.topK : 5,
        top_p: options.topP !== undefined ? options.topP : 1,
        temperature: options.temperature !== undefined ? options.temperature : 1,
        speed_factor: options.speedFactor !== undefined ? options.speedFactor : 1.0
      };

      console.log(`[TTS] 正在生成音频: ${text.substring(0, 50)}...`);
      console.log(`[TTS] API地址: ${this.config.apiUrl}`);

      // 发送请求
      const response = await axios.post(this.config.apiUrl, requestData, {
        responseType: 'arraybuffer',
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // 检查响应状态
      if (response.status === 200) {
        // 生成文件名和路径
        const fileName = this.generateAudioFileName(text);
        const filePath = path.join(this.config.outputDir, fileName);

        // 保存音频文件
        await fs.writeFile(filePath, response.data);

        console.log(`[TTS] ✓ 音频生成成功: ${fileName}`);

        return {
          success: true,
          audioPath: filePath,
          fileName: fileName,
          relativePath: `/audio/${fileName}`, // 用于前端访问
          textLength: text.length,
          error: null
        };
      } else {
        throw new Error(`API返回非200状态码: ${response.status}`);
      }

    } catch (error) {
      console.error('[TTS] ✗ 音频生成失败:', error.message);

      // 错误分类
      let errorMessage = '音频生成失败';
      
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'TTS服务连接失败，请确认服务已启动';
      } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        errorMessage = 'TTS服务请求超时';
      } else if (error.response) {
        errorMessage = `TTS API错误 (${error.response.status}): ${error.response.data || error.message}`;
      } else {
        errorMessage = `TTS错误: ${error.message}`;
      }

      return {
        success: false,
        audioPath: null,
        fileName: null,
        relativePath: null,
        error: errorMessage
      };
    }
  }

  /**
   * 批量文本转语音
   * @param {Array<string>} texts - 文本数组
   * @param {Object} options - 可选配置
   * @returns {Promise<Array>} 结果数组
   */
  async batchTextToSpeech(texts, options = {}) {
    const results = [];
    
    for (let i = 0; i < texts.length; i++) {
      console.log(`[TTS] 批量处理进度: ${i + 1}/${texts.length}`);
      const result = await this.textToSpeech(texts[i], options);
      results.push(result);
      
      // 可选的批次间延迟，避免过载
      if (options.batchDelay && i < texts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, options.batchDelay));
      }
    }
    
    return results;
  }

  /**
   * 检查TTS服务状态
   * @returns {Promise<Object>} 状态信息
   */
  async checkHealth() {
    try {
      // 发送测试请求
      const testText = '测试';
      const result = await this.textToSpeech(testText, { skipSave: true });
      
      if (result.success) {
        // 清理测试文件
        if (result.audioPath) {
          try {
            await fs.unlink(result.audioPath);
          } catch (err) {
            // 忽略清理错误
          }
        }
        
        return {
          status: 'healthy',
          message: 'TTS服务运行正常',
          apiUrl: this.config.apiUrl
        };
      } else {
        return {
          status: 'error',
          message: result.error,
          apiUrl: this.config.apiUrl
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: `TTS服务检查失败: ${error.message}`,
        apiUrl: this.config.apiUrl
      };
    }
  }

  /**
   * 清理过期音频文件
   * @param {number} maxAge - 最大保留时间（毫秒），默认24小时
   * @returns {Promise<number>} 删除的文件数量
   */
  async cleanupOldAudio(maxAge = 24 * 60 * 60 * 1000) {
    try {
      const files = await fs.readdir(this.config.outputDir);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        if (!file.startsWith('tts_') || !file.endsWith('.wav')) {
          continue;
        }

        const filePath = path.join(this.config.outputDir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
          console.log(`[TTS] 已删除过期音频: ${file}`);
        }
      }

      console.log(`[TTS] 清理完成，共删除 ${deletedCount} 个过期音频文件`);
      return deletedCount;
    } catch (error) {
      console.error('[TTS] 清理音频文件失败:', error);
      return 0;
    }
  }

  /**
   * 更新配置
   * @param {Object} newConfig - 新配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[TTS] 配置已更新');
  }

  /**
   * 获取当前配置
   * @returns {Object} 当前配置
   */
  getConfig() {
    return {
      apiUrl: this.config.apiUrl,
      textLang: this.config.textLang,
      promptLang: this.config.promptLang,
      outputDir: this.config.outputDir,
      timeout: this.config.timeout
    };
  }
}

// 创建默认实例
const ttsService = new TTSService();

// 定期清理过期音频（每小时执行一次）
setInterval(() => {
  ttsService.cleanupOldAudio().catch(err => {
    console.error('[TTS] 自动清理失败:', err);
  });
}, 60 * 60 * 1000);

module.exports = ttsService;

