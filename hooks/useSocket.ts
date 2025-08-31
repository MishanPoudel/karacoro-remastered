import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface User {
  username: string;
  isHost: boolean;
  socketId: string;
}

export interface QueueItem {
  id: number;
  videoId: string;
  title: string;
  duration: number;
  thumbnail: string;
  addedBy: string;
  addedAt: Date;
}

export interface ChatMessage {
  id: number;
  username: string;
  message: string;
  timestamp: Date;
  isHost: boolean;
}

export interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  lastUpdate: number;
  action?: string;
}

export interface RoomState {
  roomId: string;
  username: string;
  isHost: boolean;
  users: User[];
  queue: QueueItem[];
  currentVideo: QueueItem | null;
  videoState: VideoState;
  chatHistory: ChatMessage[];
  connected: boolean;
}

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [roomState, setRoomState] = useState<RoomState>({
    roomId: '',
    username: '',
    isHost: false,
    users: [],
    queue: [],
    currentVideo: null,
    videoState: { isPlaying: false, currentTime: 0, lastUpdate: 0 },
    chatHistory: [],
    connected: false,
  });

  useEffect(() => {
    if (socketRef.current) return;

    const getSocketUrl = () => {
      if (typeof window === 'undefined') return 'http://localhost:3001';
      
      const currentUrl = window.location;
      if (currentUrl.hostname.includes('webcontainer-api.io')) {
        const socketHostname = currentUrl.hostname.replace(/--3000--/, '--3001--');
        return `http://${socketHostname}`;
      }
      return 'http://localhost:3001';
    };

    const socket = io(getSocketUrl(), {
      transports: ['websocket'],
      upgrade: false,
      rememberUpgrade: false,
      autoConnect: true,
      forceNew: true,
      reconnection: false
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setRoomState(prev => ({ ...prev, connected: true }));
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setRoomState(prev => ({ ...prev, connected: false }));
    });

    socket.on('room_joined', (data) => {
      console.log('Room joined:', data);
      setRoomState(prev => ({
        ...prev,
        roomId: data.roomId,
        username: data.username,
        isHost: data.isHost,
        users: data.users || [],
        queue: data.queue || [],
        currentVideo: data.currentVideo || null,
        videoState: data.videoState || { isPlaying: false, currentTime: 0, lastUpdate: 0 },
        chatHistory: data.chatHistory || []
      }));
    });

    socket.on('user_joined', (data) => {
      setRoomState(prev => ({
        ...prev,
        users: [...prev.users.filter(u => u.socketId !== data.socketId), data]
      }));
    });

    socket.on('user_left', (data) => {
      setRoomState(prev => ({
        ...prev,
        users: prev.users.filter(user => user.socketId !== data.socketId)
      }));
    });

    socket.on('chat_message', (message) => {
      setRoomState(prev => ({
        ...prev,
        chatHistory: [...prev.chatHistory, message]
      }));
    });

    socket.on('queue_updated', (data) => {
      setRoomState(prev => ({
        ...prev,
        queue: data.queue || []
      }));
    });

    socket.on('video_changed', (data) => {
      setRoomState(prev => ({
        ...prev,
        currentVideo: data.video || null,
        queue: data.queue || [],
        videoState: data.videoState || { isPlaying: false, currentTime: 0, lastUpdate: 0 }
      }));
    });

    socket.on('video_state_sync', (videoState) => {
      setRoomState(prev => ({
        ...prev,
        videoState: {
          ...videoState,
          lastUpdate: Date.now()
        }
      }));
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return () => {
      // Don't disconnect on cleanup
    };
  }, []);

  const joinRoom = (roomId: string, username: string, userId?: string) => {
    if (socketRef.current) {
      console.log('Joining room:', roomId, 'as:', username, 'userId:', userId);
      socketRef.current.emit('join_room', { roomId, username, userId });
    }
  };

  const sendChatMessage = (message: string) => {
    if (socketRef.current) {
      socketRef.current.emit('chat_message', { message });
    }
  };

  const addToQueue = (videoUrl: string, title: string, duration: number, thumbnail: string) => {
    if (socketRef.current) {
      socketRef.current.emit('add_to_queue', { videoUrl, title, duration, thumbnail });
    }
  };

  const removeFromQueue = (videoId: number) => {
    if (socketRef.current) {
      socketRef.current.emit('remove_from_queue', { videoId });
    }
  };

  const updateVideoState = (isPlaying: boolean, currentTime: number, action?: string) => {
    if (socketRef.current) {
      socketRef.current.emit('video_state_change', { isPlaying, currentTime, action });
    }
  };

  const skipVideo = () => {
    if (socketRef.current) {
      socketRef.current.emit('skip_video');
    }
  };

  const videoEnded = () => {
    if (socketRef.current) {
      socketRef.current.emit('video_ended');
    }
  };

  return {
    roomState,
    joinRoom,
    sendChatMessage,
    addToQueue,
    removeFromQueue,
    updateVideoState,
    skipVideo,
    videoEnded
  };
};