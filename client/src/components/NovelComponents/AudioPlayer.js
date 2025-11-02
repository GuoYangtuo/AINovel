import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  Slider,
  Typography,
  Paper,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  VolumeUp,
  VolumeOff,
  Replay
} from '@mui/icons-material';

/**
 * 音频播放器组件
 * 用于播放故事音频
 */
const AudioPlayer = ({ audioUrl, storyIndex }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 重置播放器状态（当音频URL改变时）
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setError(null);
  }, [audioUrl]);

  // 处理音频加载完成
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  };

  // 处理音频加载错误
  const handleError = () => {
    setError('音频加载失败');
    setIsLoading(false);
  };

  // 处理播放/暂停
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.error('播放失败:', err);
          setError('播放失败');
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  // 处理重播
  const handleReplay = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // 更新当前播放时间
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // 音频播放结束
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(duration);
  };

  // 拖动进度条
  const handleSliderChange = (event, newValue) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newValue;
      setCurrentTime(newValue);
    }
  };

  // 调整音量
  const handleVolumeChange = (event, newValue) => {
    const newVolume = newValue / 100;
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  // 静音/取消静音
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // 格式化时间显示
  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 如果没有音频URL，显示加载提示
  if (!audioUrl) {
    return (
      <Paper
        sx={{
          p: 1.5,
          bgcolor: 'rgba(102, 126, 234, 0.05)',
          border: '1px solid rgba(102, 126, 234, 0.1)',
          borderRadius: 2,
          mt: 1,
          textAlign: 'center'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="caption" color="text.secondary">
            正在生成音频...
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        p: 1.5,
        bgcolor: 'rgba(102, 126, 234, 0.08)',
        border: '1px solid rgba(102, 126, 234, 0.2)',
        borderRadius: 2,
        mt: 1
      }}
    >
      <audio
        ref={audioRef}
        src={`http://${window.location.hostname}:3001${audioUrl}`}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* 播放/暂停按钮 */}
        <Tooltip title={isPlaying ? '暂停' : '播放'}>
          <span>
            <IconButton
              onClick={togglePlayPause}
              disabled={isLoading || error}
              color="primary"
              size="small"
            >
              {isLoading ? (
                <CircularProgress size={24} />
              ) : isPlaying ? (
                <Pause />
              ) : (
                <PlayArrow />
              )}
            </IconButton>
          </span>
        </Tooltip>

        {/* 重播按钮 */}
        <Tooltip title="重播">
          <span>
            <IconButton
              onClick={handleReplay}
              disabled={isLoading || error}
              size="small"
            >
              <Replay />
            </IconButton>
          </span>
        </Tooltip>

        {/* 时间显示 */}
        <Typography variant="caption" sx={{ minWidth: '40px' }}>
          {formatTime(currentTime)}
        </Typography>

        {/* 进度条 */}
        <Box sx={{ flex: 1, mx: 1 }}>
          <Slider
            value={currentTime}
            max={duration || 100}
            onChange={handleSliderChange}
            disabled={isLoading || error}
            size="small"
            sx={{
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
              },
            }}
          />
        </Box>

        {/* 总时长 */}
        <Typography variant="caption" sx={{ minWidth: '40px' }}>
          {formatTime(duration)}
        </Typography>

        {/* 音量控制 */}
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '100px' }}>
          <Tooltip title={isMuted ? '取消静音' : '静音'}>
            <IconButton onClick={toggleMute} size="small">
              {isMuted || volume === 0 ? <VolumeOff /> : <VolumeUp />}
            </IconButton>
          </Tooltip>
          <Slider
            value={isMuted ? 0 : volume * 100}
            onChange={handleVolumeChange}
            size="small"
            sx={{
              width: 60,
              '& .MuiSlider-thumb': {
                width: 10,
                height: 10,
              },
            }}
          />
        </Box>
      </Box>

      {/* 错误提示 */}
      {error && (
        <Typography
          variant="caption"
          color="error"
          sx={{ display: 'block', mt: 0.5, textAlign: 'center' }}
        >
          {error}
        </Typography>
      )}

      {/* 音频说明 */}
      {!error && !isLoading && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.5, textAlign: 'center', opacity: 0.7 }}
        >
          🎵 故事语音朗读
        </Typography>
      )}
    </Paper>
  );
};

export default AudioPlayer;

