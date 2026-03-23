import React, { useEffect, useRef, useMemo, useCallback } from 'react';
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

// 自动循环滚动配置 - 可在此处调整参数
const SCROLL_CONFIG = {
  // 循环展示最后几段故事（设为1则只循环展示最新段落）
  lastNParagraphs: 3,
  // 滚动速度（像素/秒），值越大滚动越快
  scrollSpeed: 10,
  // 到底后停留时间（毫秒）
  pauseAtBottom: 1500,
  // 切换循环滚动的按键（支持 'Space', 'KeyS', 'KeyL' 等）
  toggleKey: 'Space'
};

// 常量提取
const STYLES = {
  compact: {
    lineHeight: 1.5,
    fontSize: '0.95rem',
    textIndent: '2em',
  },
  chip: {
    height: 20,
    fontSize: '0.7rem',
  },
  paperPadding: { p: 0.5 },
  smallMargin: { mb: 0.5 },
};

const PARAGRAPH_STYLES = {
  lineHeight: 1.5,
  fontSize: '0.95rem',
  textIndent: '2em',
  color: 'text.primary',
};

const VOTE_BAR_COLORS = {
  leading: 'rgba(76, 175, 80, 0.15)',
  default: 'rgba(102, 126, 234, 0.1)',
};

const BORDER_COLORS = {
  leading: '1px solid rgba(76, 175, 80, 0.5)',
  default: '1px solid rgba(255, 255, 255, 0.1)',
};

