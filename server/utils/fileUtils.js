const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../data/users.json');

// 确保data目录存在
const dataDir = path.dirname(USERS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 读取用户数据
function readUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取用户文件错误:', error);
    return [];
  }
}

// 写入用户数据
function writeUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('写入用户文件错误:', error);
    throw error;
  }
}

module.exports = {
  readUsers,
  writeUsers
};