const NovelRoomManager = require('./NovelRoomManager');

/**
 * NovelService统一入口
 * 提供向后兼容的接口，同时暴露新的模块化功能
 */

// 创建单例实例
const novelRoomManager = new NovelRoomManager();

/**
 * 向后兼容的接口 - 保持与原novelService.js的接口一致
 */
module.exports = {
  // ===== 兼容旧接口 =====
  
  /**
   * 初始化小说服务（兼容接口）
   * @param {Object} io - Socket.IO实例
   */
  initializeNovel: (io) => novelRoomManager.initializeTestRooms(io),

  /**
   * 获取小说状态（兼容接口）
   * @param {string} roomId - 房间ID，默认为'room1'
   * @returns {Object|null} 小说状态
   */
  getNovelState: (roomId = 'room1') => {
    const room = novelRoomManager.getRoom(roomId);
    return room ? room.getNovelState() : null;
  },

  /**
   * 添加投票（兼容接口）
   * @param {string} userId - 用户ID
   * @param {string} choice - 选择的选项
   * @param {string} roomId - 房间ID，默认为'room1'
   * @param {number} coinsSpent - 消费的金币数量，默认为0
   * @returns {Object} 投票结果
   */
  addVote: (userId, choice, roomId = 'room1', coinsSpent = 0) => {
    const room = novelRoomManager.getRoom(roomId);
    return room ? room.addVote(userId, choice, coinsSpent) : { 
      success: false, 
      message: '房间不存在' 
    };
  },

  // ===== 讨论区相关接口 =====

  /**
   * 添加讨论区消息
   * @param {string} userId - 用户ID
   * @param {string} username - 用户名
   * @param {string} message - 消息内容
   * @param {string} roomId - 房间ID
   * @returns {Object} 添加结果
   */
  addDiscussionMessage: (userId, username, message, roomId) => {
    const room = novelRoomManager.getRoom(roomId);
    return room ? room.addDiscussionMessage(userId, username, message) : { 
      success: false, 
      message: '房间不存在' 
    };
  },

  /**
   * 获取讨论区消息
   * @param {string} roomId - 房间ID
   * @returns {Array} 讨论区消息数组
   */
  getDiscussionMessages: (roomId) => {
    const room = novelRoomManager.getRoom(roomId);
    return room ? room.getDiscussionMessages() : [];
  },

  // ===== 房间管理接口 =====

  /**
   * 创建房间
   * @param {string} roomId - 房间ID
   * @param {string} title - 房间标题
   * @param {Object} templateData - 模板数据
   * @returns {NovelRoom} 房间实例
   */
  createRoom: (roomId, title, templateData) => 
    novelRoomManager.createRoom(roomId, title, templateData),

  /**
   * 获取房间
   * @param {string} roomId - 房间ID
   * @returns {NovelRoom|undefined} 房间实例
   */
  getRoom: (roomId) => novelRoomManager.getRoom(roomId),

  /**
   * 获取所有房间信息
   * @returns {Array} 房间信息数组
   */
  getAllRoomsInfo: () => novelRoomManager.getAllRoomsInfo(),

  /**
   * 用户加入房间
   * @param {string} userId - 用户ID
   * @param {string} roomId - 房间ID
   * @returns {NovelRoom|null} 房间实例
   */
  joinRoom: (userId, roomId) => novelRoomManager.joinRoom(userId, roomId),

  /**
   * 用户离开房间
   * @param {string} userId - 用户ID
   * @param {string} roomId - 房间ID
   */
  leaveRoom: (userId, roomId) => novelRoomManager.leaveRoom(userId, roomId),

  // ===== 直接暴露管理器实例 =====

  /**
   * 小说房间管理器实例
   * 提供对完整管理器功能的访问
   */
  novelRoomManager,

  // ===== 暴露内部模块 =====

  /**
   * 内部模块，用于高级用法
   */
  modules: {
    NovelRoomManager: require('./NovelRoomManager'),
    NovelRoom: require('./NovelRoom'),
    HtmlLogger: require('./HtmlLogger'),
    AIClient: require('../aiService')
  }
};

/**
 * 使用示例：
 * 
 * // 基本用法（兼容原接口）
 * const novelService = require('./novelService');
 * await novelService.initializeNovel(io);
 * const state = novelService.getNovelState('room1');
 * 
 * // 高级用法（使用新接口）
 * const room = novelService.createRoom('myRoom', '我的小说', templateData);
 * await room.initializeNovel(io);
 * 
 * // 直接使用管理器
 * const manager = novelService.novelRoomManager;
 * const roomCount = manager.getRoomCount();
 * 
 * // 使用内部模块
 * const { NovelRoom, HtmlLogger } = novelService.modules;
 * const customRoom = new NovelRoom('custom', '自定义房间', templateData);
 */