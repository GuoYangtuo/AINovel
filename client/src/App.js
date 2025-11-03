import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';

import Login from './components/Login';
import Register from './components/Register';
import Novel from './components/Novel';
import HomePage from './components/HomePage';
import CreateRoom from './components/CreateRoom';
import UserSettings from './components/UserSettings';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { CustomThemeProvider } from './contexts/ThemeContext';

// 移除了静态主题定义，现在使用动态主题系统

function AppRoutes() {
  const { user, loading } = useAuth();
  const DEBUG_MODE = process.env.REACT_APP_DEBUG_MODE === 'true';

  // 如果还在加载用户信息，显示加载状态
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'white'
      }}>
        <div>加载中...</div>
      </div>
    );
  }

  // 调试模式：允许访问所有页面
  if (DEBUG_MODE) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/novel/:roomId" element={<Novel />} />
        <Route path="/create-room" element={<CreateRoom />} />
        <Route path="/settings" element={<UserSettings />} />
        <Route path="/" element={<HomePage />} />
      </Routes>
    );
  }

  // 生产模式：需要登录认证
  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
      <Route path="/novel/:roomId" element={user ? <Novel /> : <Navigate to="/login" />} />
      <Route path="/create-room" element={user ? <CreateRoom /> : <Navigate to="/login" />} />
      <Route path="/settings" element={user ? <UserSettings /> : <Navigate to="/login" />} />
      <Route path="/" element={user ? <HomePage /> : <Navigate to="/login" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <CustomThemeProvider>
        <CssBaseline />
        <SocketProvider>
          <Router>
            <div style={{ minHeight: '100vh' }}>
              <AppRoutes />
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  },
                }}
              />
            </div>
          </Router>
        </SocketProvider>
      </CustomThemeProvider>
    </AuthProvider>
  );
}

export default App;