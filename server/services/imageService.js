const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * 图片生成服务
 * 使用豆包 SeeDream API 生成图片
 */
class ImageService {
  constructor() {
    // API配置
    this.apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
    this.apiKey = process.env.IMAGE_API_KEY;
    
    // 请求配置
    this.config = {
      model: 'doubao-seedream-4-0-250828',
      size: '2K'
    };
    
    // 图片保存目录
    this.imageDir = path.join(__dirname, '../data/images');
    this.ensureImageDirectory();
  }

  /**
   * 确保图片目录存在
   */
  ensureImageDirectory() {
    if (!fs.existsSync(this.imageDir)) {
      fs.mkdirSync(this.imageDir, { recursive: true });
      console.log(`创建图片目录: ${this.imageDir}`);
    }
  }

  /**
   * 生成单张图片
   * @param {string} prompt - 图片提示词
   * @param {Function} onProgress - 进度回调函数
   * @returns {Promise<Object>} 生成结果
   */
  async generateImage(prompt, onProgress = null) {
    try {
      if (onProgress) {
        onProgress({ status: 'starting', prompt });
      }

      if (process.env.API_ENABLE === 'true') {
        // 正常模式：请求AI生成图片
        const response = await axios.post(
          this.apiUrl,
          {
            model: this.config.model,
            prompt: prompt,
            size: this.config.size
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            },
            timeout: 120000 // 120秒超时
          }
        );

        if (response.status === 200 && response.data && response.data.data) {
          const imageData = response.data.data[0];
          const imageUrl = imageData.url;

          if (onProgress) {
            onProgress({ status: 'completed', prompt, imageUrl });
          }

          console.log(`图片生成成功: ${prompt.substring(0, 50)}...`);

          return {
            success: true,
            imageUrl,
            prompt,
            timestamp: new Date().toISOString()
          };
        } else {
          throw new Error('API返回数据格式不正确');
        }
      } else {
        // 调试模式：使用固定数据，不请求AI
        
        // 模拟延迟
        await this.delay(500);
        
        // 使用固定的图片数据（从room2.json中获取）
        const imageUrl = process.env.IMAGE_URL;
        
        if (onProgress) {
          onProgress({ status: 'completed', prompt, imageUrl });
        }

        console.log(`[调试模式] 图片生成成功: ${prompt.substring(0, 50)}...`);

        return {
          success: true,
          imageUrl,
          prompt,
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      console.error(`图片生成失败 [${prompt.substring(0, 30)}...]:`, error.message);

      if (onProgress) {
        onProgress({ 
          status: 'failed', 
          prompt, 
          error: error.message 
        });
      }

      return {
        success: false,
        error: error.message,
        prompt,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 批量生成图片（串行，避免并发压力）
   * @param {Array<string>} prompts - 图片提示词数组
   * @param {Function} onEachComplete - 每张图片完成的回调
   * @param {number} maxImages - 最大生成图片数量（用于调试）
   * @returns {Promise<Array>} 生成结果数组
   */
  async generateImages(prompts, onEachComplete = null, maxImages = null) {
    const results = [];
    
    // 限制生成数量（调试用）
    const promptsToGenerate = maxImages ? prompts.slice(0, maxImages) : prompts;
    
    console.log(`开始批量生成图片，共 ${promptsToGenerate.length} 张`);

    for (let i = 0; i < promptsToGenerate.length; i++) {
      const prompt = promptsToGenerate[i];
      
      console.log(`正在生成第 ${i + 1}/${promptsToGenerate.length} 张图片...`);

      const result = await this.generateImage(prompt, (progress) => {
        if (onEachComplete) {
          onEachComplete({
            ...progress,
            index: i,
            total: promptsToGenerate.length
          });
        }
      });

      results.push(result);

      // 成功生成后，如果有回调，调用它
      if (result.success && onEachComplete) {
        onEachComplete({
          status: 'image_ready',
          index: i,
          total: promptsToGenerate.length,
          imageUrl: result.imageUrl,
          prompt: result.prompt
        });
      }

      // 添加延迟，避免请求过快
      if (i < promptsToGenerate.length - 1) {
        await this.delay(1000); // 1秒延迟
      }
    }

    console.log(`批量图片生成完成，成功: ${results.filter(r => r.success).length}/${results.length}`);

    return results;
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 下载图片到本地（可选功能）
   * @param {string} imageUrl - 图片URL
   * @param {string} filename - 保存的文件名
   * @returns {Promise<string>} 本地文件路径
   */
  async downloadImage(imageUrl, filename) {
    try {
      const response = await axios({
        method: 'get',
        url: imageUrl,
        responseType: 'stream'
      });

      const filepath = path.join(this.imageDir, filename);
      const writer = fs.createWriteStream(filepath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`图片已保存到: ${filepath}`);
          resolve(filepath);
        });
        writer.on('error', reject);
      });

    } catch (error) {
      console.error(`下载图片失败:`, error.message);
      throw error;
    }
  }

  /**
   * 获取图片保存目录
   * @returns {string} 目录路径
   */
  getImageDirectory() {
    return this.imageDir;
  }
}

// 创建单例
const imageService = new ImageService();

module.exports = imageService;

