import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [novelState, setNovelState] = useState(null);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const { token, user, updateUser } = useAuth();

  useEffect(() => {
    if (token && user) {
      // 创建socket连接 - 使用当前访问的主机地址
      // 如果通过内网IP访问前端，socket也会连接到相同的内网IP
      let socketUrl;
      const hostname = window.location.hostname;
      if (hostname === 'abc.indiegamehub.xyz') {
        socketUrl = `http://socket.indiegamehub.xyz`;
      }else{
        socketUrl = `http://${hostname}:3001`;
      }
      console.log(`Socket连接地址: ${socketUrl}`);  
      
      // 准备认证信息
      const authInfo = { token: token };
      
      // 调试模式下传递设备ID
      if (process.env.REACT_APP_DEBUG_MODE === 'true') {
        const deviceId = localStorage.getItem('deviceId');
        if (deviceId) {
          authInfo.deviceId = deviceId;
        }
      }
      
      const newSocket = io(socketUrl, {
        auth: authInfo
      });

      newSocket.on('connect', () => {
        console.log('Socket连接成功');
        setConnected(true);
        toast.success('连接成功');
      });

      newSocket.on('disconnect', () => {
        console.log('Socket连接断开');
        setConnected(false);
        toast.error('连接断开');
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket连接错误:', error);
        toast.error('连接失败: ' + error.message);
      });

      // 小说相关事件
      newSocket.on('novel_state', (state) => {
        console.log('收到小说状态:', state);
        setNovelState(state);
      });

      newSocket.on('story_generating', (data) => {
        console.log('AI生成中:', data);
        setNovelState(prev => ({
          ...prev,
          isVoting: false,
          isGenerating: true
        }));
        toast(data.message, {
          icon: '🤖',
          duration: 5000
        });
      });

      newSocket.on('story_updated', (data) => {
        console.log('故事更新:', data);
        setNovelState(prev => ({
          ...prev,
          currentStory: data.story,
          choices: data.choices,
          votes: data.votes,
          userVotes: {},
          isVoting: true,
          isGenerating: false,
          audioUrl: data.audioUrl || null, // 初始为null，等待异步生成
          currentImages: [], // 重置图片列表，等待新图片生成
          storyHistory: data.storyHistory || prev.storyHistory
        }));
        toast.success(`故事继续！选择了: ${data.winningChoice}`);
      });

      // 音频准备就绪事件
      newSocket.on('audio_ready', (data) => {
        console.log('音频已准备好:', data);
        setNovelState(prev => ({
          ...prev,
          audioUrl: data.audioUrl
        }));
        toast.success('🎵 音频已生成，可以播放了！', {
          duration: 3000,
          position: 'bottom-right'
        });
      });

      // 图片准备就绪事件
      newSocket.on('image_ready', (data) => {
        console.log('图片已准备好:', data);
        setNovelState(prev => ({
          ...prev,
          currentImages: [...(prev.currentImages || []), {
            index: data.index,
            imageUrl: data.imageUrl,
            prompt: data.prompt,
            paragraph: data.paragraph || '', // 对应的文段
            timestamp: data.timestamp
          }]
        }));
        toast.success(`🖼️ 图片 ${data.index + 1} 已生成！`, {
          duration: 2000,
          position: 'bottom-right'
        });
      });

      newSocket.on('vote_update', (data) => {
        console.log('投票更新:', data);
        setNovelState(prev => ({
          ...prev,
          votes: data.votes,
          userVotes: data.userVotes || prev.userVotes
        }));
      });

      newSocket.on('voting_started', (data) => {
        console.log('投票开始:', data);
        setNovelState(prev => ({
          ...prev,
          votingEndTime: data.endTime,
          isVoting: true,
          discussion: {
            ...prev.discussion,
            isActive: data.discussionActive || false
          }
        }));
        toast.success('新的投票开始了！');
      });

      newSocket.on('voting_extended', (data) => {
        console.log('投票延长:', data);
        setNovelState(prev => ({
          ...prev,
          votingEndTime: data.endTime
        }));
        toast(data.message, {
          icon: 'ℹ️'
        });
      });

      newSocket.on('vote_error', (data) => {
        toast.error(data.message);
      });

      newSocket.on('story_error', (data) => {
        toast.error(data.message);
      });

      newSocket.on('story_generation_failed', (data) => {
        toast.error(data.message);
      });

      // 讨论区相关事件
      newSocket.on('discussion_message', (message) => {
        console.log('收到讨论区消息:', message);
        setNovelState(prev => ({
          ...prev,
          discussion: {
            ...prev.discussion,
            messages: [...(prev.discussion?.messages || []), message]
          }
        }));
      });

      newSocket.on('discussion_error', (data) => {
        toast.error(data.message);
      });

      // 金币相关事件
      newSocket.on('vote_success', (data) => {
        if (data.coinsSpent > 0) {
          toast.success(`投票成功！花费${data.coinsSpent}金币，总计${data.totalVotes}票`);
        } else {
          toast.success('投票成功！');
        }
      });

      newSocket.on('coins_deducted', (data) => {
        // 更新用户金币余额
        if (user) {
          updateUser({ coins: data.remainingCoins });
        }
        toast.info(`金币已扣除：${data.amount}金币 (${data.reason})`);
      });

      newSocket.on('coins_refunded', (data) => {
        // 更新用户金币余额
        if (user) {
          updateUser({ coins: data.remainingCoins });
        }
        toast.success(`金币已退还：${data.amount}金币 (${data.reason})`);
      });

      // 自定义选项相关事件
      newSocket.on('custom_option_added', (data) => {
        console.log('收到自定义选项添加:', data);
        setNovelState(prev => ({
          ...prev,
          customOptions: [...(prev.customOptions || []), data.customOption],
          votes: data.votes,
          votingEndTime: prev.votingEndTime // 时间重置在voting_time_reset事件中处理
        }));
        toast.success(`新增自定义选项: ${data.customOption.content}`);
      });

      newSocket.on('custom_option_success', (data) => {
        toast.success(`成功添加自定义选项！需要${data.requiredCoins}金币`);
      });

      newSocket.on('custom_option_error', (data) => {
        toast.error(data.message);
      });

      newSocket.on('voting_time_reset', (data) => {
        console.log('投票时间重置:', data);
        setNovelState(prev => ({
          ...prev,
          votingEndTime: data.endTime
        }));
        toast(data.message, {
          icon: '🔄',
          duration: 4000
        });
      });

      // 房间相关事件
      newSocket.on('join_room_success', (data) => {
        console.log('成功加入房间:', data);
        setCurrentRoomId(data.roomId);
        setIsJoiningRoom(false);
        toast.success(`已加入小说: ${data.title}`);
      });

      newSocket.on('join_room_error', (data) => {
        console.error('加入房间失败:', data);
        setIsJoiningRoom(false);
        toast.error(data.message);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
        setNovelState(null);
        setCurrentRoomId(null);
      }
    }
  }, [token, user]);

  const joinRoom = useCallback((roomId) => {
    if (socket && connected) {
      console.log('请求加入房间:', roomId);
      setIsJoiningRoom(true);
      setNovelState(null); // 清空之前的状态
      socket.emit('join_room', { roomId });
    }
  }, [socket, connected]);

  const vote = useCallback((choice, coinsSpent = 0) => {
    if (socket && connected) {
      socket.emit('vote', { choice, coinsSpent });
    }
  }, [socket, connected]);

  const addCustomOption = useCallback((customOption) => {
    if (socket && connected) {
      socket.emit('add_custom_option', { customOption });
    }
  }, [socket, connected]);

  const value = {
    socket,
    connected,
    novelState,
    currentRoomId,
    isJoiningRoom,
    joinRoom,
    vote,
    addCustomOption
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};