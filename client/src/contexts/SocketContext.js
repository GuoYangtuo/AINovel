import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const { token, user } = useAuth();

  useEffect(() => {
    if (token && user) {
      // 创建socket连接
      const newSocket = io('http://localhost:3001', {
        auth: {
          token: token
        }
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

      newSocket.on('story_updated', (data) => {
        console.log('故事更新:', data);
        setNovelState(prev => ({
          ...prev,
          currentStory: data.story,
          choices: data.choices,
          votes: data.votes,
          userVotes: {},
          isVoting: true
        }));
        toast.success(`故事继续！选择了: ${data.winningChoice}`);
      });

      newSocket.on('vote_update', (data) => {
        console.log('投票更新:', data);
        setNovelState(prev => ({
          ...prev,
          votes: data.votes,
          userVotes: { ...prev.userVotes, ...data.userVote }
        }));
      });

      newSocket.on('voting_started', (data) => {
        console.log('投票开始:', data);
        setNovelState(prev => ({
          ...prev,
          votingEndTime: data.endTime,
          isVoting: true
        }));
        toast.success('新的投票开始了！');
      });

      newSocket.on('voting_extended', (data) => {
        console.log('投票延长:', data);
        setNovelState(prev => ({
          ...prev,
          votingEndTime: data.endTime
        }));
        toast.info(data.message);
      });

      newSocket.on('vote_error', (data) => {
        toast.error(data.message);
      });

      newSocket.on('story_error', (data) => {
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
      }
    }
  }, [token, user]);

  const vote = (choice) => {
    if (socket && connected) {
      socket.emit('vote', { choice });
    }
  };

  const value = {
    socket,
    connected,
    novelState,
    vote
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};