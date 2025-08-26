import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { CONFIG, envLog } from '@/lib/config';
import { trackKaraokeEvent, trackError } from '@/lib/analytics';
import { MockSocket } from '@/lib/mock-socket';
import { toast } from 'sonner';

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
  isDemoMode: boolean;
}

export const useSocket = () => {
  const socketRef = useRef<Socket | MockSocket | null>(null);
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
    isDemoMode: false
  });

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const { default: SocketManager } = await import('@/lib/socket-manager');
        const socketManager = SocketManager.getInstance();
        
        const socket = await socketManager.connect();
        socketRef.current = socket;
        
        const isDemoMode = socketManager.isInDemoMode();
        setRoomState(prev => ({ ...prev, isDemoMode }));
        
        setupSocketListeners(socket);
        
      } catch (error) {
        envLog.error('Failed to initialize socket:', error);
        setRoomState(prev => ({ ...prev, connected: false }));
      }
    };

    const setupSocketListeners = (socket: Socket | MockSocket) => {
      // Clear any existing listeners first
      if ('removeAllListeners' in socket) {
        socket.removeAllListeners();
      }

      socket.on('connect', () => {
        setRoomState(prev => ({ ...prev, connected: true }));
      });

      socket.on('disconnect', () => {
        setRoomState(prev => ({ ...prev, connected: false }));
      });

      socket.on('room_joined', (data) => {
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
        toast.error(error.message || 'Socket error occurred');
      });
    };

    initializeSocket();

    // No cleanup function to prevent disconnects
  }, []);

  const joinRoom = (roomId: string, username: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join_room', { roomId, username });
    }
  };

  const changeUsername = (newUsername: string) => {
    if (socketRef.current) {
      socketRef.current.emit('change_username', { newUsername });
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
    changeUsername,
    sendChatMessage,
    addToQueue,
    removeFromQueue,
    updateVideoState,
    skipVideo,
    videoEnded
  };
};