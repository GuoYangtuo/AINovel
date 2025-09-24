import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Send,
  Chat,
  Person
} from '@mui/icons-material';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

const DiscussionPanel = ({ 
  discussion = { messages: [], isActive: false }, 
  isVoting = false 
}) => {
  const { user } = useAuth();
  const { connected } = useSocket();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(discussion.messages || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // 当discussion prop变化时更新messages
  useEffect(() => {
    setMessages(discussion.messages || []);
    console.log(discussion.messages)
  }, [discussion.messages]);

  // 自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const { socket } = useSocket();

  const handleSendMessage = async () => {
    if (!message.trim() || !connected || !isVoting) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 通过Socket发送消息
      if (socket) {
        socket.emit('discussion_message', { message: message.trim() });
        setMessage('');
      }
    } catch (err) {
      setError('发送消息失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return '刚刚';
    if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}小时前`;
    return date.toLocaleDateString();
  };

  return (
    <Card
      sx={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        mt: 2
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
        <Box display="flex" alignItems="center" mb={2}>
          <Chat sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            讨论区
          </Typography>
          {/*isVoting && discussion.isActive && (
            <Chip
              label="活跃"
              color="success"
              size="small"
              sx={{ ml: 2 }}
            />
          )*/}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* 消息列表 */}
        <Paper
          sx={{
            height: 200,
            overflow: 'auto',
            p: 1.5,
            mb: 2,
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 1
          }}
        >
          {messages.length === 0 ? (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              height="100%"
              color="text.secondary"
            >
              <Chat sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2">
                {isVoting && discussion.isActive 
                  ? '向大家分享你的想法吧！' 
                  : '讨论区暂时关闭'
                }
              </Typography>
            </Box>
          ) : (
            messages.map((msg, index) => (
              <Box key={msg.id || index} mb={1}>
                <Typography
                  variant="body2"
                  sx={{
                    wordBreak: 'break-word',
                    lineHeight: 1.3,
                    fontSize: '0.85rem'
                  }}
                >
                  <Box component="span" sx={{ fontWeight: 'bold', color: 'primary.main', mr: 1 }}>
                    {msg.username || '匿名用户'}:
                  </Box>
                  {msg.message}
                </Typography>
              </Box>
            ))
          )}
          <div ref={messagesEndRef} />
        </Paper>

        {/* 消息输入框 */}
        {isVoting && discussion.isActive ? (
          <Box display="flex" gap={1}>
            <TextField
              fullWidth
              multiline
              maxRows={3}
              placeholder="回车Enter发送"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!connected || isLoading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                  },
                },
                '& .MuiInputBase-input': {
                  color: 'white',
                  '&::placeholder': {
                    color: 'rgba(255, 255, 255, 0.6)',
                  },
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={!message.trim() || !connected || isLoading}
              sx={{
                minWidth: 'auto',
                px: 2,
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
                },
                '&:disabled': {
                  background: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              {isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <Send />
              )}
            </Button>
          </Box>
        ) : (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            p={2}
            sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 1,
              border: '1px dashed rgba(255, 255, 255, 0.2)'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {!isVoting 
                ? '等待投票开始...' 
                : '讨论区暂时关闭'
              }
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DiscussionPanel;