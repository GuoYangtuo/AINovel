const express = require('express');
const router = express.Router();
const templateService = require('../services/templateService');
const { createRoom, novelRoomManager } = require('../services/novelService');

// 获取所有模板列表
router.get('/', async (req, res) => {
  try {
    const templates = templateService.getAllTemplates();
    res.json({ success: true, templates });
  } catch (error) {
    console.error('获取模板列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 根据ID获取完整模板
router.get('/:id', async (req, res) => {
  try {
    const template = templateService.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: '模板不存在' });
    }
    res.json({ success: true, template });
  } catch (error) {
    console.error('获取模板失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 创建新模板
router.post('/', async (req, res) => {
  try {
    const template = await templateService.createTemplate(req.body);
    res.json({ success: true, template });
  } catch (error) {
    console.error('创建模板失败:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// 预览提示词
router.post('/preview', async (req, res) => {
  try {
    const { templateData, promptType, storyHistory } = req.body;
    const preview = templateService.previewPrompt(templateData, promptType, storyHistory);
    res.json({ success: true, preview });
  } catch (error) {
    console.error('预览提示词失败:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// 从模板创建房间
router.post('/:id/create-room', async (req, res) => {
  try {
    const { roomId, title } = req.body;
    
    if (!roomId || !title) {
      return res.status(400).json({ 
        success: false, 
        message: '房间ID和标题不能为空' 
      });
    }

    // 检查房间ID是否已存在
    if (novelRoomManager.getRoom(roomId)) {
      return res.status(400).json({ 
        success: false, 
        message: '房间ID已存在，请选择其他ID' 
      });
    }

    const template = templateService.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: '模板不存在' });
    }

    // 创建房间数据
    const roomData = templateService.createRoomFromTemplate(template);
    
    // 创建小说房间实例（直接传入模板数据）
    const room = createRoom(roomId, title, roomData);

    // 初始化房间的小说（异步进行，不阻塞响应）
    setImmediate(async () => {
      try {
        // 获取io实例（从novelRoomManager获取）
        const io = novelRoomManager.io;
        if (io) {
          await room.initializeNovel(io);
          console.log(`房间 ${roomId} 小说初始化完成`);
        } else {
          console.warn(`房间 ${roomId} 创建成功，但Socket.IO未就绪，小说将稍后初始化`);
        }
      } catch (error) {
        console.error(`房间 ${roomId} 小说初始化失败:`, error);
      }
    });

    // 如果模板与现有模板不同，保存新模板
    if (req.body.saveAsTemplate) {
      await templateService.createTemplate({
        name: `${title} - 自定义模板`,
        description: `从房间 ${roomId} 创建的自定义模板`,
        ...roomData
      });
    }

    res.json({ 
      success: true, 
      room: room.getRoomInfo(),
      message: '房间创建成功，小说正在初始化中...' 
    });
  } catch (error) {
    console.error('从模板创建房间失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;