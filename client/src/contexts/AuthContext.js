import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

// 检查是否启用调试模式
const DEBUG_MODE = process.env.REACT_APP_DEBUG_MODE === 'true';

// 生成或获取设备唯一ID
const getDeviceId = () => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    // 生成随机ID（基于时间戳和随机数）
    deviceId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 调试模式：自动登录
    if (DEBUG_MODE) {
      const deviceId = getDeviceId();
      const debugUser = {
        userId: `debug_${deviceId}`,
        username: `测试用户_${deviceId.substring(0, 6)}`,
        coins: 1000 // 调试模式下的初始金币
      };
      
      setToken('debug');
      setUser(debugUser);
      
      console.log('[调试模式] 自动登录:', debugUser.username);
      setLoading(false);
      return;
    }
    
    // 生产模式：检查本地存储中的token
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      const { token: newToken, user: newUser } = response.data;
      
      setToken(newToken);
      setUser(newUser);
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      toast.success('登录成功！');
      return { success: true };
      
    } catch (error) {
      const message = error.response?.data?.message || '登录失败';
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/register', {
        username,
        password
      });

      const { token: newToken, user: newUser } = response.data;
      
      setToken(newToken);
      setUser(newUser);
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      toast.success('注册成功！');
      return { success: true };
      
    } catch (error) {
      const message = error.response?.data?.message || '注册失败';
      toast.error(message);
      return { success: false, message };
    }
  };

  const updateUser = (updatedUserData) => {
    const newUser = { ...user, ...updatedUserData };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const saveUserSettings = async (settings) => {
    try {
      const response = await axios.put('/api/auth/update-settings', settings);
      
      if (response.data && response.data.user) {
        // 更新用户信息
        updateUser(response.data.user);
        return { success: true, data: response.data };
      }
      
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || '保存设置失败';
      return { success: false, message };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    toast.success('已退出登录');
  };

  // 获取用户金币余额
  const fetchCoins = async () => {
    try {
      const response = await axios.get('/api/auth/coins');
      if (response.data.success) {
        updateUser({ coins: response.data.coins });
        return response.data.coins;
      }
    } catch (error) {
      console.error('获取金币余额失败:', error);
    }
    return user?.coins || 0;
  };

  // 金币充值
  const rechargeCoins = async (amount) => {
    try {
      const response = await axios.post('/api/auth/recharge', { amount });
      if (response.data.success) {
        updateUser({ coins: response.data.coins });
        toast.success(response.data.message);
        return { success: true, coins: response.data.coins };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || '充值失败';
      toast.error(message);
      return { success: false, message };
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    updateUser,
    saveUserSettings,
    fetchCoins,
    rechargeCoins,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};