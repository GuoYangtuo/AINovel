const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { readUsers, writeUsers } = require('../utils/fileUtils');
const { authenticateToken, requireAdmin } = require('../middleware/adminAuth');
const templateService = require('../services/templateService');
const { novelRoomManager } = require('../services/novelService');
const HtmlLogger = require('../services/novelService/HtmlLogger');

// 所有 admin 路由都需要认证 + admin 权限
router.use(authenticateToken);
router.use(requireAdmin);

// ============================================================
// 小说管理
// ============================================================

// 获取所有小说房间列表
router.get('/novels', (req, res) => {
  try {
    const rooms = novelRoomManager.getAllRoomsInfo();
    const roomIds = novelRoomManager.getAllRoomIds();

    // 获取每个房间的详细数据文件信息
    const roomsWithDetails = roomIds.map(roomId => {
      const room = novelRoomManager.getRoom(roomId);
      const logPath = path.join(__dirname, '..', '..', 'data', `room_${roomId}_logs.html`);
      const dataPath = path.join(__dirname, '..', '..', 'data', 'rooms', `${roomId}.json`);

      return {
        ...room.getRoomInfo(),
        logFileExists: fs.existsSync(logPath),
        logFileSize: fs.existsSync(logPath) ? fs.statSync(logPath).size : 0,
        dataFileExists: fs.existsSync(dataPath),
        dataFileSize: fs.existsSync(dataPath) ? fs.statSync(dataPath).size : 0,
        votingState: room.votingManager.votingState,
        templateName: room.templateData?.name || '未知模板',
        storyHistoryLength: room.storyGenerator.getHistory().length
      };
    });

    res.json({ success: true, rooms: roomsWithDetails });
  } catch (error) {
    console.error('获取小说列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取单个小说房间详细信息
router.get('/novels/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    const room = novelRoomManager.getRoom(roomId);

    if (!room) {
      return res.status(404).json({ success: false, message: '房间不存在' });
    }

    const logPath = path.join(__dirname, '..', '..', 'data', `room_${roomId}_logs.html`);
    const dataPath = path.join(__dirname, '..', '..', 'data', 'rooms', `${roomId}.json`);

    const roomInfo = room.getRoomInfo();
    const novelState = room.getNovelState();
    const statistics = room.getStatistics();

    res.json({
      success: true,
      room: {
        ...roomInfo,
        votingState: room.votingManager.votingState,
        templateData: room.templateData,
        templateName: room.templateData?.name || '未知模板',
        storyHistory: room.storyGenerator.getHistory(),
        storyHistoryLength: room.storyGenerator.getHistory().length,
        logFileExists: fs.existsSync(logPath),
        logFileSize: fs.existsSync(logPath) ? fs.statSync(logPath).size : 0,
        dataFileExists: fs.existsSync(dataPath),
        dataFileSize: fs.existsSync(dataPath) ? fs.statSync(dataPath).size : 0,
        statistics
      }
    });
  } catch (error) {
    console.error('获取房间详情失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 强制保存房间数据
router.post('/novels/:roomId/save', (req, res) => {
  try {
    const { roomId } = req.params;
    const room = novelRoomManager.getRoom(roomId);

    if (!room) {
      return res.status(404).json({ success: false, message: '房间不存在' });
    }

    room.saveRoomData();
    res.json({ success: true, message: '房间数据已保存' });
  } catch (error) {
    console.error('保存房间数据失败:', error);
    res.status(500).json({ success: false, message: '保存失败' });
  }
});

// 删除小说房间
router.delete('/novels/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    const { deleteData } = req.query; // ?deleteData=true 同时删除数据文件

    const room = novelRoomManager.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: '房间不存在' });
    }

    novelRoomManager.deleteRoom(roomId, deleteData === 'true');
    res.json({ success: true, message: `房间 ${roomId} 已删除${deleteData === 'true' ? '，数据文件已删除' : ''}` });
  } catch (error) {
    console.error('删除房间失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 获取房间日志文件内容
router.get('/novels/:roomId/logs', (req, res) => {
  try {
    const { roomId } = req.params;
    const logPath = path.join(__dirname, '..', '..', 'data', `room_${roomId}_logs.html`);

    if (!fs.existsSync(logPath)) {
      return res.status(404).json({ success: false, message: '日志文件不存在' });
    }

    const content = fs.readFileSync(logPath, 'utf-8');
    res.json({ success: true, content, roomId });
  } catch (error) {
    console.error('读取日志文件失败:', error);
    res.status(500).json({ success: false, message: '读取日志失败' });
  }
});

// 获取房间恢复记录文件内容
router.get('/novels/:roomId/data', (req, res) => {
  try {
    const { roomId } = req.params;
    const dataPath = path.join(__dirname, '..', '..', 'data', 'rooms', `${roomId}.json`);

    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ success: false, message: '数据文件不存在' });
    }

    const content = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(content);
    res.json({ success: true, data, roomId });
  } catch (error) {
    console.error('读取数据文件失败:', error);
    res.status(500).json({ success: false, message: '读取数据失败' });
  }
});

// 获取房间关联的模板信息
router.get('/novels/:roomId/template', (req, res) => {
  try {
    const { roomId } = req.params;
    const room = novelRoomManager.getRoom(roomId);

    if (!room) {
      return res.status(404).json({ success: false, message: '房间不存在' });
    }

    res.json({
      success: true,
      template: room.templateData
    });
  } catch (error) {
    console.error('获取模板信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取房间投票记录
router.get('/novels/:roomId/votes', (req, res) => {
  try {
    const { roomId } = req.params;
    const room = novelRoomManager.getRoom(roomId);

    if (!room) {
      return res.status(404).json({ success: false, message: '房间不存在' });
    }

    const votingState = room.votingManager.votingState;
    res.json({
      success: true,
      votingState
    });
  } catch (error) {
    console.error('获取投票记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ============================================================
// 用户管理
// ============================================================

// 获取所有用户列表
router.get('/users', (req, res) => {
  try {
    const users = readUsers();
    // 不返回密码
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      coins: u.coins,
      role: u.role || 'user',
      theme: u.theme,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));
    res.json({ success: true, users: safeUsers });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 修改用户金币
router.put('/users/:userId/coins', (req, res) => {
  try {
    const { userId } = req.params;
    const { coins, operation } = req.body; // operation: 'set' | 'add' | 'subtract'

    if (coins === undefined || coins < 0) {
      return res.status(400).json({ success: false, message: '金币数量无效' });
    }

    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    let finalCoins;
    switch (operation) {
      case 'add':
        finalCoins = (users[userIndex].coins || 0) + coins;
        break;
      case 'subtract':
        finalCoins = Math.max(0, (users[userIndex].coins || 0) - coins);
        break;
      case 'set':
      default:
        finalCoins = coins;
    }

    users[userIndex].coins = finalCoins;
    users[userIndex].updatedAt = new Date().toISOString();
    writeUsers(users);

    res.json({
      success: true,
      message: `用户 ${users[userIndex].username} 的金币已更新为 ${finalCoins}`,
      coins: finalCoins
    });
  } catch (error) {
    console.error('修改用户金币失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 修改用户角色
router.put('/users/:userId/role', (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: '角色无效' });
    }

    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 防止移除自己的 admin 权限
    if (req.user.userId === userId && role !== 'admin') {
      return res.status(400).json({ success: false, message: '不能移除自己的管理员权限' });
    }

    users[userIndex].role = role;
    users[userIndex].updatedAt = new Date().toISOString();
    writeUsers(users);

    res.json({
      success: true,
      message: `用户 ${users[userIndex].username} 的角色已更新为 ${role}`,
      role
    });
  } catch (error) {
    console.error('修改用户角色失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除用户
router.delete('/users/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    // 防止删除自己
    if (req.user.userId === userId) {
      return res.status(400).json({ success: false, message: '不能删除自己' });
    }

    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const deletedUser = users[userIndex].username;
    users.splice(userIndex, 1);
    writeUsers(users);

    res.json({ success: true, message: `用户 ${deletedUser} 已删除` });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ============================================================
// 模板管理
// ============================================================

// 获取所有模板列表
router.get('/templates', (req, res) => {
  try {
    const templates = templateService.getAllTemplates();
    res.json({ success: true, templates });
  } catch (error) {
    console.error('获取模板列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取单个模板详情（包含完整提示词）
router.get('/templates/:id', (req, res) => {
  try {
    const template = templateService.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: '模板不存在' });
    }
    res.json({ success: true, template });
  } catch (error) {
    console.error('获取模板详情失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 预览模板提示词
router.post('/templates/:id/preview', (req, res) => {
  try {
    const { storyHistory } = req.body;
    const template = templateService.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: '模板不存在' });
    }
    const preview = templateService.previewPrompt(template, 'continue', storyHistory);
    res.json({ success: true, preview });
  } catch (error) {
    console.error('预览模板失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除模板
router.delete('/templates/:id', (req, res) => {
  try {
    const template = templateService.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: '模板不存在' });
    }

    // 使用 templateService 的删除方法（如果存在）
    if (typeof templateService.deleteTemplate === 'function') {
      templateService.deleteTemplate(req.params.id);
    } else {
      // 手动删除
      const templatesPath = path.join(__dirname, '..', 'data', 'novel-templates.json');
      const raw = fs.readFileSync(templatesPath, 'utf-8');
      const templates = JSON.parse(raw);
      const filtered = templates.filter(t => t.id !== req.params.id);
      fs.writeFileSync(templatesPath, JSON.stringify(filtered, null, 2), 'utf-8');
      // 刷新内存中的模板数据
      templateService.loadTemplates();
    }

    res.json({ success: true, message: `模板 "${template.name}" 已删除` });
  } catch (error) {
    console.error('删除模板失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// ============================================================
// 仪表盘统计
// ============================================================

// 获取系统统计信息
router.get('/stats', (req, res) => {
  try {
    const users = readUsers();
    const templates = templateService.getAllTemplates();
    const rooms = novelRoomManager.getAllRoomsInfo();

    // 计算总投票数、总金币消耗等
    let totalVotes = 0;
    let totalCoinsSpent = 0;
    let totalStorySegments = 0;
    for (const roomId of novelRoomManager.getAllRoomIds()) {
      const room = novelRoomManager.getRoom(roomId);
      if (room) {
        const vs = room.votingManager.votingState;
        const userVotes = vs.userVotes || {};
        Object.values(userVotes).forEach(v => {
          totalVotes += v.totalVotes || 0;
          totalCoinsSpent += v.coinsSpent || 0;
        });
        totalStorySegments += room.storyGenerator.getHistory().length;
      }
    }

    res.json({
      success: true,
      stats: {
        totalUsers: users.length,
        totalTemplates: templates.length,
        totalRooms: rooms.length,
        activeRooms: rooms.filter(r => r.isActive).length,
        totalOnlineUsers: rooms.reduce((sum, r) => sum + r.connectedUsers, 0),
        totalVotes,
        totalCoinsSpent,
        totalStorySegments
      }
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
