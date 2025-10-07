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
  isSystem?: boolean;
  type?: string;
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
  // console.log('🔍 [useSocket] Getting socket URL...');
      
      if (process.env.NEXT_PUBLIC_SOCKET_URL) {
  // console.log('✅ [useSocket] Using NEXT_PUBLIC_SOCKET_URL:', process.env.NEXT_PUBLIC_SOCKET_URL);
        return process.env.NEXT_PUBLIC_SOCKET_URL;
      }
      
      if (typeof window === 'undefined') {
  // console.log('🌐 [useSocket] Server-side rendering, using default localhost:3001');
        return 'http://localhost:3001';
      }
      
      const currentUrl = window.location;
      // console.log('🌐 [useSocket] Current window location:', {
      //   hostname: currentUrl.hostname,
      //   protocol: currentUrl.protocol,
      //   port: currentUrl.port,
      //   href: currentUrl.href
      // });
      
      if (currentUrl.hostname.includes('webcontainer-api.io')) {
        const socketHostname = currentUrl.hostname.replace(/--3000--/, '--3001--');
  // console.log('📦 [useSocket] WebContainer detected, using:', `http://${socketHostname}`);
        return `http://${socketHostname}`;
      }
      
      if (currentUrl.hostname === 'localhost') {
  // console.log('🏠 [useSocket] Localhost detected, using: http://localhost:3001');
        return 'http://localhost:3001';
      }
      
      // Production fallback
      const protocol = currentUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      const fallbackUrl = `${protocol}//${currentUrl.hostname}`;
  // console.log('🚀 [useSocket] Production fallback:', fallbackUrl);
      return fallbackUrl;
    };

    const socketUrl = getSocketUrl();
  // console.log('🔌 [useSocket] Attempting to connect to:', socketUrl);
    
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      autoConnect: true,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
  // console.log('✅ [useSocket] Socket connected successfully:', socket.id);
  // console.log('✅ [useSocket] Socket transport:', socket.io.engine.transport.name);
      setRoomState(prev => ({ ...prev, connected: true }));
    });

    socket.on('disconnect', (reason) => {
  // console.log('❌ [useSocket] Socket disconnected:', reason);
      setRoomState(prev => ({ ...prev, connected: false }));
    });

    socket.on('connect_error', (error) => {
  // console.error('❌ [useSocket] Connection error:', error);
      setRoomState(prev => ({ ...prev, connected: false }));
    });

    // Room events
    socket.on('room_joined', (data) => {
  // console.log('Client: Room joined:', data.roomId);
  // console.log('Client: Initial chat history length:', data.chatHistory?.length || 0);
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

    // Chat events
    socket.on('chat_message', (message) => {
      // Play notification sound for system messages
      if (message.isSystem) {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAeATCG1O7Afh8ECU622uvBaCYGMYnX8dONOgjwaufts18xCU2k5P6raxsEO4vS8tlkpT9hVcnTDzuD17nN8ldaTm1X9Rl3ndHxumwUlr/f5tSX2d4Db');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      }
      
      setRoomState(prev => ({
        ...prev,
        chatHistory: [...prev.chatHistory, message]
      }));
    });

    // Queue events
    socket.on('queue_updated', (data) => {
      setRoomState(prev => ({
        ...prev,
        queue: data.queue || []
      }));
    });

    // Video events
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

    socket.on('video_sync', (data) => {
  // console.log('🎥 [useSocket] Video sync received:', data);
      setRoomState(prev => ({
        ...prev,
        videoState: {
          currentTime: data.currentTime,
          isPlaying: data.isPlaying,
          lastUpdate: data.timestamp || Date.now()
        }
      }));
    });

    // Host events
    socket.on('host_changed', (data) => {
  // console.log('👑 [useSocket] Host changed:', data);
      setRoomState(prev => {
        const updatedUsers = prev.users.map(user => ({
          ...user,
          isHost: user.socketId === data.socketId
        }));

        return {
          ...prev,
          users: updatedUsers,
          currentVideo: data.currentVideo || prev.currentVideo,
          videoState: data.videoState || prev.videoState,
          queue: data.queue || prev.queue,
          isHost: data.socketId === socket.id
        };
      });
    });

    socket.on('host_migration_recovery', (data) => {
  // console.log('🔄 [useSocket] Host migration recovery:', data);
      setRoomState(prev => ({
        ...prev,
        currentVideo: data.currentVideo,
        videoState: data.videoState,
        queue: data.queue,
        isHost: true
      }));
  // console.log('✅ [useSocket] You are now the host. Video sync restored.');
    });

    // Error handling
    socket.on('error', (error) => {
  // console.error('❌ [useSocket] Socket error:', error);
    });

    // Reconnection events
    socket.on('reconnect', (attemptNumber) => {
  // console.log('🔄 [useSocket] Reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
  // console.log('🔄 [useSocket] Reconnection attempt #', attemptNumber);
    });

    socket.on('reconnect_error', (error) => {
  // console.error('❌ [useSocket] Reconnection error:', error);
    });

    socket.on('reconnect_failed', () => {
  // console.error('❌ [useSocket] Failed to reconnect after all attempts');
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Socket methods
  const joinRoom = (roomId: string, username: string, userId?: string) => {
    if (socketRef.current) {
      // console.log('Joining room:', roomId, 'as:', username, 'userId:', userId);
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

  const forceSyncAll = (videoState: { isPlaying: boolean; currentTime: number }) => {
    if (socketRef.current) {
      // console.log('🔄 [useSocket] Force syncing all participants:', videoState);
      socketRef.current.emit('force_sync_all', videoState);
    }
  };

  const requestVideoSync = () => {
    if (socketRef.current) {
      // console.log('🔄 [useSocket] Requesting video sync from host');
      socketRef.current.emit('request_video_sync');
    }
  };

  const videoEnded = () => {
    if (socketRef.current) {
      socketRef.current.emit('video_ended');
    }
  };

  return {
    roomState,
    socket: socketRef.current,
    joinRoom,
    sendChatMessage,
    addToQueue,
    removeFromQueue,
    updateVideoState,
    skipVideo,
    videoEnded,
    forceSyncAll,
    requestVideoSync
  };
};