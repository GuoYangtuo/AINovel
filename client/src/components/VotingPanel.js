import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  LinearProgress,
  Paper,
  Chip
} from '@mui/material';
import {
  HowToVote,
  CheckCircle,
  Timer
} from '@mui/icons-material';
import { useSocket } from '../contexts/SocketContext';
import DiscussionPanel from './DiscussionPanel';
import toast from 'react-hot-toast';

const VotingPanel = ({ 
  choices, 
  votes, 
  userVote, 
  isVoting, 
  disabled, 
  timeRemaining, 
  formatTime, 
  totalVotes,
  discussion 
}) => {
  const { vote } = useSocket();

  const handleVote = (choice) => {
    if (!isVoting) {
      console.log(isVoting);
      toast.error('当前不在投票阶段');
      return;
    }
    
    if (disabled) {
      toast.error('连接已断开，无法投票');
      return;
    }

    vote(choice);
  };

  const getTotalVotes = () => {
    return Object.values(votes).reduce((sum, count) => sum + count, 0);
  };

  const getVotePercentage = (choice) => {
    const total = getTotalVotes();
    const choiceVotes = votes[choice] || 0;
    return total > 0 ? (choiceVotes / total) * 100 : 0;
  };

  const getMaxVotedChoice = () => {
    let maxChoice = '';
    let maxVotes = 0;
    
    Object.entries(votes).forEach(([choice, voteCount]) => {
      if (voteCount > maxVotes) {
        maxVotes = voteCount;
        maxChoice = choice;
      }
    });
    
    return maxChoice;
  };

  return (
    <Box>
      <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <HowToVote sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="h2">
            投票选择
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
            {isVoting && formatTime && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                minWidth: '80px'
              }}>
                <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold', lineHeight: 1 }}>
                  {formatTime(timeRemaining || 0)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {totalVotes || 0} 票
                </Typography>
              </Box>
            )}
            {!isVoting && (
              <Chip
                icon={<Timer />}
                label="等待中"
                color="warning"
                size="small"
              />
            )}
          </Box>
        </Box>

        {!isVoting && (
          <Paper sx={{ 
        p: { xs: 1.5, sm: 2, md: 2 }, 
        mb: { xs: 2, sm: 2.5, md: 3 }, 
        bgcolor: 'rgba(255, 193, 7, 0.1)' 
      }}>
            <Typography variant="body2" color="warning.main" textAlign="center">
              故事生成中，请稍等片刻...
            </Typography>
          </Paper>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {choices.map((choice, index) => {
            const voteCount = votes[choice] || 0;
            const percentage = getVotePercentage(choice);
            const isUserChoice = userVote === choice;
            const isLeading = choice === getMaxVotedChoice() && getTotalVotes() > 0;

            return (
              <Paper
                key={index}
                sx={{
                  p: 2,
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: isVoting && !disabled ? 'pointer' : 'default',
                  bgcolor: isUserChoice 
                    ? 'rgba(102, 126, 234, 0.2)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  border: isUserChoice 
                    ? '2px solid rgba(102, 126, 234, 0.5)' 
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease',
                  '&:hover': isVoting && !disabled ? {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
                  } : {}
                }}
                onClick={() => isVoting && handleVote(choice)}
              >
                {/* 进度条背景 */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${percentage}%`,
                    bgcolor: isLeading 
                      ? 'rgba(76, 175, 80, 0.2)' 
                      : 'rgba(102, 126, 234, 0.1)',
                    transition: 'width 0.5s ease-in-out',
                    zIndex: 0
                  }}
                />
                
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: isUserChoice ? 'bold' : 'normal',
                        flex: 1,
                        mr: 2
                      }}
                    >
                      {choice}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isUserChoice && (
                        <CheckCircle color="primary" fontSize="small" />
                      )}
                      {isLeading && getTotalVotes() > 0 && (
                        <Chip 
                          label="领先" 
                          size="small" 
                          color="success" 
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {voteCount} 票 ({percentage.toFixed(1)}%)
                    </Typography>
                    
                    {isVoting && !isUserChoice && (
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={disabled}
                        sx={{ 
                          minWidth: 'auto',
                          px: 2,
                          borderRadius: '15px'
                        }}
                      >
                        投票
                      </Button>
                    )}
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={percentage}
                    sx={{
                      mt: 1,
                      height: 4,
                      borderRadius: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: isLeading 
                          ? 'success.main'
                          : 'primary.main'
                      }
                    }}
                  />
                </Box>
              </Paper>
            );
          })}
        </Box>

        {getTotalVotes() === 0 && isVoting && (
          <Paper sx={{ 
          p: { xs: 1.5, sm: 2, md: 2 }, 
          mt: 2, 
          bgcolor: 'rgba(33, 150, 243, 0.1)' 
        }}>
            <Typography variant="body2" color="info.main" textAlign="center">
              暂无投票，点击选项开始投票！
            </Typography>
          </Paper>
        )}

        {!isVoting && (
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ display: 'block', textAlign: 'center', mt: 2 }}
          >
            故事将根据得票最多的选项继续发展
          </Typography>
        )}

        {isVoting && (
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ display: 'block', textAlign: 'center', mt: 2 }}
          >
            无投票自动延长一分钟
          </Typography>
        )}
      </CardContent>
    </Card>

      {/* 讨论区组件 */}
      <DiscussionPanel 
        discussion={discussion} 
        isVoting={isVoting} 
      />
    </Box>
  );
};

export default VotingPanel;