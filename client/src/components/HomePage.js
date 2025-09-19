import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  ExitToApp,
  Person,
  PlayArrow,
  PeopleAlt,
  Schedule,
  BookmarkBorder,
  Add,
  Settings
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const HomePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logoutDialog, setLogoutDialog] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  // 获取小说列表
  useEffect(() => {
    const fetchNovels = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/novels');
        if (response.data.success) {
          setNovels(response.data.novels);
        } else {
          setError('获取小说列表失败');
        }
      } catch (error) {
        console.error('获取小说列表失败:', error);
        setError('连接服务器失败');
      } finally {
        setLoading(false);
      }
    };

    fetchNovels();
    
    // 每30秒刷新一次列表
    const interval = setInterval(fetchNovels, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    setLogoutDialog(false);
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleCreateRoom = () => {
    handleUserMenuClose();
    navigate('/create-room');
  };

  const handleGoToSettings = () => {
    handleUserMenuClose();
    navigate('/settings');
  };

  const joinNovel = (roomId) => {
    navigate(`/novel/${roomId}`);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return '刚刚创建';
    if (diffInMinutes < 60) return `${diffInMinutes} 分钟前创建`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} 小时前创建`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} 天前创建`;
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
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            AI交互小说 - 选择小说
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              icon={<Person />}
              label={user?.username}
              color="primary"
              variant="outlined"
              onClick={handleUserMenuOpen}
              sx={{ 
                color: 'white', 
                borderColor: 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.8)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            />
            
            <IconButton
              color="inherit"
              onClick={() => setLogoutDialog(true)}
              sx={{ color: 'white' }}
            >
              <ExitToApp />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container 
        maxWidth="lg" 
        sx={{ 
          py: 3, 
          pt: 10,
          px: { xs: 1, sm: 2, md: 3 }
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3, md: 4 },
            mb: { xs: 2, sm: 3, md: 4 },
            mx: { xs: 0, sm: 'auto' },
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', mb: 2 }}>
            欢迎来到AI交互小说世界
          </Typography>
          <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 3 }}>
            选择一个正在进行的故事，参与其中，影响剧情发展
          </Typography>
          
          {loading && (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress />
              <Typography variant="body1" sx={{ ml: 2 }}>
                正在加载小说列表...
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && novels.length === 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              暂时没有正在运行的小说，请稍后再试。
            </Alert>
          )}

          <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
            {novels.map((novel) => (
              <Grid item xs={12} md={6} key={novel.roomId}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 2.5, md: 3 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', flex: 1 }}>
                        {novel.title}
                      </Typography>
                      <Chip
                        icon={novel.isActive ? <PlayArrow /> : <BookmarkBorder />}
                        label={novel.isActive ? '进行中' : '准备中'}
                        color={novel.isActive ? 'success' : 'warning'}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>

                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 3, 
                        minHeight: '60px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {novel.currentStory || '故事即将开始...'}
                    </Typography>

                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PeopleAlt fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {novel.connectedUsers} 人在线
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Schedule fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {formatTime(novel.createdAt)}
                        </Typography>
                      </Box>
                    </Box>

                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={() => joinNovel(novel.roomId)}
                      sx={{
                        mt: 'auto',
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '1.1rem',
                        py: 1.5,
                        background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
                        }
                      }}
                    >
                      {novel.isActive ? '加入故事' : '等待开始'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>

      {/* 用户下拉菜单 */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            minWidth: 200
          }
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleCreateRoom}>
          <ListItemIcon>
            <Add sx={{ color: 'white' }} />
          </ListItemIcon>
          <ListItemText primary="创建房间" />
        </MenuItem>
        <MenuItem onClick={handleGoToSettings}>
          <ListItemIcon>
            <Settings sx={{ color: 'white' }} />
          </ListItemIcon>
          <ListItemText primary="用户设置" />
        </MenuItem>
      </Menu>

      {/* 退出确认对话框 */}
      <Dialog
        open={logoutDialog}
        onClose={() => setLogoutDialog(false)}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }
        }}
      >
        <DialogTitle>确认退出</DialogTitle>
        <DialogContent>
          <Typography>
            你确定要退出登录吗？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialog(false)}>
            取消
          </Button>
          <Button onClick={handleLogout} color="primary" variant="contained">
            确认退出
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default HomePage;