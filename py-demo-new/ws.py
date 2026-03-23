import asyncio
import json
import websockets
import requests
import time
import hashlib
import hmac
import random
import warnings
from hashlib import sha256
import proto

# 抑制 HTTPS 警告
warnings.filterwarnings("ignore", category=requests.packages.urllib3.exceptions.InsecureRequestWarning)

# 日志开关
QUIET_MODE = True  # True = 只输出关键事件

def _log(*args, **kwargs):
    if not QUIET_MODE:
        print(*args, **kwargs)

def _event(cmd, data):
    """只输出关键事件"""
    if cmd == "LIVE_OPEN_PLATFORM_LIVE_START":
        print(f"[直播] 开始 - {data.get('title','')} / {data.get('area_name','')}")
    elif cmd == "LIVE_OPEN_PLATFORM_LIVE_END":
        print(f"[直播] 结束 - {data.get('title','')}")
    elif cmd == "LIVE_OPEN_PLATFORM_DM":
        uname = data.get("uname", "")
        msg = data.get("msg", "")
        print(f"[弹幕] {uname}: {msg}")
    elif cmd == "LIVE_OPEN_PLATFORM_LIVE_ROOM_ENTER":
        uname = data.get("uname", "")
        print(f"[进房] {uname} 进入了直播间")
    elif cmd == "LIVE_OPEN_PLATFORM_LIVE_ROOM_ENTER_CANCEL":
        uname = data.get("uname", "")
        print(f"[离开] {uname} 离开了直播间")
    elif cmd == "INTERACT_WORD":
        uname = data.get("uname", "")
        print(f"[互动] {uname} 点赞了")
    elif cmd == "DANMU_MSG":
        # 老版弹幕协议兼容
        info = data.get("info", [])
        if len(info) >= 2:
            uname = info[2][1] if len(info[2]) > 1 else ""
            msg = info[1] if len(info) > 1 else ""
            print(f"[弹幕] {uname}: {msg}")
    elif cmd == "LIVE_OPEN_PLATFORM_SEND_GIFT":
        uname = data.get("uname", "")
        gift_name = data.get("gift_name", "")
        gift_num = data.get("gift_num", 1)
        print(f"[礼物] {uname} 送出 {gift_num} 个 {gift_name}")
    else:
        # 未知命令也打印，方便调试
        if not QUIET_MODE:
            print(f"[{cmd}] {json.dumps(data, ensure_ascii=False)}")


