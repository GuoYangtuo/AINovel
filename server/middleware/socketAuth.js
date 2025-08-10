const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_jwt_secret_key_here'; // 应该与auth.js中的保持一致

function authenticateSocket(socket, next) {
  const token = socket.handshake.auth.token;
  
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