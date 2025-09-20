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
  ListItemText,
  TextField,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  ExitToApp,
  Person,
  PlayArrow,
  PeopleAlt,
  Schedule,
  BookmarkBorder,
  Add,
  Settings,
  MonetizationOn
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const HomePage = () => {
  const { user, logout, fetchCoins, rechargeCoins } = useAuth();
  const navigate = useNavigate();
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logoutDialog, setLogoutDialog] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [rechargeDialog, setRechargeDialog] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeLoading, setRechargeLoading] = useState(false);

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

  // 获取用户金币余额
  useEffect(() => {
    if (user) {
      fetchCoins();
    }
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

  const handleOpenRecharge = () => {
    handleUserMenuClose();
    setRechargeDialog(true);
  };

  const handleRecharge = async () => {
    const amount = parseInt(rechargeAmount);
    if (!amount || amount <= 0) {
      return;
    }

    setRechargeLoading(true);
    const result = await rechargeCoins(amount);
    setRechargeLoading(false);

    if (result.success) {
      setRechargeDialog(false);
      setRechargeAmount('');
    }
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
            选择之书 - 选择你想要体验的故事
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
            选择之书
          </Typography>
          <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 3 }}>
            选择一个正在进行的故事，参与其中，剧情的发展会被你的选择影响
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
        <MenuItem disabled sx={{ color: 'white', opacity: 1 }}>
          <ListItemIcon>
            <MonetizationOn sx={{ color: '#ffd700' }} />
          </ListItemIcon>
          <ListItemText 
            primary={`金币余额: ${user?.coins || 0}`} 
            sx={{ '& .MuiListItemText-primary': { fontWeight: 'bold' } }}
          />
        </MenuItem>
        <MenuItem onClick={handleOpenRecharge}>
          <ListItemIcon>
            <MonetizationOn sx={{ color: 'white' }} />
          </ListItemIcon>
          <ListItemText primary="充值金币" />
        </MenuItem>
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

      {/* 充值对话框 */}
      <Dialog
        open={rechargeDialog}
        onClose={() => !rechargeLoading && setRechargeDialog(false)}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            minWidth: '400px'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MonetizationOn sx={{ color: '#ffd700' }} />
          金币充值
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            当前金币余额: {user?.coins || 0}
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              选择充值金额:
            </Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              {[100, 500, 1000, 2000].map((amount) => (
                <Grid item xs={6} key={amount}>
                  <Button
                    variant={rechargeAmount === amount.toString() ? "contained" : "outlined"}
                    fullWidth
                    onClick={() => setRechargeAmount(amount.toString())}
                    sx={{ py: 1 }}
                  >
                    {amount} 金币
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>

          <TextField
            fullWidth
            label="自定义充值金额"
            value={rechargeAmount}
            onChange={(e) => setRechargeAmount(e.target.value)}
            type="number"
            inputProps={{ min: 1, max: 10000 }}
            variant="outlined"
            disabled={rechargeLoading}
          />
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            * 最小充值1金币，最大充值10000金币
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setRechargeDialog(false)}
            disabled={rechargeLoading}
          >
            取消
          </Button>
          <Button 
            onClick={handleRecharge} 
            color="primary" 
            variant="contained"
            disabled={rechargeLoading || !rechargeAmount || parseInt(rechargeAmount) <= 0}
            startIcon={rechargeLoading ? <CircularProgress size={16} /> : <MonetizationOn />}
          >
            {rechargeLoading ? '充值中...' : `充值 ${rechargeAmount || 0} 金币`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default HomePage;