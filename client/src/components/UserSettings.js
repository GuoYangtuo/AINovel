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
  Grid
} from '@mui/material';
import {
  ArrowBack,
  Person,
  Save
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const UserSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    username: user?.username || '',
    email: user?.email || ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSettingsChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // 这里可以添加保存设置的API调用
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟API调用
      toast.success('设置保存成功！');
    } catch (error) {
      toast.error('保存设置失败，请重试');
    } finally {
      setIsLoading(false);
    }
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

      <Container maxWidth="md" sx={{ py: 3, pt: 10 }}>
        <Grid container spacing={3}>
          {/* 用户信息卡片 */}
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
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
                    欢迎来到AI交互小说世界
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
        </Grid>
      </Container>
    </>
  );
};

export default UserSettings;