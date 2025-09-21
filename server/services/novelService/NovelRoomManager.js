const NovelRoom = require('./NovelRoom');
const templateService = require('../templateService');

/**
 * 多房间管理器
 * 负责管理所有小说房间的创建、删除和用户管理
 */
class NovelRoomManager {
  constructor() {
    this.rooms = new Map();
    this.io = null;
  }

  /**
   * 创建房间
   * @param {string} roomId - 房间ID
   * @param {string} title - 房间标题
   * @param {Object} templateData - 模板数据
   * @returns {NovelRoom} 创建的房间实例
   */
  createRoom(roomId, title, templateData) {
    if (!templateData) {
      throw new Error('templateData is required to create a room');
    }
    
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId);
    }

    const room = new NovelRoom(roomId, title, templateData);
    this.rooms.set(roomId, room);
    return room;
  }

  /**
   * 获取房间
   * @param {string} roomId - 房间ID
   * @returns {NovelRoom|undefined} 房间实例
   */
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  /**
   * 获取所有活跃房间信息
   * @returns {Array} 房间信息数组
   */
  getAllRoomsInfo() {
    const roomsInfo = [];
    for (const room of this.rooms.values()) {
      roomsInfo.push(room.getRoomInfo());
    }
    return roomsInfo.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * 删除房间
   * @param {string} roomId - 房间ID
   */
  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room && room.votingTimer) {
      clearTimeout(room.votingTimer);
    }
    this.rooms.delete(roomId);
  }

  /**
   * 用户加入房间
   * @param {string} userId - 用户ID
   * @param {string} roomId - 房间ID
   * @returns {NovelRoom|null} 房间实例或null
   */
  joinRoom(userId, roomId) {
    const room = this.getRoom(roomId);
    if (room) {
      room.addUser(userId);
      return room;
    }
    return null;
  }

  /**
   * 用户离开房间
   * @param {string} userId - 用户ID
   * @param {string} roomId - 房间ID
   */
  leaveRoom(userId, roomId) {
    const room = this.getRoom(roomId);
    if (room) {
      room.removeUser(userId);
      // 如果房间没有用户了，可以考虑删除房间（可选）
      // if (room.connectedUsers.size === 0) {
      //   this.deleteRoom(roomId);
      // }
    }
  }

  /**
   * 初始化测试房间
   * @param {Object} io - Socket.IO实例
   */
  async initializeTestRooms(io) {
    this.io = io; // 保存io实例供后续创建的房间使用
    
    try {
      // 等待模板服务加载完成
      await templateService.waitForLoad();
      
      // 获取模板
      const testTemplate = templateService.getTemplateById('test-room-template');
      const fantasyTemplate = templateService.getTemplateById('fantasy-adventure-template');
      
      // 创建测试房间1，使用测试模板
      if (testTemplate) {
        const roomData1 = templateService.createRoomFromTemplate(testTemplate);
        const room1 = this.createRoom('room1', '小叶的超能力觉醒之路', roomData1);
        await room1.initializeNovel(io);
        console.log('测试房间1创建成功');
      } else {
        console.warn('测试模板未找到，跳过创建房间1');
      }
      
      // 创建测试房间2，使用奇幻模板
      if (fantasyTemplate) {
        const roomData2 = templateService.createRoomFromTemplate(fantasyTemplate);
        const room2 = this.createRoom('room2', '魔法学院的奇幻冒险', roomData2);
        await room2.initializeNovel(io);
        console.log('测试房间2创建成功');
      } else {
        console.warn('奇幻模板未找到，跳过创建房间2');
      }
      
      console.log('测试房间初始化完成');
    } catch (error) {
      console.error('测试房间初始化失败:', error.message);
    }
  }

  /**
   * 设置Socket.IO实例
   * @param {Object} io - Socket.IO实例
   */
  setIO(io) {
    this.io = io;
  }

  /**
   * 获取房间数量
   * @returns {number} 房间数量
   */
  getRoomCount() {
    return this.rooms.size;
  }

  /**
   * 检查房间是否存在
   * @param {string} roomId - 房间ID
   * @returns {boolean} 房间是否存在
   */
  hasRoom(roomId) {
    return this.rooms.has(roomId);
  }

  /**
   * 获取所有房间ID
   * @returns {Array<string>} 房间ID数组
   */
  getAllRoomIds() {
    return Array.from(this.rooms.keys());
  }

  /**
   * 清理空房间（可选功能）
   * 删除没有用户的房间
   */
  cleanupEmptyRooms() {
    const emptyRooms = [];
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.connectedUsers.size === 0) {
        emptyRooms.push(roomId);
      }
    }
    
    emptyRooms.forEach(roomId => {
      this.deleteRoom(roomId);
      console.log(`清理空房间: ${roomId}`);
    });
    
    return emptyRooms.length;
  }
}

module.exports = NovelRoomManager;