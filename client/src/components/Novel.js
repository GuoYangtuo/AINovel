import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  LinearProgress,
  Chip,
  Paper,
  Grid,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  ExitToApp,
  Person,
  ArrowBack,
  Add,
  Settings
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import VotingPanel from './VotingPanel';
import StoryDisplay from './StoryDisplay';

const Novel = () => {
  const { user, logout } = useAuth();
  const { connected, novelState, currentRoomId, isJoiningRoom, joinRoom } = useSocket();
  const [logoutDialog, setLogoutDialog] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef(null);
  const hasJoinedRoom = useRef(false);

  // 自动加入房间
  useEffect(() => {
    if (connected && roomId && currentRoomId !== roomId && !hasJoinedRoom.current) {
      console.log('自动加入房间:', roomId);
      hasJoinedRoom.current = true;
      joinRoom(roomId);
    }
    
    // 房间ID变化时重置标志
    if (currentRoomId !== roomId) {
      hasJoinedRoom.current = false;
    }
  }, [connected, roomId, currentRoomId]);

  // 更新倒计时
  useEffect(() => {
    if (novelState?.votingEndTime) {
      const updateTimer = () => {
        const remaining = Math.max(0, novelState.votingEndTime - Date.now());
        setTimeRemaining(remaining);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [novelState?.votingEndTime]);

  // 滚动导航栏隐藏/显示效果
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY.current;
      
      // 清除之前的超时
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      
      // 如果滚动距离足够大才触发隐藏/显示
      if (Math.abs(scrollDelta) > 5) {
        if (scrollDelta > 0 && currentScrollY > 100) {
          // 向下滚动且滚动位置超过100px，隐藏导航栏
          setIsNavbarVisible(false);
        } else if (scrollDelta < -20) {
          // 快速向上滚动，显示导航栏
          setIsNavbarVisible(true);
        }
        
        lastScrollY.current = currentScrollY;
      }
      
      // 滚动停止后1秒，如果在顶部附近则显示导航栏
      scrollTimeout.current = setTimeout(() => {
        if (currentScrollY < 100) {
          setIsNavbarVisible(true);
        }
      }, 1000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

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

  const getTotalVotes = () => {
    if (!novelState?.votes) return 0;
    return Object.values(novelState.votes).reduce((sum, count) => sum + count, 0);
  };

  return (
    <>
      <AppBar 
        position="fixed" 
        sx={{ 
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          transform: isNavbarVisible ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.3s ease-in-out',
          zIndex: 1100
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
            AI交互小说 {currentRoomId && `- 房间: ${currentRoomId}`}
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

      <Container maxWidth="md" sx={{ 
        py: 3, 
        pt: 10, 
        px: { xs: 1, sm: 2, md: 3 } 
      }}>
        {!connected && (
          <Card sx={{ mb: 3, bgcolor: 'rgba(255, 152, 0, 0.1)' }}>
            <CardContent>
              <Typography variant="h6" color="warning.main" gutterBottom>
                连接中...
              </Typography>
              <Typography variant="body2">
                正在连接到服务器，请稍候...
              </Typography>
              <LinearProgress sx={{ mt: 2 }} />
            </CardContent>
          </Card>
        )}

        {connected && isJoiningRoom && (
          <Card sx={{ mb: 3, bgcolor: 'rgba(33, 150, 243, 0.1)' }}>
            <CardContent>
              <Typography variant="h6" color="info.main" gutterBottom>
                加入房间中...
              </Typography>
              <Typography variant="body2">
                正在加入小说房间 {roomId}，请稍候...
              </Typography>
              <LinearProgress sx={{ mt: 2 }} />
            </CardContent>
          </Card>
        )}

        {connected && !isJoiningRoom && !novelState && (
          <Card sx={{ mb: 3, bgcolor: 'rgba(33, 150, 243, 0.1)' }}>
            <CardContent>
              <Typography variant="h6" color="info.main" gutterBottom>
                小说准备中...
              </Typography>
              <Typography variant="body2">
                AI正在生成精彩的故事开头，请稍候...
              </Typography>
              <LinearProgress sx={{ mt: 2 }} />
            </CardContent>
          </Card>
        )}

        {connected && !isJoiningRoom && novelState && (
          <StoryDisplay 
            currentStory={novelState.currentStory}
            storyHistory={novelState.storyHistory}
            isLoading={!novelState.currentStory}
            choices={novelState.choices || []}
            votes={novelState.votes || {}}
            userVote={novelState.userVotes?.[user?.id]}
            isVoting={novelState.isVoting}
            isGenerating={novelState.isGenerating}
            timeRemaining={timeRemaining}
            totalVotes={getTotalVotes()}
            formatTime={formatTime}
            connected={connected}
            discussion={novelState.discussion || { messages: [], isActive: false }}
          />
        )}
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

export default Novel;