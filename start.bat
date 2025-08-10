@echo off
title AI交互式小说 - 启动脚本
echo ================================
echo    AI交互式小说启动脚本
echo ================================
echo.

echo 正在检查Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)

echo Node.js已安装
echo.

echo 安装后端依赖...
cd server
if not exist node_modules (
    echo 首次运行，正在安装后端依赖...
    call npm install
    if errorlevel 1 (
        echo 后端依赖安装失败
        pause
        exit /b 1
    )
)

echo 启动后端服务器...
start cmd /k "title AI小说后端 && echo 后端服务器启动中... && npm start"

cd ..

echo 安装前端依赖...
cd client
if not exist node_modules (
    echo 首次运行，正在安装前端依赖...
    call npm install
    if errorlevel 1 (
        echo 前端依赖安装失败
        pause
        exit /b 1
    )
)

echo 等待后端服务器启动...
timeout /t 5 /nobreak

echo 启动前端应用...
start cmd /k "title AI小说前端 && echo 前端应用启动中... && npm start"

echo.
echo ================================
echo 应用已启动！
echo 后端服务器: http://localhost:3001
echo 前端应用: http://localhost:3000
echo ================================
echo.
echo 浏览器将自动打开，如果没有请手动访问:
echo http://localhost:3000
echo.
echo 按任意键退出...
pause >nul