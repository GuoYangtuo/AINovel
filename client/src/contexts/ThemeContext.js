import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// 定义主题配色方案
export const themeOptions = {
  default: {
    name: '默认渐变',
    primary: '#667eea',
    secondary: '#764ba2',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    cardBackground: 'rgba(255, 255, 255, 0.1)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)'
  },
  ocean: {
    name: '海洋蓝',
    primary: '#2196F3',
    secondary: '#21CBF3',
    background: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)',
    cardBackground: 'rgba(255, 255, 255, 0.1)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)'
  },
  sunset: {
    name: '日落橙',
    primary: '#FF6B6B',
    secondary: '#FFE66D',
    background: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)',
    cardBackground: 'rgba(255, 255, 255, 0.1)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)'
  },
  forest: {
    name: '森林绿',
    primary: '#4CAF50',
    secondary: '#8BC34A',
    background: 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)',
    cardBackground: 'rgba(255, 255, 255, 0.1)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)'
  },
  night: {
    name: '深夜紫',
    primary: '#9C27B0',
    secondary: '#673AB7',
    background: 'linear-gradient(135deg, #2C1810 0%, #1A1A2E 50%, #16213E 100%)',
    cardBackground: 'rgba(255, 255, 255, 0.05)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.6)'
  },
  cherry: {
    name: '樱花粉',
    primary: '#E91E63',
    secondary: '#F06292',
    background: 'linear-gradient(135deg, #E91E63 0%, #F06292 50%, #FCE4EC 100%)',
    cardBackground: 'rgba(255, 255, 255, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.8)'
  }
};

export const CustomThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentTheme, setCurrentTheme] = useState('default');

  // 从localStorage或用户设置中加载主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const userTheme = user?.theme;
    
    if (userTheme && themeOptions[userTheme]) {
      setCurrentTheme(userTheme);
      localStorage.setItem('theme', userTheme); // 同步localStorage
    } else if (savedTheme && themeOptions[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, [user]);

  // 应用CSS变量到根元素
  useEffect(() => {
    const theme = themeOptions[currentTheme];
    const root = document.documentElement;
    
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-secondary', theme.secondary);
    root.style.setProperty('--theme-background', theme.background);
    root.style.setProperty('--theme-card-background', theme.cardBackground);
    root.style.setProperty('--theme-text-primary', theme.textPrimary);
    root.style.setProperty('--theme-text-secondary', theme.textSecondary);
    
    // 更新body背景
    document.body.style.background = theme.background;
  }, [currentTheme]);

  const changeTheme = (themeName) => {
    if (themeOptions[themeName]) {
      setCurrentTheme(themeName);
      localStorage.setItem('theme', themeName);
    }
  };

  // 创建Material-UI主题
  const muiTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: themeOptions[currentTheme].primary,
      },
      secondary: {
        main: themeOptions[currentTheme].secondary,
      },
      background: {
        default: 'transparent',
        paper: themeOptions[currentTheme].cardBackground,
      },
      text: {
        primary: themeOptions[currentTheme].textPrimary,
        secondary: themeOptions[currentTheme].textSecondary,
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            background: themeOptions[currentTheme].cardBackground,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            background: themeOptions[currentTheme].cardBackground,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          },
        },
      },
    },
  });

  const value = {
    currentTheme,
    themeOptions,
    changeTheme,
    theme: themeOptions[currentTheme],
  };

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={muiTheme}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};