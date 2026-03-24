/**
 * Bilibili 直播间桥接器
 * 将 Bilibili 直播间的弹幕、礼物消息桥接到小说房间的投票系统中
 */
const WebSocket = require('ws');
const Proto = require('./proto');

class BiliBiliBridge {
  constructor(config) {
    this.idCode = config.idCode;
    this.appId = config.appId;
    this.key = config.key;
    this.secret = config.secret;
    this.host = config.host || 'https://live-open.biliapi.com';
    this.liveRoomId = config.liveRoomId;

    this.ws = null;
    this.gameId = '';
    this._isRunning = false;
    this._shouldReconnect = true;
    this._reconnectDelay = 3000;
    this._maxReconnectDelay = 30000;

    this._eventHandlers = {};
    this._proto = new Proto();

    this._authBody = '';
  }

  on(event, handler) {
    this._eventHandlers[event] = handler;
  }

  _emit(event, ...args) {
    const handler = this._eventHandlers[event];
    if (typeof handler === 'function') {
      handler(...args);
    }
  }

  _sign(params) {
    const crypto = require('crypto');
    const ts = Math.floor(Date.now() / 1000);
    const nonce = Math.random() * 100000 + Date.now();
    const md5 = crypto.createHash('md5').update(params).digest('hex');

    const headerMap = {
      'x-bili-accesskeyid': this.key,
      'x-bili-content-md5': md5,
      'x-bili-signature-method': 'HMAC-SHA256',
      'x-bili-signature-nonce': String(nonce),
      'x-bili-signature-version': '1.0',
      'x-bili-timestamp': String(ts),
    };

    const headerList = Object.keys(headerMap).sort();
    let headerStr = '';
    for (const k of headerList) {
      headerStr += k + ':' + headerMap[k] + '\n';
    }
    headerStr = headerStr.trimEnd();

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(headerStr)
      .digest('hex');

    headerMap['Authorization'] = signature;
    headerMap['Content-Type'] = 'application/json';
    headerMap['Accept'] = 'application/json';
    return headerMap;
  }

