import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  TextField,
  Paper,
  Avatar,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import {
  ArrowBack,
  Person,
  Save,
  Palette
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, themeOptions } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';

const UserSettings = () => {
  const { user, updateUser, saveUserSettings } = useAuth();
  const { currentTheme, changeTheme } = useTheme();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    username: user?.username || '',
    email: user?.email || '',
    theme: user?.theme || currentTheme
  });
  const [isLoading, setIsLoading] = useState(false);

  // 同步当前主题到设置中
  React.useEffect(() => {
    setSettings(prev => ({
      ...prev,
      theme: user?.theme || currentTheme
    }));
  }, [user?.theme, currentTheme]);

  const handleSettingsChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleThemeChange = async (themeName) => {
    // 立即更新界面
    setSettings(prev => ({ ...prev, theme: themeName }));
    changeTheme(themeName);
    
    // 自动保存到后端
    const result = await saveUserSettings({
      username: settings.username,
      email: settings.email,
      theme: themeName
    });

    if (result.success) {
      toast.success('主题已保存！');
    } else {
      toast.error(result.message || '保存主题失败');
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    
    const result = await saveUserSettings({
      username: settings.username,
      email: settings.email,
      theme: settings.theme
    });

    if (result.success) {
      // 确保主题也同步到主题上下文
      changeTheme(settings.theme);
      toast.success('设置保存成功！');
    } else {
      toast.error(result.message || '保存设置失败');
    }
    
    setIsLoading(false);
  };

  return (
    <>
      <AppBar 
        position="fixed" 
        sx={{ 
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ color: 'white', mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            用户设置
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ 
      py: 3, 
      pt: 10, 
      px: { xs: 1, sm: 2, md: 3 } 
    }}>
        <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
          {/* 用户信息卡片 */}
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5, md: 3 },
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: 3,
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <Box display="flex" alignItems="center" mb={3}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: 'primary.main',
                    mr: 3,
                    fontSize: '1.5rem'
                  }}
                >
                  {user?.username?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h5" component="h1" gutterBottom>
                    {user?.username}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    欢迎来到 《选择之书》 ！
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* 基本设置 */}
          <Grid item xs={12}>
            <Card
              sx={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={3}>
                  <Person sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" component="h2">
                    基本设置
                  </Typography>
                </Box>

                <Box mb={3}>
                  <TextField
                    fullWidth
                    label="用户名"
                    value={settings.username}
                    onChange={(e) => handleSettingsChange('username', e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="邮箱"
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleSettingsChange('email', e.target.value)}
                    variant="outlined"
                  />
                </Box>

                <Box mt={3}>
                  <Button
                    variant="contained"
                    onClick={handleSaveSettings}
                    disabled={isLoading}
                    startIcon={<Save />}
                    sx={{
                      borderRadius: 2,
                      background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
                      }
                    }}
                  >
                    {isLoading ? '保存中...' : '保存设置'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 主题设置 */}
          <Grid item xs={12}>
            <Card
              sx={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={3}>
                  <Palette sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" component="h2">
                    主题配色
                  </Typography>
                </Box>

                <Box mb={3}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>选择主题</InputLabel>
                    <Select
                      value={settings.theme}
                      onChange={(e) => handleThemeChange(e.target.value)}
                      label="选择主题"
                    >
                      {Object.entries(themeOptions).map(([key, theme]) => (
                        <MenuItem key={key} value={key}>
                          <Box display="flex" alignItems="center" width="100%">
                            <Box
                              sx={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: `linear-gradient(45deg, ${theme.primary}, ${theme.secondary})`,
                                mr: 2,
                                border: '1px solid rgba(255,255,255,0.3)'
                              }}
                            />
                            {theme.name}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    预览当前主题效果：
                  </Typography>
                  
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {Object.entries(themeOptions).map(([key, theme]) => (
                      <Chip
                        key={key}
                        label={theme.name}
                        onClick={() => handleThemeChange(key)}
                        variant={settings.theme === key ? "filled" : "outlined"}
                        sx={{
                          background: settings.theme === key 
                            ? `linear-gradient(45deg, ${theme.primary}, ${theme.secondary})`
                            : 'transparent',
                          color: settings.theme === key ? 'white' : 'inherit',
                          borderColor: `${theme.primary}50`,
                          '&:hover': {
                            background: `linear-gradient(45deg, ${theme.primary}80, ${theme.secondary}80)`,
                            color: 'white'
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default UserSettings;