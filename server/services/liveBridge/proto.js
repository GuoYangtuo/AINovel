/**
 * BiliBili 开放平台协议封装
 * 负责处理 WebSocket 消息的打包和解析
 * 协议格式（big-endian）：
 *   4 bytes: packetLen = headerLen(16) + bodyLen
 *   2 bytes: headerLen = 16
 *   2 bytes: ver (2=JSON)
 *   4 bytes: op (7=auth, 2=heartbeat)
 *   4 bytes: seq
 */

class Proto {
  constructor() {
    this.headerLen = 16;
    this.op = 0;
    this.body = '';
  }

  pack(body) {
    const bodyStr = body !== undefined ? body : (this.body !== undefined ? this.body : '');
    const bodyBytes = Buffer.from(bodyStr, 'utf-8');
    const totalLen = this.headerLen + bodyBytes.length;
    const header = Buffer.alloc(this.headerLen);

    // 4 bytes: total package length
    header.writeUInt32BE(totalLen, 0);
    // 2 bytes: header length
    header.writeUInt16BE(this.headerLen, 4);
    // 2 bytes: protocol version (2=JSON)
    header.writeUInt16BE(2, 6);
    // 4 bytes: operation type
    header.writeUInt32BE(this.op, 8);
    // 4 bytes: sequence id
    header.writeUInt32BE(1, 12);

    return Buffer.concat([header, bodyBytes]);
  }

  unpack(buffer) {
    if (!buffer || buffer.length < this.headerLen) {
      return null;
    }

    const packetLen = buffer.readUInt32BE(0);
    if (buffer.length < packetLen) {
      return null;
    }

    const bodyLen = packetLen - this.headerLen;
    const body = bodyLen > 0 ? buffer.slice(this.headerLen, packetLen) : Buffer.alloc(0);
    return {
      op: buffer.readUInt32BE(8),
      seq: buffer.readUInt32BE(12),
      body: body.toString('utf-8')
    };
  }
}

module.exports = Proto;
