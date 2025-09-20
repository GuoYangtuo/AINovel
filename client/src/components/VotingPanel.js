import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  LinearProgress,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Slider
} from '@mui/material';
import {
  HowToVote,
  CheckCircle,
  Timer,
  MonetizationOn
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
  discussion,
  userCoins = 0 
}) => {
  const { vote } = useSocket();
  const [voteDialog, setVoteDialog] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState('');
  const [coinsToSpend, setCoinsToSpend] = useState(0);

  const handleVote = (choice, spendCoins = 0) => {
    if (!isVoting) {
      console.log(isVoting);
      toast.error('当前不在投票阶段');
      return;
    }
    
    if (disabled) {
      toast.error('连接已断开，无法投票');
      return;
    }

    if (spendCoins > 0) {
      // 使用金币投票
      vote(choice, spendCoins);
    } else {
      // 免费投票
      vote(choice);
    }
  };

  const handleOpenVoteDialog = (choice) => {
    setSelectedChoice(choice);
    setCoinsToSpend(0);
    setVoteDialog(true);
  };

  const handleConfirmVote = () => {
    handleVote(selectedChoice, coinsToSpend);
    setVoteDialog(false);
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
                onClick={() => isVoting && handleOpenVoteDialog(choice)}
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
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {voteCount} 票 ({percentage.toFixed(1)}%)
                      </Typography>
                      {isUserChoice && userVote?.coinsSpent > 0 && (
                        <Typography variant="caption" color="warning.main">
                          花费 {userVote.coinsSpent} 金币
                        </Typography>
                      )}
                    </Box>
                    
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
                        startIcon={<MonetizationOn />}
                      >
                        投票
                      </Button>
                    )}
                    
                    {isVoting && isUserChoice && (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={disabled}
                        sx={{ 
                          minWidth: 'auto',
                          px: 2,
                          borderRadius: '15px'
                        }}
                        startIcon={<MonetizationOn />}
                      >
                        追加投票
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

      {/* 金币投票对话框 */}
      <Dialog
        open={voteDialog}
        onClose={() => setVoteDialog(false)}
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
          <HowToVote color="primary" />
          投票选择
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {selectedChoice}
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              当前金币余额: {userCoins}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              每1金币 = 1额外投票（免费投票1票 + 金币票数）
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              选择消费金币数量:
            </Typography>
            <Slider
              value={coinsToSpend}
              onChange={(e, newValue) => setCoinsToSpend(newValue)}
              min={0}
              max={Math.min(userCoins, 100)}
              marks={[
                { value: 0, label: '0' },
                { value: Math.min(Math.floor(userCoins / 4), 25), label: `${Math.min(Math.floor(userCoins / 4), 25)}` },
                { value: Math.min(Math.floor(userCoins / 2), 50), label: `${Math.min(Math.floor(userCoins / 2), 50)}` },
                { value: Math.min(userCoins, 100), label: `${Math.min(userCoins, 100)}` }
              ]}
              valueLabelDisplay="on"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="自定义金币数量"
              value={coinsToSpend}
              onChange={(e) => {
                const value = Math.max(0, Math.min(parseInt(e.target.value) || 0, userCoins));
                setCoinsToSpend(value);
              }}
              type="number"
              inputProps={{ min: 0, max: userCoins }}
              variant="outlined"
              sx={{ mb: 2 }}
            />
          </Box>

          <Paper sx={{ p: 2, bgcolor: 'rgba(102, 126, 234, 0.1)' }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>投票汇总:</strong>
            </Typography>
            <Typography variant="body2">
              • 免费投票: 1票
            </Typography>
            <Typography variant="body2">
              • 金币投票: {coinsToSpend}票
            </Typography>
            <Typography variant="h6" color="primary.main" sx={{ mt: 1 }}>
              总计: {1 + coinsToSpend}票
            </Typography>
            {coinsToSpend > 0 && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                * 金币将在下一段故事生成后扣除
              </Typography>
            )}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoteDialog(false)}>
            取消
          </Button>
          <Button 
            onClick={handleConfirmVote} 
            color="primary" 
            variant="contained"
            startIcon={<MonetizationOn />}
          >
            {coinsToSpend > 0 ? `投票 (消费${coinsToSpend}金币)` : '免费投票'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VotingPanel;