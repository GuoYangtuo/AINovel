const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readUsers, writeUsers } = require('../utils/fileUtils');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const JWT_SECRET = 'your_jwt_secret_key_here'; // 在生产环境中应该使用环境变量

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
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    writeUsers(users);
    
    // 生成 JWT token
    const token = jwt.sign({ userId: newUser.id, username }, JWT_SECRET, { expiresIn: '24h' });
    
    res.status(201).json({
      message: '注册成功',
      token,
      user: { id: newUser.id, username }
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
      user: { id: user.id, username }
    });
    
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;