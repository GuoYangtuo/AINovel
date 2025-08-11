import React, { useState, useEffect } from 'react';
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
  Grid
} from '@mui/material';
import {
  ExitToApp,
  AccessTime,
  HowToVote,
  Person
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import VotingPanel from './VotingPanel';
import StoryDisplay from './StoryDisplay';

const Novel = () => {
  const { user, logout } = useAuth();
  const { connected, novelState } = useSocket();
  const [logoutDialog, setLogoutDialog] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

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

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleLogout = () => {
    logout();
    setLogoutDialog(false);
  };

  const getTotalVotes = () => {
    if (!novelState?.votes) return 0;
    return Object.values(novelState.votes).reduce((sum, count) => sum + count, 0);
  };

  return (
    <>
      <AppBar position="sticky" sx={{ 
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            AI交互小说
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              icon={<Person />}
              label={user?.username}
              color="primary"
              variant="outlined"
              sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)' }}
            />
            
            <Chip
              icon={connected ? <HowToVote /> : <AccessTime />}
              label={connected ? '已连接' : '连接中...'}
              color={connected ? 'success' : 'warning'}
              variant="outlined"
              sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)' }}
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

      <Container maxWidth="lg" sx={{ py: 3 }}>
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

        {connected && !novelState && (
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

        {connected && novelState && (
          <Grid container spacing={3}>
            {/* 故事显示区域 */}
            <Grid item xs={12} lg={8}>
              <StoryDisplay 
                story={novelState.currentStory}
                isLoading={!novelState.currentStory}
              />
            </Grid>

            {/* 投票面板 */}
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 3, mb: 3, bgcolor: 'rgba(255, 255, 255, 0.1)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AccessTime sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    投票倒计时（无投票自动延长一分钟）
                  </Typography>
                </Box>
                <Typography variant="h3" color="primary" sx={{ textAlign: 'center', mb: 1 }}>
                  {formatTime(timeRemaining)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  总投票数: {getTotalVotes()}
                </Typography>
              </Paper>

              <VotingPanel
                choices={novelState.choices || []}
                votes={novelState.votes || {}}
                userVote={novelState.userVotes?.[user?.id]}
                isVoting={novelState.isVoting}
                disabled={!connected}
              />
            </Grid>
          </Grid>
        )}
      </Container>

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