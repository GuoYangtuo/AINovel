/**
 * 直播桥接管理器
 * 管理所有直播间桥接器实例，支持多平台（目前仅 Bilibili）
 */

const BiliBiliBridge = require('./BiliBiliBridge');

/**
 * 单个直播桥接器实例状态
 * @typedef {Object} BridgeInstance
 * @property {string} bridgeId
 * @property {string} platform
 * @property {string} novelRoomId
 * @property {boolean} running
 * @property {Object} bridge - 桥接器实例
 * @property {Object} credentials - 鉴权信息 (不含敏感)
 * @property {number} connectedAt - 连接时间
 * @property {number} totalVotes - 通过此桥接的总投票数
 */

  /**
   * 待处理的礼物记录
   * @typedef {Object} PendingGift
   * @property {string} uname - 用户昵称
   * @property {number} coins - 累计票数（金币换算后）
   * @property {Array} gifts - 礼物记录列表
   * @property {number} votingEndTime - 刷礼物时所在投票轮的截止时间，用于检测轮次切换
   */

/**
 * 礼物到票数的映射配置
 * @type {Object.<string, number>}
 */
const GIFT_VOTE_MAP = {
  '小花花': 1,
  '比心': 2,
  '啵啵': 5,
  '粉丝亲亲': 5,
  '追梦': 10,
  '666': 6,
  '棒棒糖': 6,
  '打call': 10,
  'MVP': 20,
  'B币': 100,
  '摩天大楼': 500,
  '小电视': 1000,
};

/**
 * 礼物配置
 * @type {Object.<string, {minCoin: number, defaultVotes: number}>}
 */
const GIFT_CONFIG = {
  'bilibili': {
    minCoin: 1,
    defaultVotes: 1,
    giftMap: GIFT_VOTE_MAP,
  }
};

class LiveBridgeManager {
  constructor() {
    /** @type {Map<string, BridgeInstance>} */
    this._bridges = new Map();

    /**
     * 待处理的礼物票数，key = `${bridgeId}_${uid}`
     * 用户刷礼物时累加到这里，发弹幕选选项时清空并投出去
     * @type {Map<string, PendingGift>}
     */
    this._pendingCoins = new Map();

    this._io = null;
  }

  /**
   * 设置 Socket.IO 实例
   * @param {Object} io
   */
  setIO(io) {
    this._io = io;
  }

