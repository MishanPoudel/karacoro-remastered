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
        envLog.info('Initializing socket connection');
        
        // Dynamic import to avoid SSR issues
        const { default: SocketManager } = await import('@/lib/socket-manager');
        const socketManager = SocketManager.getInstance();
        
        const socket = await socketManager.connect();
        socketRef.current = socket;
        
        // Store socket globally for voice chat access
        if (typeof window !== 'undefined') {
          (window as any).__KARAOKE_SOCKET__ = socket;
        }
        
        const isDemoMode = socketManager.isInDemoMode();
        setRoomState(prev => ({ ...prev, isDemoMode, connected: socketManager.isConnected() }));
        
        if (isDemoMode) {
          trackKaraokeEvent('socket_connected', { type: 'mock' });
        } else {
          trackKaraokeEvent('socket_connected', { type: 'real' });
        }

        // Setup event listeners
        setupSocketListeners(socket);
        
      } catch (error) {
        envLog.error('Failed to initialize socket:', error);
        trackError(error as Error, { context: 'socket_initialization' });
        setRoomState(prev => ({ ...prev, connected: false }));
      }
    };

    const setupSocketListeners = (socket: Socket | MockSocket) => {
      // Clear any existing listeners first
      if (typeof (socket as any).removeAllListeners === 'function') {
        (socket as any).removeAllListeners();
      }

      // Connection events
      socket.on('connect', () => {
        envLog.info('Socket connected');
        setRoomState(prev => ({ ...prev, connected: true }));
        trackKaraokeEvent('socket_connection_established');
      });

      socket.on('disconnect', (reason) => {
        envLog.info('Socket disconnected:', reason);
        setRoomState(prev => ({ ...prev, connected: false }));
        trackKaraokeEvent('socket_disconnected', { reason });
      });

      socket.on('connect_error', (error) => {
        envLog.error('Socket connection error:', error);
        setRoomState(prev => ({ ...prev, connected: false }));
      });

      // Room events
      socket.on('room_joined', (data) => {
        envLog.info('Joined room:', data);
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
        
        trackKaraokeEvent('room_joined', {
          roomId: data.roomId,
          isHost: data.isHost,
          userCount: data.users?.length || 0
        });
      });

      socket.on('user_joined', (data) => {
        envLog.info('User joined:', data);
        setRoomState(prev => {
          // Check if user already exists to prevent duplicates
          const userExists = prev.users.some(u => u.socketId === data.socketId);
          if (userExists) return prev;
          
          return {
            ...prev,
            users: [...prev.users, data]
          };
        });
        
        trackKaraokeEvent('user_joined_room', { username: data.username });
      });

      socket.on('user_left', (data) => {
        envLog.info('User left:', data);
        setRoomState(prev => ({
          ...prev,
          users: prev.users.filter(user => user.socketId !== data.socketId)
        }));
        
        trackKaraokeEvent('user_left_room', { username: data.username });
      });

      socket.on('host_changed', (data) => {
        envLog.info('Host changed:', data);
        setRoomState(prev => ({
          ...prev,
          users: prev.users.map(user => ({
            ...user,
            isHost: user.socketId === data.socketId
          })),
          isHost: prev.username === data.newHost
        }));
        
        trackKaraokeEvent('host_changed', { newHost: data.newHost });
      });

      socket.on('username_changed', (data) => {
        envLog.info('Username changed:', data);
        setRoomState(prev => ({
          ...prev,
          users: prev.users.map(user => 
            user.socketId === data.socketId 
              ? { ...user, username: data.newUsername }
              : user
          ),
          username: prev.username === data.oldUsername ? data.newUsername : prev.username
        }));
      });

      // Chat events
      socket.on('chat_message', (message) => {
        envLog.debug('Chat message received:', message);
        setRoomState(prev => {
          // Check if message already exists to prevent duplicates
          const messageExists = prev.chatHistory.some(m => m.id === message.id);
          if (messageExists) {
            return prev;
          }
          return {
            ...prev,
            chatHistory: [...prev.chatHistory, message]
          };
        });
      });

      // Queue events
      socket.on('queue_updated', (data) => {
        envLog.debug('Queue updated:', data);
        setRoomState(prev => ({
          ...prev,
          queue: data.queue || []
        }));
      });

      // Video events
      socket.on('video_changed', (data) => {
        envLog.debug('Video changed:', data);
        setRoomState(prev => ({
          ...prev,
          currentVideo: data.video || null,
          queue: data.queue || [],
          videoState: data.videoState || { isPlaying: false, currentTime: 0, lastUpdate: 0 }
        }));
        
        trackKaraokeEvent('video_changed', { 
          videoTitle: data.video?.title,
          queueLength: data.queue?.length || 0
        });
      });

      socket.on('video_state_sync', (videoState) => {
        envLog.debug('Video state sync:', videoState);
        setRoomState(prev => ({
          ...prev,
          videoState: {
            ...videoState,
            lastUpdate: Date.now()
          }
        }));
      });

      socket.on('video_ended', (data) => {
        envLog.debug('Video ended:', data);
        setRoomState(prev => ({
          ...prev,
          currentVideo: null,
          queue: data.queue || [],
          videoState: data.videoState || { isPlaying: false, currentTime: 0, lastUpdate: 0 }
        }));
        
        trackKaraokeEvent('video_ended', { queueLength: data.queue?.length || 0 });
      });

      // Error handling
      socket.on('error', (error) => {
        envLog.error('Socket error:', error);
        trackError(new Error(error.message || 'Socket error'), { context: 'socket_event' });
        toast.error(error.message || 'Socket error occurred');
      });
    };

    initializeSocket();

    return () => {
      if (socketRef.current) {
        if ('disconnect' in socketRef.current) {
          socketRef.current.disconnect();
        }
        socketRef.current = null;
        
        if (typeof window !== 'undefined') {
          delete (window as any).__KARAOKE_SOCKET__;
        }
      }
    };
  }, []);

  const joinRoom = (roomId: string, username: string) => {
    if (socketRef.current) {
      envLog.info(`Joining room ${roomId} as ${username}`);
      socketRef.current.emit('join_room', { roomId, username });
    }
  };

  const changeUsername = (newUsername: string) => {
    if (socketRef.current) {
      envLog.info(`Changing username to ${newUsername}`);
      socketRef.current.emit('change_username', { newUsername });
    }
  };

  const sendChatMessage = (message: string) => {
    if (socketRef.current) {
      envLog.debug(`Sending chat message: ${message}`);
      socketRef.current.emit('chat_message', { message });
    }
  };

  const addToQueue = (videoUrl: string, title: string, duration: number, thumbnail: string) => {
    if (socketRef.current) {
      envLog.info(`Adding to queue: ${title}`);
      socketRef.current.emit('add_to_queue', { videoUrl, title, duration, thumbnail });
    }
  };

  const removeFromQueue = (videoId: number) => {
    if (socketRef.current) {
      envLog.info(`Removing from queue: ${videoId}`);
      socketRef.current.emit('remove_from_queue', { videoId });
    }
  };

  const updateVideoState = (isPlaying: boolean, currentTime: number, action?: string) => {
    if (socketRef.current) {
      envLog.debug(`Video state update: playing=${isPlaying}, time=${currentTime}`);
      socketRef.current.emit('video_state_change', { isPlaying, currentTime, action });
    }
  };

  const skipVideo = () => {
    if (socketRef.current) {
      envLog.info('Skipping video');
      socketRef.current.emit('skip_video');
    }
  };

  const videoEnded = () => {
    if (socketRef.current) {
      envLog.info('Video ended');
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