  async _getWebsocketInfo() {
    const postUrl = `${this.host}/v2/app/start`;
    const params = JSON.stringify({ code: this.idCode, app_id: this.appId });
    const headers = this._sign(params);

    const response = await fetch(postUrl, {
      method: 'POST',
      headers,
      body: params,
    });

    if (!response.ok) {
      throw new Error(`BiliBili API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`BiliBili start app failed: ${JSON.stringify(data)}`);
    }

    this.gameId = data.data.game_info.game_id;
    const wssLink = data.data.websocket_info.wss_link[0];
    this._authBody = data.data.websocket_info.auth_body;

    return wssLink;
  }

  async _auth(ws) {
    const proto = new Proto();
    proto.op = 7;
    proto.body = this._authBody;
    ws.send(proto.pack());
  }

  _heartBeat(ws) {
    const proto = new Proto();
    proto.op = 2;
    ws.send(proto.pack());
  }

  async _appHeartBeat() {
    const postUrl = `${this.host}/v2/app/heartbeat`;
    const params = JSON.stringify({ game_id: this.gameId });
    const headers = this._sign(params);

    await fetch(postUrl, {
      method: 'POST',
      headers,
      body: params,
    });
  }

  _parseGift(body) {
    return {
      uname: body.uname || body.user?.uname || '',
      uid: body.uid || body.open_id || body.user?.uid || '',
      gift_name: body.gift_name || body.gift?.gift_name || '',
      gift_num: body.gift_num || body.gift?.num || 1,
      price: body.price || body.gift?.price || 0,
      coin_type: body.coin_type || 'gold',
    };
  }

  _handleMessage(rawBuffer) {
    try {
      const proto = new Proto();
      const parsed = proto.unpack(rawBuffer);
      if (!parsed) return;

      if (parsed.op === 3) return;

      const body = JSON.parse(parsed.body);
      const cmd = body.cmd || '';

      // 弹幕消息
      if (cmd === 'LIVE_OPEN_PLATFORM_DM' || cmd === 'DANMU_MSG') {
        let msg = '', uname = '', uid = '';
        if (cmd === 'LIVE_OPEN_PLATFORM_DM') {
          console.log(`[调试] LIVE_OPEN_PLATFORM_DM 原始 data:`, JSON.stringify(body.data));
          msg = body.data?.msg || '';
          uname = body.data?.uname || '';
          uid = body.data?.uid || body.data?.open_id || '';
        } else {
          const info = body.data?.info || body.info || [];
          if (info.length >= 2) {
            msg = info[1] || '';
            const userInfo = info[2] || [];
            uname = userInfo[1] || '';
            uid = userInfo[0] || '';
          }
        }

        if (msg && uname) {
          console.log(`[弹幕] ${uname}: ${msg}`);
          this._emit('dm', { uname, uid, msg, raw: body });
        }
      }

      // 礼物消息
      if (cmd === 'LIVE_OPEN_PLATFORM_SEND_GIFT') {
        console.log(`[调试] LIVE_OPEN_PLATFORM_SEND_GIFT 原始 body:`, JSON.stringify(body));
        const gift = this._parseGift(body.data || body);
        if (gift.gift_name) {
          console.log(`[礼物] ${gift.uname} 送出 ${gift.gift_num} 个 ${gift.gift_name}`);
          this._emit('gift', { ...gift, raw: body });
        }
      }

      // 直播间开始
      if (cmd === 'LIVE_OPEN_PLATFORM_LIVE_START') {
        const title = body.data?.title || '';
        const areaName = body.data?.area_name || '';
        console.log(`[直播] 开始 - ${title} / ${areaName}`);
        this._emit('live_start', body.data || body);
      }

      // 直播间结束
      if (cmd === 'LIVE_OPEN_PLATFORM_LIVE_END') {
        const title = body.data?.title || '';
        console.log(`[直播] 结束 - ${title}`);
        this._emit('live_end', body.data || body);
      }

      // 进房/离房
      if (cmd === 'LIVE_OPEN_PLATFORM_LIVE_ROOM_ENTER') {
        const uname = body.data?.uname || '';
        console.log(`[进房] ${uname} 进入了直播间`);
        this._emit('enter', { uname, uid: body.data?.uid || '' });
      }
      if (cmd === 'LIVE_OPEN_PLATFORM_LIVE_ROOM_ENTER_CANCEL') {
        const uname = body.data?.uname || '';
        console.log(`[离开] ${uname} 离开了直播间`);
        this._emit('leave', { uname, uid: body.data?.uid || '' });
      }

      // 点赞互动
      if (cmd === 'INTERACT_WORD') {
        const uname = body.data?.uname || '';
        console.log(`[互动] ${uname} 点赞了`);
      }

      this._emit('message', { cmd, body });
    } catch (e) {
      // 忽略解析错误
    }
  }

  async connect() {
    try {
      const wssLink = await this._getWebsocketInfo();
      this.ws = new WebSocket(wssLink);

      this.ws.on('error', (err) => {
        this._emit('error', err);
      });
      this.ws.on('close', (code, reason) => {
        this._isRunning = false;
        this._emit('close');
        if (this._shouldReconnect) {
          this._scheduleReconnect();
        }
      });
      this.ws.on('message', (data) => {
        this._handleMessage(data);
      });

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 15000);

        this.ws.on('open', async () => {
          clearTimeout(timeout);
          try {
            await this._auth(this.ws);
            this._isRunning = true;
            this._emit('connect_success');
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    } catch (e) {
      throw e;
    }
  }

  startHeartbeats() {
    const wsHeartbeat = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this._heartBeat(this.ws);
      } else {
        clearInterval(wsHeartbeat);
      }
    }, 20000);

    const appHeartbeat = setInterval(async () => {
      if (this._isRunning) {
        try {
          await this._appHeartBeat();
        } catch (e) {
          // 忽略
        }
      } else {
        clearInterval(appHeartbeat);
      }
    }, 20000);
  }

  _scheduleReconnect() {
    if (!this._shouldReconnect) return;

    setTimeout(async () => {
      if (this._shouldReconnect && !this._isRunning) {
        try {
          await this.connect();
          this.startHeartbeats();
          this._emit('reconnected');
        } catch (e) {
          this._reconnectDelay = Math.min(this._reconnectDelay * 1.5, this._maxReconnectDelay);
        }
      }
    }, this._reconnectDelay);
  }

  async close() {
    this._shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
    }

    const postUrl = `${this.host}/v2/app/end`;
    const params = JSON.stringify({ game_id: this.gameId, app_id: this.appId });
    const headers = this._sign(params);

    try {
      await fetch(postUrl, { method: 'POST', headers, body: params });
    } catch (e) {
      // 忽略关闭错误
    }
  }

  isRunning() {
    return this._isRunning && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  getStatus() {
    return {
      platform: 'bilibili',
      running: this.isRunning(),
      liveRoomId: this.liveRoomId,
      wsState: this.ws ? this.ws.readyState : -1,
    };
  }
}

module.exports = BiliBiliBridge;
