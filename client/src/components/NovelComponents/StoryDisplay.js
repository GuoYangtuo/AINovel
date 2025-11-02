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
  Stack,
  Grid
} from '@mui/material';
import {
  MenuBook,
  AutoStories,
  HowToVote,
  EmojiEvents,
  Schedule,
  AccessTime,
  Image as ImageIcon
} from '@mui/icons-material';
import VotingPanel from './VotingPanel';
import AudioPlayer from './AudioPlayer';

const StoryDisplay = ({ 
  currentStory, 
  storyHistory = [], 
  isLoading,
  choices = [],
  votes = {},
  userVote,
  isVoting,
  isGenerating,
  votingEndTime,
  totalVotes,
  formatTime,
  connected,
  discussion = { messages: [], isActive: false },
  userCoins = 0,
  customOptions = [],
  nextCustomOptionCost = null,
  availableCustomOptionSlots = 0,
  audioUrl = null,
  currentImages = [] // 新增：当前故事的图片列表
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
            投票结果：{winningChoice}
          </Typography>
          <Chip 
            size="small" 
            label={new Date(timestamp).toLocaleString('zh-CN')}
            icon={<Schedule />}
            sx={{ ml: 'auto' }}
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

  // 渲染图文配对的段落
  const renderParagraphWithImage = (paragraph, image, keyPrefix) => {
    return (
      <Grid container spacing={2} key={`paired-${keyPrefix}`} sx={{ mb: 3 }}>
        {/* 左侧图片 */}
        <Grid item xs={12} md={5}>
          <Paper 
            sx={{ 
              overflow: 'hidden',
              bgcolor: 'rgba(0, 0, 0, 0.2)',
              border: '2px solid rgba(102, 126, 234, 0.3)',
              position: 'sticky',
              top: 80
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
            {/*<Box sx={{ p: 1.5, bgcolor: 'rgba(102, 126, 234, 0.1)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <ImageIcon sx={{ fontSize: 16, mr: 0.5, color: 'primary.main' }} />
                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold' }}>
                  配图 {image.index + 1}
                </Typography>
              </Box>
              {image.prompt && (
                <Typography variant="caption" color="text.secondary" sx={{ 
                  display: 'block',
                  fontSize: '0.7rem',
                  opacity: 0.7,
                  fontStyle: 'italic'
                }}>
                  {image.prompt}
                </Typography>
              )}
            </Box>*/}
          </Paper>
        </Grid>
        
        {/* 右侧文段 */}
        <Grid item xs={12} md={7}>
          <Paper
            sx={{
              p: 3,
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
            <Box sx={{ pl: 2 }}>
              <Typography
                variant="body1"
                sx={{
                  lineHeight: 1.8,
                  fontSize: '1.1rem',
                  color: 'text.primary',
                  textIndent: '2em'
                }}
              >
                {paragraph}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  // 渲染当前故事的图文配对内容
  const renderCurrentStoryWithImages = () => {
    if (!currentStory || !currentImages || currentImages.length === 0) {
      return null;
    }

    // 将故事按换行分段
    const paragraphs = currentStory.split('\n').filter(p => p.trim() !== '');
    
    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
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
          <Chip 
            size="small" 
            icon={<ImageIcon />}
            label={`${currentImages.length} 张配图`}
            color="secondary"
            sx={{ ml: 1 }}
          />
        </Box>

        {/* 渲染图文配对 */}
        {currentImages.map((image, idx) => {
          if (image.paragraph) {
            return renderParagraphWithImage(image.paragraph, image, idx);
          }
          return null;
        })}

        {/* 音频播放器 */}
        {audioUrl && (
          <Box sx={{ mt: 3 }}>
            <AudioPlayer 
              audioUrl={audioUrl} 
              storyIndex={storyHistory.length + 1}
            />
          </Box>
        )}
      </Box>
    );
  };

  // 是否有图片
  const hasImages = currentImages && currentImages.length > 0;

  return (
    <Box>
      <StoryContent />
    </Box>
  );

  // 将原来的内容抽取为一个组件
  function StoryContent() {
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
            {/* 故事段落标题 */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
                第 {index + 1} 段故事
              </Typography>
              {historyItem.images && historyItem.images.length > 0 && (
                <Chip 
                  size="small" 
                  icon={<ImageIcon />}
                  label={`${historyItem.images.length} 张配图`}
                  color="secondary"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>

            {/* 如果有图片，使用图文配对布局 */}
            {historyItem.images && historyItem.images.length > 0 ? (
              <Box sx={{ mb: 2 }}>
                {historyItem.images.map((image, imgIdx) => {
                  if (image.paragraph) {
                    return renderParagraphWithImage(image.paragraph, image, `history-${index}-${imgIdx}`);
                  }
                  return null;
                })}
                
                {/* 历史故事的音频播放器 */}
                {historyItem.audioUrl && (
                  <Box sx={{ mt: 2 }}>
                    <AudioPlayer 
                      audioUrl={historyItem.audioUrl} 
                      storyIndex={index + 1}
                    />
                  </Box>
                )}
              </Box>
            ) : (
              /* 没有图片时，使用传统布局 */
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
                  {formatStoryText(historyItem.story)}
                  
                  {/* 历史故事的音频播放器 */}
                  {historyItem.audioUrl && (
                    <Box sx={{ mt: 2 }}>
                      <AudioPlayer 
                        audioUrl={historyItem.audioUrl} 
                        storyIndex={index + 1}
                      />
                    </Box>
                  )}
                </Box>
              </Paper>
            )}

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
          hasImages ? (
            // 有图片时，显示图文配对
            renderCurrentStoryWithImages()
          ) : (
            // 无图片时，显示传统布局
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
                  
                  {/* 音频播放器 */}
                  {audioUrl && (
                    <AudioPlayer 
                      audioUrl={audioUrl} 
                      storyIndex={storyHistory.length + 1}
                    />
                  )}
                </Box>
              </Paper>
            </Box>
          )
        ) : null}

        {/* 当前故事的计时器和投票UI */}
        {currentStory && (
          <Box sx={{ mb: 3 }}>
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
                  votingEndTime={votingEndTime}
                  formatTime={formatTime}
                  totalVotes={totalVotes}
                  discussion={discussion}
                  userCoins={userCoins}
                  customOptions={customOptions}
                  nextCustomOptionCost={nextCustomOptionCost}
                  availableCustomOptionSlots={availableCustomOptionSlots}
                />
              )}
          </Box>
        )}

        {/* 如果没有当前故事也没有历史，显示等待提示 */}
        {!currentStory && !storyHistory.length && (
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
        )}

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
  }
};

export default StoryDisplay;