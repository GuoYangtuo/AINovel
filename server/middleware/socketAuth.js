const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

function authenticateSocket(socket, next) {
  const token = socket.handshake.auth.token;
  
  // 调试模式：自动为每个客户端生成临时用户身份
  if (DEBUG_MODE) {
    if (!token || token === 'debug') {
      // 从客户端获取设备ID，如果没有则使用socket ID
      const deviceId = socket.handshake.auth.deviceId || socket.id;
      socket.userId = `debug_${deviceId}`;
      socket.username = `测试用户_${deviceId.substring(0, 6)}`;
      console.log(`[调试模式] 自动登录: ${socket.username}`);
      return next();
    }
    
    // 尝试解析token，如果失败也继续
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      return next();
    } catch (error) {
      // 调试模式下，即使token无效也允许连接
      const deviceId = socket.handshake.auth.deviceId || socket.id;
      socket.userId = `debug_${deviceId}`;
      socket.username = `测试用户_${deviceId.substring(0, 6)}`;
      console.log(`[调试模式] Token无效，使用临时身份: ${socket.username}`);
      return next();
    }
  }
  
  // 生产模式：严格验证token
  if (!token) {
    return next(new Error('认证失败: 未提供token'));
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  } catch (error) {
    next(new Error('认证失败: 无效token'));
  }
}

module.exports = {
  authenticateSocket
};