import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  LinearProgress,
  Chip,
  Paper,
  Grid
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import VotingPanel from './VotingPanel';
import StoryDisplay from './StoryDisplay';
import Navbar from './Navbar';

const Novel = () => {
  const { user } = useAuth();
  const { connected, novelState, currentRoomId, isJoiningRoom, joinRoom } = useSocket();
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

  const handleCreateRoom = () => {
    navigate('/create-room');
  };

  const handleGoToSettings = () => {
    navigate('/settings');
  };

  const getTotalVotes = () => {
    if (!novelState?.votes) return 0;
    return Object.values(novelState.votes).reduce((sum, count) => sum + count, 0);
  };

  return (
    <>
      <Navbar
        title={`AI交互小说${currentRoomId ? ` - 房间: ${currentRoomId}` : ''}`}
        showBackButton={true}
        onBack={() => navigate('/')}
        showUserMenu={true}
        onCreateRoom={handleCreateRoom}
        onGoToSettings={handleGoToSettings}
        customStyle={{
          transform: isNavbarVisible ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.3s ease-in-out',
          zIndex: 1100
        }}
      />

      <Container maxWidth={novelState?.currentImages?.length > 0 ? "xl" : "md"} sx={{ 
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
            userCoins={user?.coins || 0}
            customOptions={novelState.customOptions || []}
            nextCustomOptionCost={novelState.nextCustomOptionCost || null}
            availableCustomOptionSlots={novelState.availableCustomOptionSlots || 0}
            audioUrl={novelState.audioUrl || null}
            currentImages={novelState.currentImages || []}
          />
        )}
      </Container>
    </>
  );
};

export default Novel;