// 已投票人记录列表组件
const VoterRecordList = ({ choices, userVotes = {} }) => {
  if (!choices || choices.length === 0 || Object.keys(userVotes).length === 0) {
    return (
      <Paper sx={{ p: 1.5, bgcolor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <HowToVote sx={{ mr: 0.5, color: 'primary.main', fontSize: 18 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            投票记录
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          暂无投票记录
        </Typography>
      </Paper>
    );
  }

  // 按选项分组投票人
  const votersByChoice = {};
  choices.forEach(choice => {
    votersByChoice[choice] = [];
  });

  Object.entries(userVotes).forEach(([userId, voteInfo]) => {
    if (voteInfo.choice && votersByChoice[voteInfo.choice] !== undefined) {
      votersByChoice[voteInfo.choice].push({
        userId,
        username: voteInfo.username || `用户_${userId.slice(0, 6)}`,
        totalVotes: voteInfo.totalVotes || 1
      });
    }
  });

  // 自定义选项的投票人
  Object.entries(userVotes).forEach(([userId, voteInfo]) => {
    if (voteInfo.choice && votersByChoice[voteInfo.choice] === undefined) {
      if (!votersByChoice._custom) votersByChoice._custom = [];
      votersByChoice._custom.push({
        userId,
        username: voteInfo.username || `用户_${userId.slice(0, 6)}`,
        totalVotes: voteInfo.totalVotes || 1
      });
    }
  });

  return (
    <Paper sx={{ p: 1.5, bgcolor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <HowToVote sx={{ mr: 0.5, color: 'primary.main', fontSize: 18 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
          投票记录
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {Object.keys(userVotes).length} 人已投票
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {choices.map((choice, idx) => {
          const voters = votersByChoice[choice] || [];
          if (voters.length === 0) return null;

          return (
            <Box key={idx}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.light', fontSize: '0.8rem' }}>
                  {choice}
                </Typography>
                <Chip
                  size="small"
                  label={`${voters.length}人`}
                  sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }}
                  color="primary"
                  variant="outlined"
                />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {voters.map((voter, vIdx) => (
                  <Chip
                    key={vIdx}
                    size="small"
                    label={`${voter.username} (${voter.totalVotes}票)`}
                    sx={{ fontSize: '0.65rem', height: 20 }}
                    variant="outlined"
                    color="default"
                  />
                ))}
              </Box>
            </Box>
          );
        })}

        {/* 自定义选项的投票人 */}
        {votersByChoice._custom && votersByChoice._custom.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'warning.light', fontSize: '0.8rem' }}>
                自定义选项
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {votersByChoice._custom.map((voter, vIdx) => (
                <Chip
                  key={vIdx}
                  size="small"
                  label={`${voter.username} (${voter.totalVotes}票)`}
                  sx={{ fontSize: '0.65rem', height: 20 }}
                  variant="outlined"
                  color="warning"
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

// 悬浮投票面板组件
const FloatingVotingPanel = ({
  choices,
  votes,
  isVoting,
  votingEndTime,
  formatTime,
  voteStats,
  getVotePercentage
}) => {
  if (!choices || choices.length === 0) return null;

  const { total, maxChoice } = voteStats;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        width: 300,
        maxHeight: '70vh',
        overflowY: 'auto',
        p: 1.5,
        bgcolor: 'rgba(20, 20, 35, 0.95)',
        border: '1px solid rgba(102, 126, 234, 0.3)',
        borderRadius: 2,
        zIndex: 1200,
        backdropFilter: 'blur(8px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <HowToVote sx={{ mr: 0.5, color: 'primary.main', fontSize: 18 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', flex: 1 }}>
          投票
        </Typography>
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
          label={`${total || 0} 票`}
          color="primary"
          variant="outlined"
          sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {choices.map((choice, index) => {
          const voteCount = votes[choice] || 0;
          const percentage = getVotePercentage(choice);
          const isLeading = choice === maxChoice && total > 0;

          return (
            <Paper
              key={index}
              sx={{
                p: 0.5,
                position: 'relative',
                overflow: 'hidden',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                border: isLeading ? BORDER_COLORS.leading : BORDER_COLORS.default,
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
                  bgcolor: isLeading ? VOTE_BAR_COLORS.leading : VOTE_BAR_COLORS.default,
                  transition: 'width 0.5s ease-in-out',
                  zIndex: 0
                }}
              />
              <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                  {isLeading && (
                    <EmojiEvents sx={{ fontSize: 14, color: 'success.main' }} />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: isLeading ? 'bold' : 'normal', fontSize: '0.8rem' }}>
                    {choice}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {voteCount}票 ({percentage.toFixed(1)}%)
                </Typography>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Paper>
  );
};

// 辅助组件：Skeleton - 独立提取
const LoadingSkeleton = ({ variant = 'text', width = '100%', height = 24 }) => (
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

// 提取通用段落渲染逻辑
const renderParagraphs = (text, options = {}) => {
  const { customStyles = {}, showTextIndent = true } = options;
  if (!text) return [];

  const paragraphs = text.split('\n').filter(p => p.trim() !== '');

  return paragraphs.map((paragraph, index) => (
    <Typography
      key={index}
      variant="body2"
      paragraph
      sx={{
        ...PARAGRAPH_STYLES,
        ...customStyles,
        textIndent: showTextIndent ? '2em' : 0,
        marginBottom: 1,
        '&:last-child': { marginBottom: 0 }
      }}
    >
      {paragraph.trim()}
    </Typography>
  ));
};

// 提取图片与段落配对的渲染逻辑
const renderParagraphWithImage = (paragraph, image, idx) => {
  const trimmedParagraph = paragraph.trim();

  return (
    <Grid container spacing={1} key={`paired-${idx}`} sx={{ mb: 1.5 }}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ overflow: 'hidden', bgcolor: 'rgba(0, 0, 0, 0.2)', border: 0 }}>
          <Box
            component="img"
            src={image.imageUrl}
            alt={`配图 ${image.index + 1}`}
            sx={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 1, bgcolor: 'rgba(255, 255, 255, 0.05)', border: 0, borderRadius: 1, height: '100%' }}>
          <Typography variant="body2" sx={PARAGRAPH_STYLES}>
            {trimmedParagraph}
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};

// 提取纯文本段落的渲染逻辑
const renderTextOnlyParagraph = (paragraph, idx) => (
  <Paper
    key={`text-only-${idx}`}
    sx={{ p: 0.5, mb: 0.5, bgcolor: 'rgba(255, 255, 255, 0.05)', border: 0, borderRadius: 1 }}
  >
    <Typography variant="body2" sx={PARAGRAPH_STYLES}>
      {paragraph.trim()}
    </Typography>
  </Paper>
);

// 创建图片映射的辅助函数
const createImageMap = (images) => {
  const imageMap = new Map();
  if (images && images.length > 0) {
    images.forEach(image => {
      if (image.paragraph) {
        imageMap.set(image.paragraph.trim(), image);
      }
    });
  }
  return imageMap;
};

// 渲染故事内容（带图片配对）- 提取为独立函数
const renderStoryContent = (story, images, renderOptions = {}) => {
  const { imageMap, historyItem } = renderOptions;
  const paragraphs = story.split('\n').filter(p => p.trim() !== '');
  const effectiveImageMap = imageMap || createImageMap(images);

  return paragraphs.map((paragraph, idx) => {
    const trimmedParagraph = paragraph.trim();
    const image = effectiveImageMap.get(trimmedParagraph);

    return image
      ? renderParagraphWithImage(paragraph, image, idx)
      : renderTextOnlyParagraph(paragraph, idx);
  });
};

// 直播专用的紧凑型故事显示组件
const CompactStoryDisplay = ({
  currentStory,
  storyHistory = [],
  isLoading,
  choices = [],
  votes = {},
  userVotes = {},
  isVoting,
  isGenerating,
  votingEndTime,
  totalVotes,
  formatTime,
  connected,
  currentImages = [],
  scrollConfig = {}
}) => {
  // 滚动配置（允许外部覆盖默认值）
  const config = { ...SCROLL_CONFIG, ...scrollConfig };

  // 内部滚动状态 ref
  const scrollStateRef = useRef({
    isScrolling: false,
    isAutoScrollEnabled: false,
    scrollTimer: null,
    jumpBackTimer: null,
    pauseTimer: null,
    currentScrollTarget: null,
    lastStoryLength: 0,
    animationFrameId: null
  });

  // 获取所有故事段落（历史 + 当前）
  const allStories = useMemo(() => {
    return [...storyHistory, { story: currentStory, isCurrent: true }].filter(s => s.story);
  }, [storyHistory, currentStory]);

  // 获取用于循环的目标故事索引范围
  const getScrollTargetStories = useCallback(() => {
    const totalStories = allStories.length;
    const { lastNParagraphs } = config;
    const startIdx = Math.max(0, totalStories - lastNParagraphs);
    return allStories.slice(startIdx);
  }, [allStories, config.lastNParagraphs]);

  // 匀速滚动到目标位置（使用窗口滚动）
  const linearScrollTo = useCallback((targetY) => {
    return new Promise((resolve) => {
      const startY = window.scrollY;
      const totalDistance = targetY - startY;

      // 如果已经在目标位置附近，直接返回
      if (Math.abs(totalDistance) <= 1) {
        resolve();
        return;
      }

      const { scrollSpeed } = config;

      // 累积已移动的距离
      let accumulatedDistance = 0;
      let lastTime = null;

      const animateScroll = (currentTime) => {
        // 检查是否已被停止
        if (!scrollStateRef.current.isAutoScrollEnabled) {
          resolve();
          return;
        }

        if (lastTime === null) {
          lastTime = currentTime;
        }

        const elapsed = currentTime - lastTime;
        lastTime = currentTime;

        // 根据速度计算本帧移动距离
        const pixelsToMove = (scrollSpeed * elapsed) / 1000;
        accumulatedDistance += pixelsToMove;

        const newScrollTop = startY + accumulatedDistance;

        // 判断是否到达目标
        if (totalDistance > 0 && newScrollTop >= targetY) {
          window.scrollTo({ top: targetY, behavior: 'instant' });
          resolve();
          return;
        } else if (totalDistance < 0 && newScrollTop <= targetY) {
          window.scrollTo({ top: targetY, behavior: 'instant' });
          resolve();
          return;
        }

        window.scrollTo({ top: newScrollTop, behavior: 'instant' });

        // 使用累积距离判断
        if (Math.abs(accumulatedDistance) < Math.abs(totalDistance)) {
          scrollStateRef.current.animationFrameId = requestAnimationFrame(animateScroll);
        } else {
          window.scrollTo({ top: targetY, behavior: 'instant' });
          resolve();
        }
      };

      scrollStateRef.current.animationFrameId = requestAnimationFrame(animateScroll);
    });
  }, [config.scrollSpeed]);

  // 计算目标段落在页面内的位置
  const getParagraphPosition = useCallback((paragraphIndex) => {
    const paragraphs = document.querySelectorAll('[data-paragraph-index]');
    const targetEl = paragraphs[paragraphIndex];

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      return {
        top: rect.top + window.scrollY,
        height: rect.height
      };
    }
    return { top: 0, height: 0 };
  }, []);

  // 跳转到最新一段故事的开头（立即跳转）
  const jumpToLatestParagraph = useCallback(() => {
    const state = scrollStateRef.current;
    if (!state.isAutoScrollEnabled) return;

    const totalParagraphs = allStories.length;
    if (totalParagraphs === 0) return;

    // 跳转到最后一段（最新一段）的开头
    const startPos = getParagraphPosition(totalParagraphs - 1);
    window.scrollTo({ top: startPos.top, behavior: 'instant' });
  }, [allStories.length, getParagraphPosition]);

  // 停止所有滚动定时器和动画
  const stopAllTimers = useCallback(() => {
    const state = scrollStateRef.current;
    if (state.scrollTimer) {
      clearTimeout(state.scrollTimer);
      state.scrollTimer = null;
    }
    if (state.jumpBackTimer) {
      clearTimeout(state.jumpBackTimer);
      state.jumpBackTimer = null;
    }
    if (state.pauseTimer) {
      clearTimeout(state.pauseTimer);
      state.pauseTimer = null;
    }
    if (state.animationFrameId) {
      cancelAnimationFrame(state.animationFrameId);
      state.animationFrameId = null;
    }
    state.isScrolling = false;
  }, []);

  // 执行一轮循环滚动
  const executeScrollCycle = useCallback(async () => {
    const state = scrollStateRef.current;
    if (!state.isAutoScrollEnabled) return;

    const targetStories = getScrollTargetStories();
    if (targetStories.length === 0) return;

    state.isScrolling = true;
    const totalParagraphs = allStories.length;
    const startIdx = totalParagraphs - targetStories.length;

    // 跳转到倒数第N段的开头（立即跳转）
    const startPos = getParagraphPosition(startIdx);
    window.scrollTo({ top: startPos.top, behavior: 'instant' });

    // 等待一小段时间让用户看到起点
    await new Promise(resolve => {
      state.pauseTimer = setTimeout(resolve, 500);
    });
    if (!state.isAutoScrollEnabled) return;

    // 滚动到底部（使用匀速滚动）
    const scrollHeight = document.body.scrollHeight;
    const clientHeight = window.innerHeight;
    const targetY = scrollHeight - clientHeight;
    await linearScrollTo(targetY);

    if (!state.isAutoScrollEnabled) return;

    // 到底后停留
    await new Promise(resolve => {
      state.pauseTimer = setTimeout(resolve, config.pauseAtBottom);
    });

    if (state.isAutoScrollEnabled) {
      // 继续下一轮
      state.scrollTimer = setTimeout(() => {
        executeScrollCycle();
      }, 100);
    }
  }, [allStories.length, getScrollTargetStories, getParagraphPosition, linearScrollTo, config]);

  // 开启自动循环滚动
  const startAutoScroll = useCallback(() => {
    const state = scrollStateRef.current;
    if (state.isAutoScrollEnabled) return;

    stopAllTimers();
    state.isAutoScrollEnabled = true;

    executeScrollCycle();
  }, [stopAllTimers, executeScrollCycle]);

  // 停止自动循环滚动
  const stopAutoScroll = useCallback(() => {
    const state = scrollStateRef.current;
    stopAllTimers();
    state.isAutoScrollEnabled = false;
  }, [stopAllTimers]);

  // 切换自动滚动状态
  const toggleAutoScroll = useCallback(() => {
    const state = scrollStateRef.current;
    if (state.isAutoScrollEnabled) {
      console.log('停止自动滚动');
      stopAutoScroll();
    } else {
      console.log('开始自动滚动');
      startAutoScroll();
    }
  }, [startAutoScroll, stopAutoScroll]);

  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === config.toggleKey) {
        e.preventDefault();
        toggleAutoScroll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleAutoScroll, config.toggleKey]);

  // 检测故事变化（用于新段落生成时自动跳转）
  useEffect(() => {
    const state = scrollStateRef.current;
    const currentLength = allStories.length;

    if (currentLength > state.lastStoryLength && state.isAutoScrollEnabled) {
      state.lastStoryLength = currentLength;

      stopAllTimers();

      state.jumpBackTimer = setTimeout(() => {
        jumpToLatestParagraph();
      }, 300);
    } else if (currentLength > 0) {
      state.lastStoryLength = currentLength;
    }
  }, [allStories, stopAllTimers, jumpToLatestParagraph]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopAllTimers();
    };
  }, [stopAllTimers]);

  // 使用 useMemo 缓存图片映射 - 避免重复创建
  const currentImageMap = useMemo(() => createImageMap(currentImages), [currentImages]);

  // 缓存投票计算结果
  const voteStats = useMemo(() => {
    const total = Object.values(votes).reduce((sum, count) => sum + count, 0);
    let maxChoice = '';
    let maxVotes = 0;

    Object.entries(votes).forEach(([choice, voteCount]) => {
      if (voteCount > maxVotes) {
        maxVotes = voteCount;
        maxChoice = choice;
      }
    });

    return { total, maxChoice, maxVotes };
  }, [votes]);

  // 获取票数百分比的缓存函数
  const getVotePercentage = useCallback((choice) => {
    const { total } = voteStats;
    const choiceVotes = votes[choice] || 0;
    return total > 0 ? (choiceVotes / total) * 100 : 0;
  }, [votes, voteStats]);

  // 紧凑型故事文本格式化 - 更小的行高和字号
  const formatCompactStoryText = useCallback((text) => {
    if (!text) return [];
    return renderParagraphs(text, { customStyles: { fontSize: '0.9rem' } });
  }, []);

  // 渲染投票结果 - 使用 useCallback 缓存
  const renderVotingResult = useCallback((winningChoice, votes, timestamp) => {
    const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);

    return (
      <Paper sx={{ p: 1, mb: 1, bgcolor: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.2)', borderRadius: 1 }}>
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
  }, []);

  // 渲染当前故事的图文配对内容（紧凑版）- 使用 useMemo 缓存
  const renderCurrentStoryWithImages = useMemo(() => {
    if (!currentStory) return null;

    return (
      <Box sx={{ mb: 2 }} data-paragraph-index={storyHistory.length}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
            第 {storyHistory.length + 1} 段故事 (最新)
          </Typography>
          {isGenerating ? (
            <Chip size="small" label="AI生成中..." color="warning" sx={STYLES.chip} />
          ) : isVoting ? (
            <Chip size="small" label="正在投票中" color="primary" sx={STYLES.chip} />
          ) : (
            <Chip size="small" label="投票已结束" color="default" sx={STYLES.chip} />
          )}
          {currentImages && currentImages.length > 0 && (
            <Chip
              size="small"
              icon={<ImageIcon sx={{ fontSize: 14 }} />}
              label={`${currentImages.length} 张配图`}
              color="secondary"
              sx={STYLES.chip}
            />
          )}
        </Box>

        {/* 使用提取的渲染函数 */}
        {renderStoryContent(currentStory, currentImages, { imageMap: currentImageMap })}
      </Box>
    );
  }, [currentStory, storyHistory.length, isGenerating, isVoting, currentImages, currentImageMap, renderStoryContent]);

  // 渲染紧凑型投票选项（只展示，无交互）- 使用 useMemo 缓存
  const renderCompactVotingPanel = useMemo(() => {
    if (!choices || choices.length === 0) return null;

    const { total, maxChoice } = voteStats;

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
              label={`${total || 0} 票`}
              color="primary"
              variant="outlined"
              sx={STYLES.chip}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {choices.map((choice, index) => {
            const voteCount = votes[choice] || 0;
            const percentage = getVotePercentage(choice);
            const isLeading = choice === maxChoice && total > 0;

            return (
              <Paper
                key={index}
                sx={{
                  p: 0.5,
                  position: 'relative',
                  overflow: 'hidden',
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  border: isLeading ? BORDER_COLORS.leading : BORDER_COLORS.default,
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
                    bgcolor: isLeading ? VOTE_BAR_COLORS.leading : VOTE_BAR_COLORS.default,
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
  }, [choices, votes, isVoting, formatTime, votingEndTime, voteStats, getVotePercentage]);

  // 渲染历史故事项 - 使用 useMemo 缓存
  const renderHistoryItems = useMemo(() => {
    return storyHistory.map((historyItem, index) => {
      const imageMap = historyItem.images ? createImageMap(historyItem.images) : new Map();
      const hasImages = historyItem.images && historyItem.images.length > 0;

      return (
        <Box key={index} data-paragraph-index={index} sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
              第 {index + 1} 段故事
            </Typography>
            {hasImages && (
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
          <Box sx={{ mb: 1 }}>
            {hasImages ? (
              renderStoryContent(historyItem.story, historyItem.images, { imageMap })
            ) : (
              <Paper sx={{ p: 0.5, mb: 0.5, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                {formatCompactStoryText(historyItem.story)}
              </Paper>
            )}
          </Box>

          {/* 投票结果 */}
          {renderVotingResult(historyItem.winningChoice, historyItem.votes, historyItem.timestamp)}
        </Box>
      );
    });
  }, [storyHistory, formatCompactStoryText, renderStoryContent, renderVotingResult]);

  const scrollState = scrollStateRef.current;

  // 加载状态渲染
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
            <LoadingSkeleton variant="text" width="100%" height={24} />
            <LoadingSkeleton variant="text" width="95%" height={24} />
            <LoadingSkeleton variant="text" width="88%" height={24} />
            <LoadingSkeleton variant="text" width="92%" height={24} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* 历史故事段落 */}
      {renderHistoryItems}

      {/* 当前故事 */}
      {currentStory ? renderCurrentStoryWithImages : null}

      {/* 投票记录（原投票面板位置） */}
      {currentStory && isVoting && <VoterRecordList choices={choices} userVotes={userVotes} />}

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
            userVotes={novelState.userVotes || {}}
            isVoting={novelState.isVoting}
            isGenerating={novelState.isGenerating}
            votingEndTime={novelState.votingEndTime}
            totalVotes={getTotalVotes()}
            formatTime={formatTime}
            connected={connected}
            currentImages={novelState.currentImages || []}
          />
        )}

        {/* 悬浮投票面板 */}
        {connected && !isJoiningRoom && novelState && novelState.isVoting && (
          <FloatingVotingPanel
            choices={novelState.choices || []}
            votes={novelState.votes || {}}
            isVoting={novelState.isVoting}
            votingEndTime={novelState.votingEndTime}
            formatTime={formatTime}
            voteStats={{
              total: getTotalVotes(),
              maxChoice: Object.entries(novelState.votes || {}).reduce((max, [choice, count]) =>
                (novelState.votes[max] || 0) > count ? max : choice, Object.keys(novelState.votes || {})[0] || ''),
              maxVotes: Math.max(0, ...Object.values(novelState.votes || {}))
            }}
            getVotePercentage={(choice) => {
              const total = getTotalVotes();
              const choiceVotes = novelState.votes?.[choice] || 0;
              return total > 0 ? (choiceVotes / total) * 100 : 0;
            }}
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
