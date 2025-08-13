const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const TEMPLATES_FILE = path.join(__dirname, '../data/novel-templates.json');

class TemplateService {
  constructor() {
    this.templates = [];
    this.isLoaded = false;
    this.loadTemplates();
  }

  // 加载模板数据
  async loadTemplates() {
    try {
      const data = await fs.readFile(TEMPLATES_FILE, 'utf8');
      this.templates = JSON.parse(data);
      this.isLoaded = true;
      console.log(`已加载 ${this.templates.length} 个小说模板`);
    } catch (error) {
      console.error('加载模板失败:', error);
      this.templates = [];
      this.isLoaded = true; // 即使失败也标记为已加载，避免无限等待
    }
  }

  // 等待模板加载完成
  async waitForLoad() {
    while (!this.isLoaded) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // 保存模板数据
  async saveTemplates() {
    try {
      await fs.writeFile(TEMPLATES_FILE, JSON.stringify(this.templates, null, 2), 'utf8');
      console.log('模板数据已保存');
    } catch (error) {
      console.error('保存模板失败:', error);
      throw error;
    }
  }

  // 获取所有模板
  getAllTemplates() {
    return this.templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      tags: template.tags,
      createdAt: template.createdAt,
      characters: template.characters.length,
      settings: template.settings
    }));
  }

  // 根据ID获取完整模板
  getTemplateById(id) {
    return this.templates.find(template => template.id === id);
  }

  // 生成模板ID
  generateTemplateId(name) {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(name + timestamp).digest('hex').substring(0, 8);
    return `template-${hash}`;
  }

  // 创建新模板
  async createTemplate(templateData) {
    try {
      // 验证必要字段
      if (!templateData.name || !templateData.characters || !templateData.promptTemplate) {
        throw new Error('缺少必要的模板字段');
      }

      const newTemplate = {
        id: this.generateTemplateId(templateData.name),
        name: templateData.name,
        description: templateData.description || '',
        createdAt: new Date().toISOString(),
        tags: templateData.tags || [],
        worldSetting: templateData.worldSetting || {
          background: '',
          setting: '',
          rules: '',
          atmosphere: ''
        },
        characters: templateData.characters || [],
        promptTemplate: templateData.promptTemplate,
        settings: {
          votingDuration: templateData.settings?.votingDuration || 60000,
          maxChoices: templateData.settings?.maxChoices || 3,
          minChoices: templateData.settings?.minChoices || 2,
          storyLength: templateData.settings?.storyLength || 'medium',
          perspective: templateData.settings?.perspective || 'first_person',
          ...templateData.settings
        }
      };

      // 检查是否已存在同名模板
      const existingTemplate = this.templates.find(t => t.name === newTemplate.name);
      if (existingTemplate) {
        // 如果内容相同，返回现有模板
        if (this.templatesEqual(existingTemplate, newTemplate)) {
          return existingTemplate;
        }
        // 如果内容不同，创建新版本
        newTemplate.name = `${newTemplate.name} (${new Date().toLocaleString()})`;
      }

      this.templates.push(newTemplate);
      await this.saveTemplates();

      console.log(`创建新模板: ${newTemplate.name} (${newTemplate.id})`);
      return newTemplate;
    } catch (error) {
      console.error('创建模板失败:', error);
      throw error;
    }
  }

  // 比较两个模板是否相等（忽略ID和创建时间）
  templatesEqual(template1, template2) {
    const compareObject = (obj1, obj2) => {
      return JSON.stringify(obj1) === JSON.stringify(obj2);
    };

    return (
      template1.name === template2.name &&
      template1.description === template2.description &&
      compareObject(template1.tags, template2.tags) &&
      compareObject(template1.worldSetting, template2.worldSetting) &&
      compareObject(template1.characters, template2.characters) &&
      compareObject(template1.promptTemplate, template2.promptTemplate) &&
      compareObject(template1.settings, template2.settings)
    );
  }

  // 根据模板创建房间数据
  createRoomFromTemplate(template) {
    if (!template) {
      throw new Error('模板不存在');
    }

    return {
      templateId: template.id,
      templateName: template.name,
      worldSetting: template.worldSetting,
      characters: template.characters,
      promptTemplate: template.promptTemplate,
      settings: template.settings
    };
  }

  // 格式化角色数据为AI可用格式
  formatCharactersForAI(characters) {
    return characters.map(char => ({
      "基本信息": char.basicInfo,
      "性格": char.personality,
      "背景故事": char.backgroundStory,
      "人际关系": char.relationships
    }));
  }

  // 生成初始故事提示词
  generateInitialPrompt(roomData) {
    const { promptTemplate, characters, worldSetting } = roomData;
    const formattedCharacters = this.formatCharactersForAI(characters);
    
    return promptTemplate.initialPrompt
      .replace('{characters}', JSON.stringify(formattedCharacters))
      .replace('{worldSetting}', JSON.stringify(worldSetting));
  }

  // 生成续写故事提示词
  generateContinuePrompt(roomData, storyHistory) {
    const { promptTemplate, characters, worldSetting } = roomData;
    const formattedCharacters = this.formatCharactersForAI(characters);
    
    // 格式化故事历史
    let pastStory = '';
    storyHistory.forEach(element => {
      pastStory += element.story + '\n\n' + '主人公选择了：' + element.winningChoice + '\n\n';
    });

    return promptTemplate.continuePrompt
      .replace('{characters}', JSON.stringify(formattedCharacters))
      .replace('{worldSetting}', JSON.stringify(worldSetting))
      .replace('{storyHistory}', pastStory);
  }

  // 预览提示词
  previewPrompt(templateData, promptType = 'initial', storyHistory = []) {
    try {
      const formattedCharacters = this.formatCharactersForAI(templateData.characters || []);
      
      if (promptType === 'initial') {
        return templateData.promptTemplate?.initialPrompt
          ?.replace('{characters}', JSON.stringify(formattedCharacters, null, 2))
          ?.replace('{worldSetting}', JSON.stringify(templateData.worldSetting || {}, null, 2)) || '';
      } else {
        let pastStory = '';
        storyHistory.forEach(element => {
          pastStory += element.story + '\n\n' + '主人公选择了：' + element.winningChoice + '\n\n';
        });

        return templateData.promptTemplate?.continuePrompt
          ?.replace('{characters}', JSON.stringify(formattedCharacters, null, 2))
          ?.replace('{worldSetting}', JSON.stringify(templateData.worldSetting || {}, null, 2))
          ?.replace('{storyHistory}', pastStory) || '';
      }
    } catch (error) {
      console.error('预览提示词失败:', error);
      return '预览失败：' + error.message;
    }
  }
}

// 单例实例
const templateService = new TemplateService();

module.exports = templateService;