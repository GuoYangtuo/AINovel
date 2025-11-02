const fs = require('fs');
const path = require('path');

/**
 * 房间数据管理器
 * 负责房间数据的持久化存储和加载
 */
class RoomDataManager {
  constructor() {
    // 数据存储目录
    this.dataDir = path.join(__dirname, '../../data/rooms');
    this.ensureDataDirectory();
  }

  /**
   * 确保数据目录存在
   */
  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log(`创建房间数据目录: ${this.dataDir}`);
    }
  }

  /**
   * 获取房间数据文件路径
   * @param {string} roomId - 房间ID
   * @returns {string} 文件路径
   */
  getRoomDataPath(roomId) {
    return path.join(this.dataDir, `${roomId}.json`);
  }

  /**
   * 保存房间数据
   * @param {string} roomId - 房间ID
   * @param {Object} roomData - 房间数据
   * @returns {boolean} 保存是否成功
   */
  saveRoomData(roomId, roomData) {
    try {
      const filePath = this.getRoomDataPath(roomId);
      const dataToSave = {
        ...roomData,
        lastSavedAt: new Date().toISOString(),
        version: '1.0' // 数据格式版本
      };
      
      fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
      console.log(`房间 ${roomId} 数据已保存到: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`保存房间 ${roomId} 数据失败:`, error.message);
      return false;
    }
  }

  /**
   * 加载房间数据
   * @param {string} roomId - 房间ID
   * @returns {Object|null} 房间数据，如果不存在则返回null
   */
  loadRoomData(roomId) {
    try {
      const filePath = this.getRoomDataPath(roomId);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const roomData = JSON.parse(fileContent);
      
      console.log(`房间 ${roomId} 数据已加载`);
      return roomData;
    } catch (error) {
      console.error(`加载房间 ${roomId} 数据失败:`, error.message);
      return null;
    }
  }

  /**
   * 加载所有房间数据
   * @returns {Array} 所有房间数据数组
   */
  loadAllRoomData() {
    try {
      const files = fs.readdirSync(this.dataDir);
      const roomDataList = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const roomId = file.replace('.json', '');
          const roomData = this.loadRoomData(roomId);
          
          if (roomData) {
            roomDataList.push(roomData);
          }
        }
      }
      
      console.log(`加载了 ${roomDataList.length} 个房间的数据`);
      return roomDataList;
    } catch (error) {
      console.error('加载所有房间数据失败:', error.message);
      return [];
    }
  }

  /**
   * 删除房间数据
   * @param {string} roomId - 房间ID
   * @returns {boolean} 删除是否成功
   */
  deleteRoomData(roomId) {
    try {
      const filePath = this.getRoomDataPath(roomId);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`房间 ${roomId} 数据已删除`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`删除房间 ${roomId} 数据失败:`, error.message);
      return false;
    }
  }

  /**
   * 检查房间数据是否存在
   * @param {string} roomId - 房间ID
   * @returns {boolean} 房间数据是否存在
   */
  roomDataExists(roomId) {
    const filePath = this.getRoomDataPath(roomId);
    return fs.existsSync(filePath);
  }

  /**
   * 获取所有已保存的房间ID列表
   * @returns {Array<string>} 房间ID数组
   */
  getAllRoomIds() {
    try {
      const files = fs.readdirSync(this.dataDir);
      const roomIds = files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
      
      return roomIds;
    } catch (error) {
      console.error('获取房间ID列表失败:', error.message);
      return [];
    }
  }

  /**
   * 导出房间数据（用于提取保存的数据结构）
   * @param {Object} room - NovelRoom实例
   * @returns {Object} 可序列化的房间数据
   */
  exportRoomData(room) {
    return {
      // 房间基本信息
      roomId: room.roomId,
      title: room.title,
      createdAt: room.createdAt,
      templateData: room.templateData,
      
      // 当前状态
      currentStory: room.roomState.currentStory,
      currentAudioUrl: room.roomState.currentAudioUrl,
      currentImages: room.roomState.currentImages || [],
      isActive: room.roomState.isActive,
      
      // 故事历史（包含投票数据、讨论记录）
      storyHistory: room.storyGenerator.getHistory(),
      
      // 当前投票状态
      votingState: {
        isVoting: room.votingManager.votingState.isVoting,
        votingEndTime: room.votingManager.votingState.votingEndTime,
        votes: room.votingManager.votingState.votes,
        userVotes: room.votingManager.votingState.userVotes,
        choices: room.votingManager.votingState.choices,
        customOptions: room.votingManager.votingState.customOptions,
        customOptionCosts: room.votingManager.votingState.customOptionCosts
      },
      
      // 讨论区状态
      discussionState: room.discussionManager.getState(),
      
      // 统计信息
      statistics: room.storyGenerator.getStatistics(),
      
      // 保存时间戳
      savedAt: new Date().toISOString()
    };
  }
}

module.exports = RoomDataManager;

