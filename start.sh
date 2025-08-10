#!/bin/bash

echo "================================"
echo "    AI交互式小说启动脚本"
echo "================================"
echo

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未找到Node.js，请先安装Node.js"
    exit 1
fi

echo "Node.js已安装: $(node --version)"
echo

# 安装后端依赖
echo "安装后端依赖..."
cd server
if [ ! -d "node_modules" ]; then
    echo "首次运行，正在安装后端依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "后端依赖安装失败"
        exit 1
    fi
fi

# 启动后端服务器
echo "启动后端服务器..."
gnome-terminal --title="AI小说后端" -- bash -c "echo '后端服务器启动中...'; npm start; exec bash" 2>/dev/null || \
xterm -title "AI小说后端" -e "echo '后端服务器启动中...'; npm start; exec bash" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd \"$(pwd)\" && echo \"后端服务器启动中...\" && npm start"' 2>/dev/null || \
echo "请在新终端中运行: cd server && npm start"

cd ..

# 安装前端依赖
echo "安装前端依赖..."
cd client
if [ ! -d "node_modules" ]; then
    echo "首次运行，正在安装前端依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "前端依赖安装失败"
        exit 1
    fi
fi

# 等待后端启动
echo "等待后端服务器启动..."
sleep 5

# 启动前端应用
echo "启动前端应用..."
gnome-terminal --title="AI小说前端" -- bash -c "echo '前端应用启动中...'; npm start; exec bash" 2>/dev/null || \
xterm -title "AI小说前端" -e "echo '前端应用启动中...'; npm start; exec bash" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd \"$(pwd)\" && echo \"前端应用启动中...\" && npm start"' 2>/dev/null || \
echo "请在新终端中运行: cd client && npm start"

echo
echo "================================"
echo "应用已启动！"
echo "后端服务器: http://localhost:3001"
echo "前端应用: http://localhost:3000"
echo "================================"
echo
echo "浏览器将自动打开，如果没有请手动访问:"
echo "http://localhost:3000"
echo

# 尝试打开浏览器
if command -v xdg-open > /dev/null; then
    sleep 10 && xdg-open http://localhost:3000 &
elif command -v open > /dev/null; then
    sleep 10 && open http://localhost:3000 &
fi