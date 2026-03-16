import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Paper,
  Grid
} from '@mui/material';
import {
  MenuBook,
  AutoStories,
  HowToVote,
  EmojiEvents,
  Schedule,
  AccessTime,
  Image as ImageIcon,
  Timer
} from '@mui/icons-material';
import { useSocket } from '../contexts/SocketContext';
import CountdownTimer from './NovelComponents/CountdownTimer';

// 直播专用的紧凑型故事显示组件
const CompactStoryDisplay = ({
  currentStory,
  storyHistory = [],
  isLoading,
  choices = [],
  votes = {},
  isVoting,
  isGenerating,
  votingEndTime,
  totalVotes,
  formatTime,
  connected,
  currentImages = []
}) => {
  // 紧凑型故事文本格式化 - 更小的行高和字号
  const formatCompactStoryText = (text) => {
    if (!text) return [];

    const paragraphs = text.split('\n').filter(p => p.trim() !== '');

    return paragraphs.map((paragraph, index) => (
      <Typography
        key={index}
        variant="body2"
        paragraph
        sx={{
          lineHeight: 1.5,
          fontSize: '0.95rem',
          textIndent: '2em',
          marginBottom: 1,
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
          p: 1,
          mb: 1,
          bgcolor: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.2)',
          borderRadius: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <EmojiEvents sx={{ mr: 0.5, color: 'success.main', fontSize: 18 }} />
          <Typography variant="body2" color="success.main">
            投票结果：{winningChoice}
          </Typography>
          <Chip
            size="small"
            label={new Date(timestamp).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            icon={<Schedule sx={{ fontSize: 14 }} />}
            sx={{ ml: 'auto', height: 20, fontSize: '0.7rem' }}
          />
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {Object.entries(votes).map(([choice, count]) => (
            <Chip
              key={choice}
              label={`${choice}: ${count}票`}
              color={choice === winningChoice ? "success" : "default"}
              variant={choice === winningChoice ? "filled" : "outlined"}
              size="small"
              sx={{ fontSize: '0.7rem', height: 22 }}
            />
          ))}
        </Box>
      </Paper>
    );
  };

  if (isLoading) {
    return (
      <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', minHeight: '300px' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <MenuBook sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
            <Typography variant="subtitle1">
              故事正文
            </Typography>
          </Box>

          <Box>
            <Skeleton variant="text" width="100%" height={24} />
            <Skeleton variant="text" width="95%" height={24} />
            <Skeleton variant="text" width="88%" height={24} />
            <Skeleton variant="text" width="92%" height={24} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // 渲染当前故事的图文配对内容（紧凑版）
  const renderCurrentStoryWithImages = () => {
    if (!currentStory) {
      return null;
    }

    const paragraphs = currentStory.split('\n').filter(p => p.trim() !== '');

    const imageMap = new Map();
    if (currentImages && currentImages.length > 0) {
      currentImages.forEach(image => {
        if (image.paragraph) {
          imageMap.set(image.paragraph.trim(), image);
        }
      });
    }

    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
            第 {storyHistory.length + 1} 段故事 (最新)
          </Typography>
          {isGenerating ? (
            <Chip size="small" label="AI生成中..." color="warning" sx={{ height: 20, fontSize: '0.7rem' }} />
          ) : isVoting ? (
            <Chip size="small" label="正在投票中" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
          ) : (
            <Chip size="small" label="投票已结束" color="default" sx={{ height: 20, fontSize: '0.7rem' }} />
          )}
          {currentImages && currentImages.length > 0 && (
            <Chip
              size="small"
              icon={<ImageIcon sx={{ fontSize: 14 }} />}
              label={`${currentImages.length} 张配图`}
              color="secondary"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Box>

        {/* 渲染段落 */}
        {paragraphs.map((paragraph, idx) => {
          const trimmedParagraph = paragraph.trim();
          const image = imageMap.get(trimmedParagraph);

          if (image) {
            // 有配图的段落 - 紧凑布局
            return (
              <Grid container spacing={1} key={`paired-${idx}`} sx={{ mb: 1.5 }}>
                <Grid item xs={12} md={4}>
                  <Paper
                    sx={{
                      overflow: 'hidden',
                      bgcolor: 'rgba(0, 0, 0, 0.2)',
                      border: '0px solid rgba(102, 126, 234, 0.3)',
                    }}
                  >
                    <Box
                      component="img"
                      src={image.imageUrl}
                      alt={`配图 ${image.index + 1}`}
                      sx={{
                        width: '100%',
                        height: 'auto',
                        display: 'block'
                      }}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Paper
                    sx={{
                      p: 1,
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                      border: '0px solid rgba(102, 126, 234, 0.3)',
                      borderRadius: 1,
                      height: '100%'
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        lineHeight: 1.5,
                        fontSize: '0.95rem',
                        color: 'text.primary',
                        textIndent: '2em'
                      }}
                    >
                      {trimmedParagraph}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            );
          } else {
            // 没有配图的段落 - 紧凑布局
            return (
              <Paper
                key={`text-only-${idx}`}
                sx={{
                  p: 0.5,
                  mb: 0.5,
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  border: '0px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    lineHeight: 1.5,
                    fontSize: '0.95rem',
                    textIndent: '2em',
                    color: 'text.primary'
                  }}
                >
                  {trimmedParagraph}
                </Typography>
              </Paper>
            );
          }
        })}
      </Box>
    );
  };

  // 渲染紧凑型投票选项（只展示，无交互）
  const renderCompactVotingPanel = () => {
    if (!choices || choices.length === 0) return null;

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
      <Paper sx={{ p: 1.5, bgcolor: 'rgba(102, 126, 234, 0.1)', border: '1px solid rgba(102, 126, 234, 0.2)', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <HowToVote sx={{ mr: 0.5, color: 'primary.main', fontSize: 18 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            投票选项
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
            {isVoting && formatTime && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Timer sx={{ fontSize: 14, color: 'primary.main' }} />
                <CountdownTimer
                  votingEndTime={votingEndTime}
                  formatTime={formatTime}
                  variant="body2"
                  color="primary.main"
                />
              </Box>
            )}
            <Chip
              size="small"
              label={`${totalVotes || 0} 票`}
              color="primary"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          </Box>
        </Box>

        {!isVoting && (
          <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 1, textAlign: 'center' }}>
            故事生成中，请稍等片刻...
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {choices.map((choice, index) => {
            const voteCount = votes[choice] || 0;
            const percentage = getVotePercentage(choice);
            const isLeading = choice === getMaxVotedChoice() && getTotalVotes() > 0;

            return (
              <Paper
                key={index}
                sx={{
                  p: 0.5,
                  position: 'relative',
                  overflow: 'hidden',
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  border: isLeading ? '1px solid rgba(76, 175, 80, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 1,
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${percentage}%`,
                    bgcolor: isLeading
                      ? 'rgba(76, 175, 80, 0.15)'
                      : 'rgba(102, 126, 234, 0.1)',
                    transition: 'width 0.5s ease-in-out',
                    zIndex: 0
                  }}
                />
                <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                    {isLeading && (
                      <EmojiEvents sx={{ fontSize: 14, color: 'success.main' }} />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: isLeading ? 'bold' : 'normal' }}>
                      {choice}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {voteCount} 票 ({percentage.toFixed(1)}%)
                  </Typography>
                </Box>
              </Paper>
            );
          })}
        </Box>
      </Paper>
    );
  };

  return (
    <Box>
      {/* 历史故事段落 */}
      {storyHistory.map((historyItem, index) => (
        <Box key={index} sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
              第 {index + 1} 段故事
            </Typography>
            {historyItem.images && historyItem.images.length > 0 && (
              <Chip
                size="small"
                icon={<ImageIcon sx={{ fontSize: 14 }} />}
                label={`${historyItem.images.length} 图`}
                color="secondary"
                sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }}
              />
            )}
          </Box>

          {/* 故事内容 */}
          {historyItem.images && historyItem.images.length > 0 ? (
            <Box sx={{ mb: 1 }}>
              {(() => {
                const paragraphs = historyItem.story.split('\n').filter(p => p.trim() !== '');

                const imageMap = new Map();
                historyItem.images.forEach(image => {
                  if (image.paragraph) {
                    imageMap.set(image.paragraph.trim(), image);
                  }
                });

                return paragraphs.map((paragraph, paraIdx) => {
                  const trimmedParagraph = paragraph.trim();
                  const image = imageMap.get(trimmedParagraph);

                  if (image) {
                    return (
                      <Grid container spacing={1} key={`history-paired-${index}-${paraIdx}`} sx={{ mb: 0.5 }}>
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ overflow: 'hidden', borderRadius: 1, border: 0 }}>
                            <Box
                              component="img"
                              src={image.imageUrl}
                              alt=""
                              sx={{ width: '100%', height: 'auto', display: 'block' }}
                            />
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={8}>
                          <Paper sx={{ p: 0.5, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1, height: '100%', border: 0 }}>
                            <Typography variant="body2" sx={{ lineHeight: 1.5, fontSize: '0.9rem', textIndent: '2em' }}>
                              {trimmedParagraph}
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    );
                  } else {
                    return (
                      <Paper
                        key={`history-text-${index}-${paraIdx}`}
                        sx={{ p: 0.5, mb: 0.5, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1, border: 0 }}
                      >
                        <Typography variant="body2" sx={{ lineHeight: 1.5, fontSize: '0.9rem', textIndent: '2em' }}>
                          {trimmedParagraph}
                        </Typography>
                      </Paper>
                    );
                  }
                });
              })()}
            </Box>
          ) : (
            <Paper sx={{ p: 0.5, mb: 0.5, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
              {formatCompactStoryText(historyItem.story)}
            </Paper>
          )}

          {/* 投票结果 */}
          {renderVotingResult(historyItem.winningChoice, historyItem.votes, historyItem.timestamp)}
        </Box>
      ))}

      {/* 当前故事 */}
      {currentStory ? renderCurrentStoryWithImages() : null}

      {/* 投票面板 */}
      {currentStory && renderCompactVotingPanel()}

      {/* AI生成中提示 */}
      {currentStory && isGenerating && (
        <Paper sx={{ p: 1.5, bgcolor: 'rgba(255, 152, 0, 0.1)', borderRadius: 1, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <AccessTime sx={{ fontSize: 16, color: 'warning.main' }} />
            <Typography variant="body2" color="warning.main">
              AI正在生成新故事...
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

// 辅助组件：Skeleton
const Skeleton = ({ variant = 'text', width = '100%', height = 24 }) => (
  <Box
    sx={{
      width,
      height,
      bgcolor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: variant === 'text' ? 1 : 2,
      animation: 'pulse 1.5s ease-in-out infinite',
      '@keyframes pulse': {
        '0%, 100%': { opacity: 0.4 },
        '50%': { opacity: 0.7 }
      }
    }}
  />
);

const NovelLive = () => {
  const { connected, novelState, currentRoomId, isJoiningRoom, joinRoom } = useSocket();
  const { roomId } = useParams();
  const hasJoinedRoom = useRef(false);

  // 自动加入房间（只读模式，不需要认证）
  useEffect(() => {
    if (connected && roomId && currentRoomId !== roomId && !hasJoinedRoom.current) {
      console.log('直播模式加入房间:', roomId);
      hasJoinedRoom.current = true;
      joinRoom(roomId);
    }

    if (currentRoomId !== roomId) {
      hasJoinedRoom.current = false;
    }
  }, [connected, roomId, currentRoomId]);

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTotalVotes = () => {
    if (!novelState?.votes) return 0;
    return Object.values(novelState.votes).reduce((sum, count) => sum + count, 0);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth={novelState?.currentImages?.length > 0 ? "xl" : "lg"} sx={{
        py: { xs: 0, sm: 0, md: 0 },
        px: { xs: 0, sm: 0, md: 0 }
      }}>
        {/* 连接状态 */}
        {!connected && (
          <Card sx={{ mb: 2, bgcolor: 'rgba(255, 152, 0, 0.1)' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="body2" color="warning.main">
                连接中... 正在连接到服务器
              </Typography>
              <LinearProgress sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        )}

        {connected && isJoiningRoom && (
          <Card sx={{ mb: 2, bgcolor: 'rgba(33, 150, 243, 0.1)' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="body2" color="info.main">
                加入房间中...
              </Typography>
              <LinearProgress sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        )}

        {connected && !isJoiningRoom && !novelState && (
          <Card sx={{ mb: 2, bgcolor: 'rgba(33, 150, 243, 0.1)' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="body2" color="info.main">
                小说准备中...
              </Typography>
              <LinearProgress sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        )}

        {/* 故事展示 */}
        {connected && !isJoiningRoom && novelState && (
          <CompactStoryDisplay
            currentStory={novelState.currentStory}
            storyHistory={novelState.storyHistory}
            isLoading={!novelState.currentStory}
            choices={novelState.choices || []}
            votes={novelState.votes || {}}
            isVoting={novelState.isVoting}
            isGenerating={novelState.isGenerating}
            votingEndTime={novelState.votingEndTime}
            totalVotes={getTotalVotes()}
            formatTime={formatTime}
            connected={connected}
            currentImages={novelState.currentImages || []}
          />
        )}

        {/* 等待提示 */}
        {connected && !isJoiningRoom && !novelState && (
          <Card sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', textAlign: 'center', py: 4 }}>
            <AutoStories sx={{ fontSize: 48, color: 'info.main', mb: 2, opacity: 0.7 }} />
            <Typography variant="h6" color="info.main">
              故事即将开始...
            </Typography>
          </Card>
        )}
      </Container>
    </Box>
  );
};

export default NovelLive;
