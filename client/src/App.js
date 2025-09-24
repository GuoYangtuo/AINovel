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
  const { user } = useAuth();

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