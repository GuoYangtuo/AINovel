import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
  Paper
} from '@mui/material';
import {
  MenuBook,
  AutoStories
} from '@mui/icons-material';

const StoryDisplay = ({ story, isLoading }) => {
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
            故事正文
          </Typography>
        </Box>

        {story ? (
          <Paper
            sx={{
              p: 3,
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
              {formatStoryText(story)}
            </Box>
          </Paper>
        ) : (
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

        {story && (
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