class BiliClient:
    def __init__(self, idCode, appId, key, secret, host):
        self.idCode = idCode
        self.appId = appId
        self.key = key
        self.secret = secret
        self.host = host
        self.gameId = ''
        pass

    # 事件循环
    def run(self):
        loop = asyncio.get_event_loop()
        # 建立连接
        websocket = loop.run_until_complete(self.connect())
        tasks = [
            # 读取信息
            asyncio.ensure_future(self.recvLoop(websocket)),
            # 发送心跳
            asyncio.ensure_future(self.heartBeat(websocket)),
             # 发送游戏心跳
            asyncio.ensure_future(self.appheartBeat()),
        ]
        loop.run_until_complete(asyncio.gather(*tasks))

    # http的签名
    def sign(self, params):
        key = self.key
        secret = self.secret
        md5 = hashlib.md5()
        md5.update(params.encode())
        ts = time.time()
        nonce = random.randint(1, 100000)+time.time()
        md5data = md5.hexdigest()
        headerMap = {
            "x-bili-timestamp": str(int(ts)),
            "x-bili-signature-method": "HMAC-SHA256",
            "x-bili-signature-nonce": str(nonce),
            "x-bili-accesskeyid": key,
            "x-bili-signature-version": "1.0",
            "x-bili-content-md5": md5data,
        }

        headerList = sorted(headerMap)
        headerStr = ''

        for key in headerList:
            headerStr = headerStr + key+":"+str(headerMap[key])+"\n"
        headerStr = headerStr.rstrip("\n")

        appsecret = secret.encode()
        data = headerStr.encode()
        signature = hmac.new(appsecret, data, digestmod=sha256).hexdigest()
        headerMap["Authorization"] = signature
        headerMap["Content-Type"] = "application/json"
        headerMap["Accept"] = "application/json"
        return headerMap

    # 获取长连信息
    def getWebsocketInfo(self):
        # 开启应用
        postUrl = "%s/v2/app/start" % self.host
        params = '{"code":"%s","app_id":%d}' % (self.idCode, self.appId)
        headerMap = self.sign(params)
        r = requests.post(url=postUrl, headers=headerMap,
                          data=params, verify=False)
        data = json.loads(r.content)
        self.gameId = data['data']['game_info']['game_id']
        wss_link = data['data']['websocket_info']['wss_link'][0]
        auth_body = data['data']['websocket_info']['auth_body']
        _log(f"[连接] wss={wss_link}")
        return wss_link, auth_body

     # 发送游戏心跳
    async def appheartBeat(self):
        while True:
            await asyncio.ensure_future(asyncio.sleep(20))
            postUrl = "%s/v2/app/heartbeat" % self.host
            params = '{"game_id":"%s"}' % (self.gameId)
            headerMap = self.sign(params)
            r = requests.post(url=postUrl, headers=headerMap,
                          data=params, verify=False)
            _log(f"[BiliClient] send appheartBeat")


    # 发送鉴权信息
    async def auth(self, websocket, authBody):
        req = proto.Proto()
        req.body = authBody
        req.op = 7
        await websocket.send(req.pack())
        buf = await websocket.recv()
        resp = proto.Proto()
        resp.unpack(buf)
        respBody = json.loads(resp.body)
        if respBody["code"] != 0:
            print(f"[错误] auth 失败: {respBody}")
        else:
            print("[连接] auth 成功")

    # 发送心跳
    async def heartBeat(self, websocket):
        while True:
            await asyncio.ensure_future(asyncio.sleep(20))
            req = proto.Proto()
            req.op = 2
            await websocket.send(req.pack())
            _log(f"[BiliClient] send heartBeat")

    # 读取信息
    async def recvLoop(self, websocket):
        print("[BiliClient] 开始接收消息...")
        while True:
            recvBuf = await websocket.recv()
            resp = proto.Proto()
            resp.unpack(recvBuf)
            try:
                body = json.loads(resp.body)
                cmd = body.get("cmd", "")
                data = body.get("data", {})
                _event(cmd, data)
            except (json.JSONDecodeError, KeyError):
                _log(f"[原始] {resp.body}")

    # 建立连接
    async def connect(self):
        addr, authBody = self.getWebsocketInfo()
        _log(f"[连接] addr={addr}")
        websocket = await websockets.connect(addr)
        # 鉴权
        await self.auth(websocket, authBody)
        return websocket

    def __enter__(self):
        print("[BiliClient] 进入连接...")

    def __exit__(self, type, value, trace):
        postUrl = "%s/v2/app/end" % self.host
        params = '{"game_id":"%s","app_id":%d}' % (self.gameId, self.appId)
        headerMap = self.sign(params)
        r = requests.post(url=postUrl, headers=headerMap,
                          data=params, verify=False)
        print("[BiliClient] 结束应用成功")


if __name__ == '__main__':
    try:
        cli = BiliClient(
            idCode="FGAIJ5Z73HTS0",  # 主播身份码
            appId=1777549858214,  # 应用id
            key="L9mNDCQ14ylFemim89CU7K3F",  # access_key
            secret="jgYj05e7qzM1yzBeqY0qgTDyIjsWkz",  # access_key_secret
            host="https://live-open.biliapi.com") # 开放平台 (线上环境)
        with cli:
            cli.run()
    except Exception as e:
        print("err", e)
        
