import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Grid,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  PlayArrow,
  PeopleAlt,
  Schedule,
  BookmarkBorder
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import RechargeDialog from './RechargeDialog';
import Navbar from './Navbar';
import axios from 'axios';

const HomePage = () => {
  const { user, fetchCoins } = useAuth();
  const navigate = useNavigate();
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rechargeDialog, setRechargeDialog] = useState(false);

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

  const handleCreateRoom = () => {
    navigate('/create-room');
  };

  const handleGoToSettings = () => {
    navigate('/settings');
  };

  const handleOpenRecharge = () => {
    setRechargeDialog(true);
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
      <Navbar 
        title="选择一个正在进行的故事，参与其中，剧情的发展会被你的选择影响"
        showUserMenu={true}
        onCreateRoom={handleCreateRoom}
        onGoToSettings={handleGoToSettings}
        onOpenRecharge={handleOpenRecharge}
      />

      <Container 
        maxWidth="lg" 
        sx={{ 
          py: 3, 
          pt: 10,
          px: { xs: 1, sm: 2, md: 3 }
        }}
      >
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
      </Container>

      {/* 充值对话框 */}
      <RechargeDialog
        open={rechargeDialog}
        onClose={() => setRechargeDialog(false)}
      />
    </>
  );
};

export default HomePage;