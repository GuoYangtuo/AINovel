const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readUsers, writeUsers } = require('../utils/fileUtils');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const JWT_SECRET = 'your_jwt_secret_key_here'; // 在生产环境中应该使用环境变量

// 中间件：验证JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '访问令牌不存在' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '无效的访问令牌' });
    }
    req.user = user;
    next();
  });
};

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }
    
    const users = readUsers();
    
    // 检查用户是否已存在
    if (users.find(user => user.username === username)) {
      return res.status(400).json({ message: '用户名已存在' });
    }
    
    // 密码加密
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // 创建新用户
    const newUser = {
      id: uuidv4(),
      username,
      password: hashedPassword,
      coins: 1000, // 新用户默认1000金币
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    writeUsers(users);
    
    // 生成 JWT token
    const token = jwt.sign({ userId: newUser.id, username }, JWT_SECRET, { expiresIn: '24h' });
    
    res.status(201).json({
      message: '注册成功',
      token,
      user: { id: newUser.id, username, theme: 'default', coins: newUser.coins }
    });
    
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }
    
    const users = readUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) {
      return res.status(400).json({ message: '用户名或密码错误' });
    }
    
    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(400).json({ message: '用户名或密码错误' });
    }
    
    // 生成 JWT token
    const token = jwt.sign({ userId: user.id, username }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({
      message: '登录成功',
      token,
      user: { id: user.id, username, theme: user.theme || 'default', coins: user.coins || 0 }
    });
    
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新用户设置
router.put('/update-settings', authenticateToken, async (req, res) => {
  try {
    const { username, email, theme } = req.body;
    const userId = req.user.userId;
    
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 如果要更新用户名，检查是否已存在
    if (username && username !== users[userIndex].username) {
      const existingUser = users.find(u => u.username === username && u.id !== userId);
      if (existingUser) {
        return res.status(400).json({ message: '用户名已存在' });
      }
      users[userIndex].username = username;
    }
    
    // 更新其他字段
    if (email !== undefined) {
      users[userIndex].email = email;
    }
    
    if (theme !== undefined) {
      users[userIndex].theme = theme;
    }
    
    users[userIndex].updatedAt = new Date().toISOString();
    
    writeUsers(users);
    
    res.json({
      message: '设置更新成功',
      user: {
        id: users[userIndex].id,
        username: users[userIndex].username,
        email: users[userIndex].email,
        theme: users[userIndex].theme || 'default',
        coins: users[userIndex].coins || 0
      }
    });
    
  } catch (error) {
    console.error('更新设置错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取用户金币余额
router.get('/coins', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const users = readUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    res.json({
      success: true,
      coins: user.coins || 0
    });
    
  } catch (error) {
    console.error('获取金币余额错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 金币充值
router.post('/recharge', authenticateToken, (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.userId;
    
    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      return res.status(400).json({ message: '充值金额必须是正整数' });
    }
    
    if (amount > 10000) {
      return res.status(400).json({ message: '单次充值金额不能超过10000' });
    }
    
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 增加金币
    users[userIndex].coins = (users[userIndex].coins || 0) + amount;
    users[userIndex].updatedAt = new Date().toISOString();
    
    writeUsers(users);
    
    res.json({
      success: true,
      message: `充值成功！获得${amount}金币`,
      coins: users[userIndex].coins,
      rechargeAmount: amount
    });
    
  } catch (error) {
    console.error('充值错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 扣除金币（内部接口，用于投票后扣费）
router.post('/deduct-coins', authenticateToken, (req, res) => {
  try {
    const { amount, reason } = req.body;
    const userId = req.user.userId;
    
    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      return res.status(400).json({ message: '扣除金额必须是正整数' });
    }
    
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    const currentCoins = users[userIndex].coins || 0;
    if (currentCoins < amount) {
      return res.status(400).json({ message: '金币余额不足' });
    }
    
    // 扣除金币
    users[userIndex].coins = currentCoins - amount;
    users[userIndex].updatedAt = new Date().toISOString();
    
    writeUsers(users);
    
    res.json({
      success: true,
      message: `扣除成功！消费${amount}金币${reason ? ` (${reason})` : ''}`,
      coins: users[userIndex].coins,
      deductedAmount: amount
    });
    
  } catch (error) {
    console.error('扣除金币错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;