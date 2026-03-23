/**
 * Admin 用户初始化脚本
 * 运行一次即可创建 admin 用户
 * 用法: node scripts/initAdmin.js
 */
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const usersFile = path.join(__dirname, '..', 'data', 'users.json');
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123'; // 建议首次运行后修改

function readUsers() {
  if (!fs.existsSync(usersFile)) {
    return [];
  }
  const raw = fs.readFileSync(usersFile, 'utf-8');
  return JSON.parse(raw);
}

function writeUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf-8');
}

async function initAdmin() {
  const users = readUsers();

  // 检查是否已存在 admin 用户
  const existingAdmin = users.find(u => u.username === ADMIN_USERNAME && u.role === 'admin');
  if (existingAdmin) {
    console.log(`Admin 用户 "${ADMIN_USERNAME}" 已存在，role 为 "${existingAdmin.role}"`);
    console.log('如需重置密码，请手动修改 users.json 中该用户的 password 字段');
    return;
  }

  // 检查是否已存在 admin 用户名但非 admin 角色
  const existingUser = users.find(u => u.username === ADMIN_USERNAME);
  if (existingUser) {
    console.log(`用户 "${ADMIN_USERNAME}" 已存在，正在将其升级为 admin...`);
    existingUser.role = 'admin';
    writeUsers(users);
    console.log('已升级！');
    return;
  }

  // 创建新 admin 用户
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);

  const adminUser = {
    id: uuidv4(),
    username: ADMIN_USERNAME,
    password: hashedPassword,
    coins: 999999,
    role: 'admin',
    createdAt: new Date().toISOString()
  };

  users.push(adminUser);
  writeUsers(users);

  console.log('========================================');
  console.log('  Admin 用户创建成功！');
  console.log('========================================');
  console.log(`  用户名: ${ADMIN_USERNAME}`);
  console.log(`  密码:   ${ADMIN_PASSWORD}`);
  console.log('========================================');
  console.log('  ⚠️  请尽快登录后修改密码！');
  console.log('========================================');
}

initAdmin().catch(err => {
  console.error('初始化失败:', err);
  process.exit(1);
});
