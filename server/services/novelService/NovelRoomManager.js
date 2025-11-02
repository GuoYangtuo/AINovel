const NovelRoom = require('./NovelRoom');
const templateService = require('../templateService');
const RoomDataManager = require('./RoomDataManager');

/**
 * 多房间管理器
 * 负责管理所有小说房间的创建、删除和用户管理
 */
class NovelRoomManager {
  constructor() {
    this.rooms = new Map();
    this.io = null;
    this.dataManager = new RoomDataManager();
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

    const room = new NovelRoom(roomId, title, templateData, this.dataManager);
    this.rooms.set(roomId, room);
    return room;
  }

  /**
   * 从保存的数据中恢复房间
   * @param {Object} savedData - 保存的房间数据
   * @returns {NovelRoom|null} 恢复的房间实例，失败则返回null
   */
  restoreRoom(savedData) {
    try {
      if (!savedData || !savedData.roomId || !savedData.templateData) {
        console.warn('保存的房间数据不完整，跳过恢复');
        return null;
      }

      const { roomId, title, templateData } = savedData;

      // 创建新房间
      const room = new NovelRoom(roomId, title, templateData, this.dataManager);
      
      // 从保存的数据中恢复状态
      room.restoreFromSavedData(savedData);
      
      // 将房间添加到管理器
      this.rooms.set(roomId, room);
      
      console.log(`成功从保存的数据中恢复房间: ${roomId}`);
      return room;
    } catch (error) {
      console.error(`恢复房间失败:`, error.message);
      return null;
    }
  }

  /**
   * 加载所有已保存的房间
   * @param {Object} io - Socket.IO实例（可选）
   * @returns {number} 成功恢复的房间数量
   */
  loadSavedRooms(io = null) {
    try {
      console.log('开始加载已保存的房间数据...');
      
      const allRoomData = this.dataManager.loadAllRoomData();
      let successCount = 0;
      
      for (const savedData of allRoomData) {
        const room = this.restoreRoom(savedData);
        
        if (room) {
          // 如果提供了io实例，设置它
          if (io) {
            room.setIO(io);
          }
          
          // 如果房间之前正在投票，需要重启投票计时器
          if (room.roomState.isActive && room.votingManager.votingState.isVoting) {
            // 重启投票计时器
            room.votingManager.startVotingTimer(room.templateData.votingTime, (result) => {
              return room.processVotingResult(result);
            });
            console.log(`房间 ${room.roomId} 投票计时器已重启，剩余时间: ${Math.floor(remainingTime / 1000)}秒`);
          }
          
          successCount++;
        }
      }
      
      console.log(`成功加载 ${successCount}/${allRoomData.length} 个房间`);
      return successCount;
    } catch (error) {
      console.error('加载已保存的房间失败:', error.message);
      return 0;
    }
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
   * @param {boolean} deleteData - 是否同时删除保存的数据文件（默认为false）
   */
  deleteRoom(roomId, deleteData = false) {
    const room = this.rooms.get(roomId);
    if (room && room.votingTimer) {
      clearTimeout(room.votingTimer);
    }
    this.rooms.delete(roomId);
    
    // 如果指定删除数据文件
    if (deleteData) {
      this.dataManager.deleteRoomData(roomId);
      console.log(`房间 ${roomId} 及其数据文件已删除`);
    }
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
      // 首先尝试加载已保存的房间
      console.log('尝试加载已保存的房间...');
      const loadedCount = this.loadSavedRooms(io);
      
      if (loadedCount > 0) {
        console.log(`已加载 ${loadedCount} 个保存的房间，跳过创建测试房间`);
        return;
      }
      
      // 如果没有保存的房间，则创建测试房间
      console.log('没有找到保存的房间，创建新的测试房间...');
      
      // 等待模板服务加载完成
      await templateService.waitForLoad();
      
      // 获取模板
      const testTemplate = templateService.getTemplateById('test-room-template');
      const fantasyTemplate = templateService.getTemplateById('fantasy-adventure-template');
      
      // 创建测试房间1，使用测试模板
      if (testTemplate && false) {
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