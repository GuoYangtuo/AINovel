import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
  Paper,
  Divider,
  Chip,
  Stack
} from '@mui/material';
import {
  MenuBook,
  AutoStories,
  HowToVote,
  EmojiEvents,
  Schedule,
  AccessTime
} from '@mui/icons-material';
import VotingPanel from './VotingPanel';

const StoryDisplay = ({ 
  currentStory, 
  storyHistory = [], 
  isLoading,
  choices = [],
  votes = {},
  userVote,
  isVoting,
  isGenerating,
  timeRemaining,
  totalVotes,
  formatTime,
  connected,
  discussion = { messages: [], isActive: false },
  userCoins = 0
}) => {
  // 将故事文本分段处理
  const formatStoryText = (text) => {
    if (!text) return [];
    
    // 按换行符分段
    const paragraphs = text.split('\n').filter(p => p.trim() !== '');
    
    return paragraphs.map((paragraph, index) => (
      <Typography
        key={index}
        variant="body1"
        paragraph
        sx={{
          lineHeight: 1.8,
          fontSize: '1.1rem',
          textIndent: '2em',
          marginBottom: 2,
          color: 'text.primary',
          '&:last-child': {
            marginBottom: 0
          }
        }}
      >
        {paragraph.trim()}
      </Typography>
    ));
  };

  // 渲染投票结果
  const renderVotingResult = (winningChoice, votes, timestamp) => {
    const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);
    
    return (
      <Paper
        sx={{
          p: 2,
          mb: 3,
          bgcolor: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.2)',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <EmojiEvents sx={{ mr: 1, color: 'success.main' }} />
          <Typography variant="h6" color="success.main">
            投票结果
          </Typography>
          <Chip 
            size="small" 
            label={new Date(timestamp).toLocaleString('zh-CN')}
            icon={<Schedule />}
            sx={{ ml: 'auto' }}
          />
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            <strong>获胜选项：</strong>
          </Typography>
          <Chip
            icon={<EmojiEvents />}
            label={winningChoice}
            color="success"
            variant="filled"
            sx={{ mb: 2 }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          详细投票统计 (总票数: {totalVotes})：
        </Typography>
        
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {Object.entries(votes).map(([choice, count]) => (
            <Chip
              key={choice}
              icon={<HowToVote />}
              label={`${choice}: ${count}票`}
              color={choice === winningChoice ? "success" : "default"}
              variant={choice === winningChoice ? "filled" : "outlined"}
              size="small"
            />
          ))}
        </Stack>
      </Paper>
    );
  };

  if (isLoading) {
    return (
      <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', minHeight: '400px' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <MenuBook sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              故事正文
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Skeleton variant="text" width="100%" height={30} />
            <Skeleton variant="text" width="95%" height={30} />
            <Skeleton variant="text" width="88%" height={30} />
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Skeleton variant="text" width="92%" height={30} />
            <Skeleton variant="text" width="87%" height={30} />
            <Skeleton variant="text" width="95%" height={30} />
          </Box>
          
          <Box>
            <Skeleton variant="text" width="90%" height={30} />
            <Skeleton variant="text" width="85%" height={30} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ 
      bgcolor: 'rgba(255, 255, 255, 0.1)',
      minHeight: '400px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 装饰性背景 */}
      <Box
        sx={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
          zIndex: 0
        }}
      />
      
      <CardContent sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <AutoStories sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="h2">
            完整故事历程
          </Typography>
        </Box>

        {/* 显示历史故事段落和投票结果 */}
        {storyHistory.map((historyItem, index) => (
          <Box key={index} sx={{ mb: 4 }}>
            {/* 故事段落 */}
            <Paper
              sx={{
                p: 3,
                mb: 2,
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '4px',
                  height: '100%',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  borderRadius: '0 4px 4px 0'
                }
              }}
            >
              <Box sx={{ pl: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, opacity: 0.7 }}>
                  第 {index + 1} 段故事
                </Typography>
                {formatStoryText(historyItem.story)}
              </Box>
            </Paper>

            {/* 投票结果和讨论记录 */}
            <Box display="flex" gap={2} sx={{ flexDirection: { xs: 'column', md: 'row' } }}>
              {/* 投票结果 */}
              <Box sx={{ flex: 1 }}>
                {renderVotingResult(historyItem.winningChoice, historyItem.votes, historyItem.timestamp)}
              </Box>
              
              {/* 讨论记录 */}
              {historyItem.discussion && historyItem.discussion.length > 0 && (
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Paper
                    sx={{
                      p: 1.5,
                      bgcolor: 'rgba(102, 126, 234, 0.05)',
                      border: '1px solid rgba(102, 126, 234, 0.2)',
                      borderRadius: 1,
                      height: '100%'
                    }}
                  >
                    <Box display="flex" alignItems="center" mb={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                        讨论记录 ({historyItem.discussion.length}条)
                      </Typography>
                    </Box>
                    
                    <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
                      {historyItem.discussion.map((msg, msgIndex) => (
                        <Box key={msg.id || msgIndex} mb={0.5}>
                          <Typography
                            variant="body2"
                            sx={{
                              wordBreak: 'break-word',
                              lineHeight: 1.3,
                              fontSize: '0.8rem'
                            }}
                          >
                            <Box component="span" sx={{ fontWeight: 'bold', color: 'primary.main', mr: 1 }}>
                              {msg.username || '匿名用户'}:
                            </Box>
                            {msg.message}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                </Box>
              )}
            </Box>
            
            {index < storyHistory.length - 1 && (
              <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
            )}
          </Box>
        ))}

        {/* 当前最新的故事段落 */}
        {currentStory ? (
          <Box sx={{ mb: 3 }}>
            <Paper
              sx={{
                p: { xs: 0, sm: 1, md: 3 },
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                border: '2px solid rgba(102, 126, 234, 0.3)',
                borderRadius: 2,
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '4px',
                  height: '100%',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  borderRadius: '0 4px 4px 0'
                }
              }}
            >
              <Box sx={{ pl: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
                    第 {storyHistory.length + 1} 段故事 (最新)
                  </Typography>
                  {isGenerating ? (
                    <Chip size="small" label="AI生成中..." color="warning" sx={{ ml: 1 }} />
                  ) : isVoting ? (
                    <Chip size="small" label="正在投票中" color="primary" sx={{ ml: 1 }} />
                  ) : (
                    <Chip size="small" label="投票已结束" color="default" sx={{ ml: 1 }} />
                  )}
                </Box>
                {formatStoryText(currentStory)}
              </Box>
            </Paper>

            {/* 计时器和投票UI */}
            <Box sx={{ mt: 3 }}>
              {isGenerating ? (
                /* AI生成中的提示 */
                <Paper sx={{ 
          p: { xs: 2, sm: 2.5, md: 3 }, 
          mb: { xs: 2, sm: 2.5, md: 3 }, 
          bgcolor: 'rgba(255, 152, 0, 0.1)', 
          border: '1px solid rgba(255, 152, 0, 0.2)' 
        }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AccessTime sx={{ mr: 1, color: 'warning.main' }} />
                    <Typography variant="h6" color="warning.main">
                      AI正在生成新故事
                    </Typography>
                  </Box>
                  <Typography variant="body1" color="warning.main" sx={{ textAlign: 'center', mb: 1 }}>
                    🤖 请稍候...
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    AI正在根据投票结果生成下一段精彩故事
                  </Typography>
                </Paper>
              ) : (
                /* 投票面板 */
                <VotingPanel
                  choices={choices}
                  votes={votes}
                  userVote={userVote}
                  isVoting={isVoting}
                  disabled={!connected || isGenerating}
                  timeRemaining={timeRemaining}
                  formatTime={formatTime}
                  totalVotes={totalVotes}
                  discussion={discussion}
                  userCoins={userCoins}
                />
              )}
            </Box>
          </Box>
        ) : !storyHistory.length ? (
          <Paper
            sx={{
              p: 4,
              bgcolor: 'rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(33, 150, 243, 0.2)',
              borderRadius: 2,
              textAlign: 'center'
            }}
          >
            <AutoStories 
              sx={{ 
                fontSize: 48, 
                color: 'info.main', 
                mb: 2,
                opacity: 0.7
              }} 
            />
            <Typography variant="h6" color="info.main" gutterBottom>
              故事即将开始...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AI正在为你编织一个精彩的故事
            </Typography>
          </Paper>
        ) : null}

        {(currentStory || storyHistory.length > 0) && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                fontStyle: 'italic',
                opacity: 0.7
              }}
            >
              故事的走向由你和其他读者的选择决定...
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StoryDisplay;