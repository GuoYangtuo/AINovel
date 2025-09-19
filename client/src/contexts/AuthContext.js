import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

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
    // 检查本地存储中的token
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

  const value = {
    user,
    token,
    login,
    register,
    logout,
    updateUser,
    saveUserSettings,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};