  /**
   * 获取一个唯一的桥接器ID
   */
  _makeBridgeId(platform, novelRoomId) {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 6);
    return `${platform}_${novelRoomId}_${timestamp}_${rand}`;
  }

  /**
   * 生成用户礼物余额的 key
   */
  _pendingKey(bridgeId, uid) {
    return `${bridgeId}_${uid}`;
  }

  /**
   * 根据礼物获取投票数
   */
  _giftToVotes(platform, giftInfo) {
    const config = GIFT_CONFIG[platform];
    if (!config) return 0;

    const { gift_name, gift_num, price, coin_type } = giftInfo;
    const totalCoin = price * gift_num;

    if (config.giftMap && config.giftMap[gift_name]) {
      return config.giftMap[gift_name] * gift_num;
    }

    if (coin_type === 'silver') return 0;
    if (coin_type === 'gold' || coin_type === 'bcoin') {
      if (gift_name.includes('小电视')) return 10 * gift_num;
      if (gift_name.includes('摩天大楼')) return 5 * gift_num;
      return Math.max(1, Math.floor(totalCoin / config.minCoin));
    }

    return config.defaultVotes * gift_num;
  }

  /**
   * 连接一个直播间桥接器
   */
  async connectBridge(config) {
    const { platform, novelRoomId, credentials } = config;

    if (!credentials || !credentials.idCode || !credentials.appId || !credentials.key || !credentials.secret) {
      return { success: false, message: '鉴权信息不完整' };
    }

    if (platform === 'bilibili') {
      return this._connectBiliBili(config);
    }

    return { success: false, message: `不支持的平台: ${platform}` };
  }

  /**
   * 连接 Bilibili 桥接器
   */
  async _connectBiliBili(config) {
    const bridgeId = this._makeBridgeId('bilibili', config.novelRoomId);

    try {
      const bridge = new BiliBiliBridge({
        idCode: config.credentials.idCode,
        appId: config.credentials.appId,
        key: config.credentials.key,
        secret: config.credentials.secret,
        host: config.credentials.host,
        liveRoomId: config.liveRoomId,
      });

      // 事件处理器必须先注册，再调用 connect()（因为 connect() 内部会同步触发 _emit）
      bridge.on('dm', (data) => {
        this._handleMessage(bridgeId, 'dm', data);
      });

      bridge.on('gift', (data) => {
        this._handleMessage(bridgeId, 'gift', data);
      });

      bridge.on('connect_success', () => {
        const instance = this._bridges.get(bridgeId);
        if (instance) {
          instance.running = true;
          instance.connectedAt = Date.now();
        }

        this._broadcastBridgeUpdate(config.novelRoomId);
      });

      bridge.on('close', () => {
        const instance = this._bridges.get(bridgeId);
        if (instance) instance.running = false;
        this._broadcastBridgeUpdate(config.novelRoomId);
      });

      bridge.on('error', (err) => {
        console.error(`[LiveBridge] ${bridgeId} error:`, err.message);
      });

      // 先存入 _bridges，再注册事件（事件在 connect() 内部触发）
      const instance = {
        bridgeId,
        platform: 'bilibili',
        novelRoomId: config.novelRoomId,
        running: false,
        bridge,
        credentials: {
          idCode: config.credentials.idCode,
          appId: config.credentials.appId,
          liveRoomId: config.liveRoomId,
          host: config.credentials.host,
        },
        connectedAt: Date.now(),
        totalVotes: 0,
      };
      this._bridges.set(bridgeId, instance);

      console.log(`[LiveBridge] calling bridge.connect()...`);
      await bridge.connect();
      bridge.startHeartbeats();
      console.log(`[LiveBridge] Bilibili bridge connected: ${bridgeId} -> novelRoom: ${config.novelRoomId}`);
      return { success: true, bridgeId };

    } catch (error) {
      console.error(`[LiveBridge] Failed to connect Bilibili bridge:`, error.message);
      return { success: false, message: `连接失败: ${error.message}` };
    }
  }

  /**
   * 处理桥接消息统一入口
   */
  _handleMessage(bridgeId, type, data) {
    const instance = this._bridges.get(bridgeId);
    if (!instance || !instance.running) return;

    const { novelRoomId } = instance;

    if (type === 'dm') {
      this._handleDanmu(novelRoomId, bridgeId, data);
    } else if (type === 'gift') {
      this._handleGift(novelRoomId, bridgeId, data);
    }
  }

  /**
   * 处理礼物: 累加到用户的待处理余额中，不立即投票
   */
  _handleGift(novelRoomId, bridgeId, data) {
    const { uname, uid, gift_name, gift_num } = data;
    if (!uid) return;

    const votes = this._giftToVotes('bilibili', data);
    if (votes <= 0) {
      console.log(`[LiveBridge] 礼物 '${gift_name}' 被跳过: 票数=0`);
      return;
    }

    const novelRoom = this._getNovelRoom(novelRoomId);
    if (!novelRoom) {
      console.log(`[LiveBridge] 礼物 '${gift_name}' 被跳过: 找不到小说房间 ${novelRoomId}`);
      return;
    }

    const votingState = novelRoom.votingManager?.votingState;
    if (!votingState || !votingState.isVoting) {
      console.log(`[LiveBridge] 礼物 '${gift_name}' 被跳过: 不在投票中`);
      return;
    }

    const currentVotingEndTime = votingState.votingEndTime;
    const key = this._pendingKey(bridgeId, uid);
    const existing = this._pendingCoins.get(key);

    if (existing) {
      existing.coins += votes;
      existing.gifts.push({ gift_name, gift_num, votes, time: Date.now() });
    } else {
      this._pendingCoins.set(key, {
        uname,
        coins: votes,
        gifts: [{ gift_name, gift_num, votes, time: Date.now() }],
        votingEndTime: currentVotingEndTime,
      });
    }

    // 广播礼物通知（不投票）
    if (this._io) {
      this._io.to(novelRoomId).emit('bridge_gift', {
        platform: 'bilibili',
        bridgeId,
        username: uname,
        giftName: gift_name,
        giftNum: gift_num,
        votes,
        pendingVotes: this._pendingCoins.get(key).coins,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 处理弹幕: 必须先刷过礼物才能投票，礼物票数累计，弹幕选选项
   * 支持免费改选项：已投过的用户再次发弹幕，直接切换选项，票数不变
   * 下一轮保留未投票的礼物：跨轮时仍可使用上一轮的待处理礼物
   */
  async _handleDanmu(novelRoomId, bridgeId, data) {
    const { uname, uid, msg } = data;
    if (!msg || !uname) return;

    const instance = this._bridges.get(bridgeId);
    if (!instance) return;

    const novelRoom = this._getNovelRoom(novelRoomId);
    if (!novelRoom) return;

    const votingState = novelRoom.votingManager?.votingState;
    if (!votingState || !votingState.isVoting) return;

    const allChoices = [
      ...(votingState.choices || []),
      ...(votingState.customOptions || []).map(o => o.content || o),
    ];

    if (allChoices.length === 0) {
      console.log(`[LiveBridge] 弹幕 '${msg}' 被跳过: 没有投票选项`);
      return;
    }

    const matchedChoice = this._matchChoice(msg.trim(), allChoices);
    if (!matchedChoice) {
      console.log(`[LiveBridge] 弹幕 '${msg}' 未匹配到选项: [${allChoices.join(', ')}]`);
      return;
    }

    const key = this._pendingKey(bridgeId, uid);
    const pending = this._pendingCoins.get(key);

    // 必须先刷过礼物才能投票
    if (!pending || pending.coins <= 0) {
      console.log(`[LiveBridge] 弹幕 '${msg}' 被跳过: 用户未刷礼物，uid=${uid}`);
      return;
    }

    // 获取用户在本轮的已投记录（initializeVoting 已清空 userVotes，所以存在即本轮已投）
    const fakeUserId = `live_bridge_${bridgeId}_${uid}`;
    const userPrev = votingState.userVotes[fakeUserId];
    const prevInCurrentRound = !!userPrev;

    // 计算本次要投的票数和礼物消耗
    let votesToAdd = 0;
    let coinsToDeduct = 0;
    let changeFromPrevious = false;

    if (prevInCurrentRound && userPrev.choice !== matchedChoice) {
      // 改选项：扣除旧选项票，加上新选项票，礼物不重复消费
      votesToAdd = userPrev.totalVotes;
      changeFromPrevious = true;
      console.log(`[LiveBridge] 用户 ${uname} 改选项: ${userPrev.choice} -> ${matchedChoice}，票数=${votesToAdd}（免费）`);
    } else if (prevInCurrentRound && userPrev.choice === matchedChoice) {
      // 投相同选项，忽略
      console.log(`[LiveBridge] 用户 ${uname} 重复投票相同选项，忽略`);
      return;
    } else {
      // 首次投票本轮：消耗待处理礼物
      if (pending.votingEndTime && votingState.votingEndTime !== pending.votingEndTime) {
        // 跨轮：用户上一轮没投票就把礼物留到本轮
        console.log(`[LiveBridge] 用户 ${uname} 跨轮使用待处理礼物票数=${pending.coins}`);
      }
      votesToAdd = pending.coins;
      coinsToDeduct = pending.coins;
    }

    if (votesToAdd <= 0) {
      console.log(`[LiveBridge] 用户 ${uname} 票数为0，跳过`);
      return;
    }

    // 调用 NovelRoom.addVote 完成投票（会广播 novel_state）
    const result = await novelRoom.addVote(
      fakeUserId,
      uname,
      matchedChoice,
      votesToAdd,
      null,
      { platform: 'bilibili' }
    );

    console.log(`[LiveBridge] 投票结果:`, result);

    if (result.success) {
      // 更新桥接器统计
      instance.totalVotes += votesToAdd;

      if (coinsToDeduct > 0) {
        // 投票成功，消费掉本次使用的礼物票数
        pending.coins -= coinsToDeduct;
        pending.gifts = []; // 清空礼物记录（已使用）

        // pending.coins 可能还有剩余（如果上一轮遗留），保留到下一轮
        if (pending.coins <= 0) {
          this._pendingCoins.delete(key);
        }
      }

      // 广播投票通知
      if (this._io) {
        this._io.to(novelRoomId).emit('bridge_vote', {
          platform: 'bilibili',
          bridgeId,
          username: uname,
          choice: matchedChoice,
          message: msg,
          type: changeFromPrevious ? 'change' : 'vote',
          votes: votesToAdd,
          giftVotes: coinsToDeduct,
          gifts: pending?.gifts?.length > 0 ? pending.gifts : null,
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * 模糊匹配弹幕与投票选项
   * @param {string} danmu
   * @param {string[]} choices
   * @returns {string|null}
   */
  _matchChoice(danmu, choices) {
    // 精确匹配
    for (const choice of choices) {
      if (danmu === choice) return choice;
    }

    // 模糊匹配（包含关系）
    for (const choice of choices) {
      if (danmu.includes(choice) || choice.includes(danmu)) {
        return choice;
      }
    }

    // 数字序号匹配（例如 "1" 匹配 choices[0]）
    const numMatch = danmu.match(/^[1-9]\d*$/);
    if (numMatch) {
      const idx = parseInt(numMatch[0], 10) - 1;
      if (idx >= 0 && idx < choices.length) {
        return choices[idx];
      }
    }

    return null;
  }

  /**
   * 获取对应的小说房间
   */
  _getNovelRoom(novelRoomId) {
    const { novelRoomManager } = require('../novelService');
    return novelRoomManager.getRoom(novelRoomId);
  }

  /**
   * 断开一个桥接器
   */
  async disconnectBridge(bridgeId) {
    const instance = this._bridges.get(bridgeId);
    if (!instance) {
      return { success: false, message: '桥接器不存在' };
    }

    try {
      await instance.bridge.close();
    } catch (e) {
      // ignore
    }
    this._bridges.delete(bridgeId);

    // 清理该桥接器相关的待处理礼物
    for (const key of this._pendingCoins.keys()) {
      if (key.startsWith(`${bridgeId}_`)) {
        this._pendingCoins.delete(key);
      }
    }

    console.log(`[LiveBridge] Disconnected: ${bridgeId}`);
    return { success: true };
  }

  /**
   * 获取某个小说房间的所有桥接器
   */
  getBridgesForRoom(novelRoomId) {
    const result = [];
    for (const [, instance] of this._bridges) {
      if (instance.novelRoomId === novelRoomId) {
        result.push(this._sanitizeInstance(instance));
      }
    }
    return result;
  }

  /**
   * 获取所有桥接器
   */
  getAllBridges() {
    const result = [];
    for (const instance of this._bridges.values()) {
      result.push(this._sanitizeInstance(instance));
    }
    return result;
  }

  /**
   * 清理敏感信息
   */
  _sanitizeInstance(instance) {
    return {
      bridgeId: instance.bridgeId,
      platform: instance.platform,
      novelRoomId: instance.novelRoomId,
      running: instance.running,
      voteCount: instance.totalVotes || 0,
      totalVotes: instance.totalVotes || 0,
      connectedAt: instance.connectedAt,
      credentials: instance.credentials,
    };
  }

  /**
   * 广播桥接器状态更新
   */
  _broadcastBridgeUpdate(novelRoomId) {
    if (!this._io) return;
    const bridges = this.getBridgesForRoom(novelRoomId);
    this._io.to(novelRoomId).emit('bridge_status_update', { bridges });
  }

  /**
   * 清理所有桥接器
   */
  async cleanup() {
    for (const [bridgeId] of this._bridges) {
      await this.disconnectBridge(bridgeId);
    }
  }
}

module.exports = LiveBridgeManager;
