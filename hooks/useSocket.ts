/**
 * Socket.io Performance Optimization Recommendations
 */

// CURRENT ISSUES IN useSocket.ts:
// 1. Socket connection not properly memoized
// 2. Event listeners being re-registered on every render
// 3. No cleanup for subscriptions
// 4. State updates causing unnecessary re-renders
// 5. Large roomState object causing cascading re-renders

// OPTIMIZED IMPLEMENTATION:

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';

// OPTIMIZATION 1: Split large state into focused contexts
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

// OPTIMIZATION 2: Separate connection state from room state
export interface ConnectionState {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
}

export interface RoomInfo {
  roomId: string;
  username: string;
  isHost: boolean;
}

export interface RoomData {
  users: User[];
  queue: QueueItem[];
  currentVideo: QueueItem | null;
  videoState: VideoState;
  chatHistory: ChatMessage[];
}

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventListenersRegistered = useRef(false);

  // OPTIMIZATION 3: Split state into focused pieces - but maintain compatibility
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    connected: false,
    reconnecting: false,
    error: null,
  });

  const [roomInfo, setRoomInfo] = useState<RoomInfo>({
    roomId: '',
    username: '',
    isHost: false,
  });

  const [roomData, setRoomData] = useState<RoomData>({
    users: [],
    queue: [],
    currentVideo: null,
    videoState: { isPlaying: false, currentTime: 0, lastUpdate: 0 },
    chatHistory: [],
  });

  // COMPATIBILITY: Combine states into single roomState for backward compatibility
  const roomState = useMemo(() => ({
    ...roomInfo,
    ...roomData,
    connected: connectionState.connected,
  }), [roomInfo, roomData, connectionState.connected]);

  // OPTIMIZATION 4: Memoized socket URL calculation
  const socketUrl = useMemo(() => {
    if (process.env.NEXT_PUBLIC_SOCKET_URL) {
      return process.env.NEXT_PUBLIC_SOCKET_URL;
    }
    
    if (typeof window === 'undefined') {
      return 'http://localhost:3001';
    }
    
    const currentUrl = window.location;
    
    if (currentUrl.hostname.includes('webcontainer-api.io')) {
      const socketHostname = currentUrl.hostname.replace(/--3000--/, '--3001--');
      return `http://${socketHostname}`;
    }
    
    if (currentUrl.hostname === 'localhost') {
      return 'http://localhost:3001';
    }
    
    const protocol = currentUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${currentUrl.hostname}`;
  }, []);

  // OPTIMIZATION 5: Individual memoized event handlers (fixing Rules of Hooks violation)
  const handleConnect = useCallback(() => {
    console.log('🔌 Socket connected');
    setConnectionState(prev => ({ ...prev, connected: true, reconnecting: false, error: null }));
  }, []);

  const handleDisconnect = useCallback((reason: string) => {
    console.log('❌ Socket disconnected:', reason);
    setConnectionState(prev => ({ ...prev, connected: false, error: reason }));
    
    // Auto-reconnect logic
    if (reason === 'io server disconnect') {
      // Server initiated disconnect, don't auto-reconnect
      return;
    }
    
    setConnectionState(prev => ({ ...prev, reconnecting: true }));
    reconnectTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.connect();
      }
    }, 5000);
  }, []);

  const handleConnectError = useCallback((error: Error) => {
    console.error('🚨 Socket connection error:', error);
    setConnectionState(prev => ({ ...prev, connected: false, error: error.message }));
  }, []);

  // Room events
  const handleRoomJoined = useCallback((data: any) => {
    console.log('🏠 Joined room:', data);
    setRoomInfo({
      roomId: data.roomId,
      username: data.username,
      isHost: data.isHost,
    });
    setRoomData(prev => ({
      ...prev,
      users: data.users || [],
      queue: data.queue || [],
      currentVideo: data.currentVideo || null,
      videoState: data.videoState || { isPlaying: false, currentTime: 0, lastUpdate: 0 },
      chatHistory: data.chatHistory || [],
    }));
  }, []);

  const handleUserJoined = useCallback((data: User) => {
    setRoomData(prev => ({
      ...prev,
      users: [...prev.users.filter(u => u.socketId !== data.socketId), data],
    }));
  }, []);

  const handleUserLeft = useCallback((data: { socketId: string; username: string }) => {
    setRoomData(prev => ({
      ...prev,
      users: prev.users.filter(user => user.socketId !== data.socketId),
    }));
  }, []);

  const handleQueueUpdated = useCallback((data: { queue: QueueItem[] }) => {
    setRoomData(prev => ({ ...prev, queue: data.queue || [] }));
  }, []);

  const handleVideoChanged = useCallback((data: { video: QueueItem | null; queue: QueueItem[]; videoState: VideoState }) => {
    setRoomData(prev => ({
      ...prev,
      currentVideo: data.video || null,
      queue: data.queue || [],
      videoState: data.videoState,
    }));
  }, []);

  const handleVideoStateSync = useCallback((videoState: VideoState) => {
    setRoomData(prev => ({ 
      ...prev, 
      videoState: {
        ...videoState,
        lastUpdate: Date.now()
      }
    }));
  }, []);

  const handleVideoSync = useCallback((data: { currentTime: number; isPlaying: boolean; timestamp?: number }) => {
    setRoomData(prev => ({
      ...prev,
      videoState: {
        currentTime: data.currentTime,
        isPlaying: data.isPlaying,
        lastUpdate: data.timestamp || Date.now()
      }
    }));
  }, []);

  const handleChatMessage = useCallback((message: ChatMessage) => {
    // Play notification sound for system messages  
    if (message.isSystem) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAeATCG1O7Afh8ECU622uvBaCYGMYnX8dONOgjwaufts18xCU2k5P6raxsEO4vS8tlkpT9hVcnTDzuD17nN8ldaTm1X9Rl3ndHxumwUlr/f5tSX2d4Db');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
    
    setRoomData(prev => ({
      ...prev,
      chatHistory: [...prev.chatHistory, message],
    }));
  }, []);

  const handleHostChanged = useCallback((data: { socketId: string; currentVideo?: QueueItem; videoState?: VideoState; queue?: QueueItem[] }) => {
    setRoomData(prev => {
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
      };
    });
    
    setRoomInfo(prev => ({
      ...prev,
      isHost: data.socketId === socketRef.current?.id
    }));
  }, []);

  const handleHostMigrationRecovery = useCallback((data: { currentVideo: QueueItem; videoState: VideoState; queue: QueueItem[] }) => {
    setRoomData(prev => ({
      ...prev,
      currentVideo: data.currentVideo,
      videoState: data.videoState,
      queue: data.queue,
    }));
    setRoomInfo(prev => ({ ...prev, isHost: true }));
  }, []);

  // OPTIMIZATION 6: Create event handlers object from individual callbacks
  const eventHandlers = useMemo(() => ({
    connect: handleConnect,
    disconnect: handleDisconnect,
    connect_error: handleConnectError,
    room_joined: handleRoomJoined,
    user_joined: handleUserJoined,
    user_left: handleUserLeft,
    queue_updated: handleQueueUpdated,
    video_changed: handleVideoChanged,
    video_state_sync: handleVideoStateSync,
    video_sync: handleVideoSync,
    chat_message: handleChatMessage,
    host_changed: handleHostChanged,
    host_migration_recovery: handleHostMigrationRecovery,
  }), [
    handleConnect,
    handleDisconnect,
    handleConnectError,
    handleRoomJoined,
    handleUserJoined,
    handleUserLeft,
    handleQueueUpdated,
    handleVideoChanged,
    handleVideoStateSync,
    handleVideoSync,
    handleChatMessage,
    handleHostChanged,
    handleHostMigrationRecovery,
  ]);

  // OPTIMIZATION 7: Register event listeners only once
  const registerEventListeners = useCallback(() => {
    if (!socketRef.current || eventListenersRegistered.current) return;

    Object.entries(eventHandlers).forEach(([event, handler]) => {
      socketRef.current!.on(event, handler);
    });

    eventListenersRegistered.current = true;
    console.log('🎯 Socket event listeners registered');
  }, [eventHandlers]);

  // OPTIMIZATION 7: Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      Object.keys(eventHandlers).forEach(event => {
        socketRef.current!.off(event);
      });
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    eventListenersRegistered.current = false;
  }, [eventHandlers]);

  // OPTIMIZATION 8: Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    try {
      socketRef.current = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      registerEventListeners();
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      setConnectionState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, [socketUrl, registerEventListeners]);

  // Initialize socket on mount
  useEffect(() => {
    initializeSocket();
    return cleanup;
  }, [initializeSocket, cleanup]);

  // OPTIMIZATION 9: Memoized action functions - matching original API
  const joinRoom = useCallback((roomId: string, username: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_room', { roomId, username });
    }
  }, []);

  const sendChatMessage = useCallback((message: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat_message', { message });
    }
  }, []);

  const addToQueue = useCallback((videoUrl: string, title: string, duration: number, thumbnail: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('add_to_queue', { videoUrl, title, duration, thumbnail });
    }
  }, []);

  const removeFromQueue = useCallback((videoId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('remove_from_queue', { videoId });
    }
  }, []);

  const updateVideoState = useCallback((isPlaying: boolean, currentTime: number, action?: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('video_state_change', { isPlaying, currentTime, action });
    }
  }, []);

  const skipVideo = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('skip_video');
    }
  }, []);

  const videoEnded = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('video_ended');
    }
  }, []);

  const forceSyncAll = useCallback((videoState: { isPlaying: boolean; currentTime: number }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('force_sync_all', videoState);
    }
  }, []);

  const requestVideoSync = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('request_video_sync');
    }
  }, []);

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
    requestVideoSync,
  };
};