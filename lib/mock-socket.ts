/**
 * Mock Socket.io implementation for demo mode
 */

export interface MockSocket {
  id: string;
  connected: boolean;
  on: (event: string, callback: Function) => void;
  off: (event: string, callback: Function) => void;
  emit: (event: string, data?: any) => void;
  join: (room: string) => void;
  leave: (room: string) => void;
  to: (room: string) => MockSocket;
  disconnect: () => void;
}

class MockSocketManager {
  private static instance: MockSocketManager;
  private socket: MockSocket | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();
  private currentRoom: string = '';
  private isConnected: boolean = false;
  private mockUsers: any[] = [];
  private mockQueue: any[] = [];
  private mockChatHistory: any[] = [];
  private currentVideo: any = null;
  private videoState: any = { isPlaying: false, currentTime: 0, lastUpdate: 0 };

  static getInstance(): MockSocketManager {
    if (!MockSocketManager.instance) {
      MockSocketManager.instance = new MockSocketManager();
    }
    return MockSocketManager.instance;
  }

  createMockSocket(): MockSocket {
    if (this.socket) {
      return this.socket;
    }

    this.socket = {
      id: `mock_${Math.random().toString(36).substr(2, 9)}`,
      connected: false,
      
      on: (event: string, callback: Function) => {
        if (!this.eventHandlers.has(event)) {
          this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)!.push(callback);
      },

      off: (event: string, callback: Function) => {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          const index = handlers.indexOf(callback);
          if (index > -1) {
            handlers.splice(index, 1);
          }
        }
      },

      emit: (event: string, data?: any) => {
        this.handleEmit(event, data);
      },

      join: (room: string) => {
        this.currentRoom = room;
      },

      leave: (room: string) => {
        if (this.currentRoom === room) {
          this.currentRoom = '';
        }
      },

      to: (room: string) => this.socket!,

      disconnect: () => {
        this.isConnected = false;
        this.socket!.connected = false;
        this.emit('disconnect', 'client disconnect');
      }
    };

    // Simulate connection immediately for faster demo experience
    setTimeout(() => {
      this.isConnected = true;
      this.socket!.connected = true;
      this.emit('connect');
      console.log('🎭 Mock socket connected');
    }, 100);

    return this.socket;
  }

  private emit(event: string, data?: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Mock socket handler error:', error);
        }
      });
    }
  }

  private handleEmit(event: string, data?: any) {
    console.log(`[MOCK SOCKET] Emitting: ${event}`, data);

    switch (event) {
      case 'join_room':
        this.handleJoinRoom(data);
        break;
      case 'chat_message':
        this.handleChatMessage(data);
        break;
      case 'add_to_queue':
        this.handleAddToQueue(data);
        break;
      case 'remove_from_queue':
        this.handleRemoveFromQueue(data);
        break;
      case 'video_state_change':
        this.handleVideoStateChange(data);
        break;
      case 'skip_video':
        this.handleSkipVideo();
        break;
      case 'video_ended':
        this.handleVideoEnded();
        break;
      case 'change_username':
        this.handleChangeUsername(data);
        break;
      // Voice chat events (just acknowledge them)
      case 'voice_join':
      case 'voice_offer':
      case 'voice_answer':
      case 'voice_ice_candidate':
      case 'voice_mute_status':
      case 'voice_activity':
      case 'voice_leave':
        console.log(`[MOCK SOCKET] Voice event: ${event} (simulated)`);
        break;
      default:
        console.log(`[MOCK SOCKET] Unhandled event: ${event}`);
    }
  }

  private handleJoinRoom(data: { roomId: string; username: string }) {
    const { roomId, username } = data;
    
    // Add mock users if room is empty
    if (this.mockUsers.length === 0) {
      this.mockUsers = [
        {
          username: username,
          isHost: true,
          socketId: this.socket!.id
        },
        {
          username: 'DemoUser1',
          isHost: false,
          socketId: 'demo_user_1'
        },
        {
          username: 'DemoUser2',
          isHost: false,
          socketId: 'demo_user_2'
        }
      ];

      // Add some demo chat messages
      this.mockChatHistory = [
        {
          id: 1,
          username: 'DemoUser1',
          message: 'Welcome to the demo room! 🎤',
          timestamp: new Date(Date.now() - 300000),
          isHost: false
        },
        {
          id: 2,
          username: 'DemoUser2',
          message: 'This is a demo of KaraCoro! Add some songs to get started.',
          timestamp: new Date(Date.now() - 180000),
          isHost: false
        }
      ];
    }

    // Emit room_joined immediately for faster demo experience
    setTimeout(() => {
      this.emit('room_joined', {
        roomId,
        username,
        isHost: true,
        users: this.mockUsers,
        queue: this.mockQueue,
        currentVideo: this.currentVideo,
        videoState: this.videoState,
        chatHistory: this.mockChatHistory
      });
    }, 150); // Reduced delay for faster response
  }

  private handleChatMessage(data: { message: string }) {
    const currentUser = this.mockUsers.find(u => u.socketId === this.socket!.id);
    if (!currentUser) return;

    const chatMessage = {
      id: Date.now(),
      username: currentUser.username,
      message: data.message,
      timestamp: new Date(),
      isHost: currentUser.isHost
    };

    this.mockChatHistory.push(chatMessage);
    
    setTimeout(() => {
      this.emit('chat_message', chatMessage);
      
      // Simulate other users responding occasionally
      if (Math.random() > 0.7) {
        setTimeout(() => {
          const responses = [
            'Great song choice! 🎵',
            'Love this one!',
            'Can\'t wait to sing along!',
            'This is awesome! 🎤',
            'Demo mode is working perfectly!'
          ];
          
          const randomUser = this.mockUsers.find(u => u.socketId !== this.socket!.id);
          if (randomUser) {
            const response = {
              id: Date.now() + 1,
              username: randomUser.username,
              message: responses[Math.floor(Math.random() * responses.length)],
              timestamp: new Date(),
              isHost: randomUser.isHost
            };
            
            this.mockChatHistory.push(response);
            this.emit('chat_message', response);
          }
        }, 1000 + Math.random() * 3000);
      }
    }, 100); // Faster response
  }

  private handleAddToQueue(data: { videoUrl: string; title: string; duration: number; thumbnail: string }) {
    const currentUser = this.mockUsers.find(u => u.socketId === this.socket!.id);
    if (!currentUser) return;

    const queueItem = {
      id: Date.now(),
      videoId: this.extractVideoId(data.videoUrl) || 'demo_video',
      title: data.title,
      duration: data.duration,
      thumbnail: data.thumbnail,
      addedBy: currentUser.username,
      addedAt: new Date()
    };

    this.mockQueue.push(queueItem);

    setTimeout(() => {
      this.emit('queue_updated', {
        queue: this.mockQueue,
        addedBy: currentUser.username,
        videoTitle: queueItem.title
      });

      // Auto-start first video if none playing
      if (!this.currentVideo && this.mockQueue.length > 0) {
        setTimeout(() => {
          const nextVideo = this.mockQueue.shift();
          this.currentVideo = nextVideo;
          this.videoState = {
            isPlaying: false,
            currentTime: 0,
            lastUpdate: Date.now()
          };

          this.emit('video_changed', {
            video: this.currentVideo,
            queue: this.mockQueue,
            videoState: this.videoState
          });
        }, 500);
      }
    }, 150);
  }

  private handleRemoveFromQueue(data: { videoId: number }) {
    const currentUser = this.mockUsers.find(u => u.socketId === this.socket!.id);
    if (!currentUser || !currentUser.isHost) return;

    this.mockQueue = this.mockQueue.filter(v => v.id !== data.videoId);

    setTimeout(() => {
      this.emit('queue_updated', {
        queue: this.mockQueue,
        removedBy: currentUser.username
      });
    }, 100);
  }

  private handleVideoStateChange(data: { isPlaying: boolean; currentTime: number; action?: string }) {
    this.videoState = {
      ...data,
      lastUpdate: Date.now()
    };

    setTimeout(() => {
      this.emit('video_state_sync', this.videoState);
    }, 50);
  }

  private handleSkipVideo() {
    if (this.mockQueue.length > 0) {
      const nextVideo = this.mockQueue.shift();
      this.currentVideo = nextVideo;
      this.videoState = {
        isPlaying: false,
        currentTime: 0,
        lastUpdate: Date.now()
      };

      setTimeout(() => {
        this.emit('video_changed', {
          video: this.currentVideo,
          queue: this.mockQueue,
          videoState: this.videoState
        });
      }, 150);
    } else {
      this.currentVideo = null;
      this.videoState = {
        isPlaying: false,
        currentTime: 0,
        lastUpdate: Date.now()
      };

      setTimeout(() => {
        this.emit('video_ended', {
          queue: this.mockQueue,
          videoState: this.videoState
        });
      }, 150);
    }
  }

  private handleVideoEnded() {
    this.handleSkipVideo();
  }

  private handleChangeUsername(data: { newUsername: string }) {
    const currentUser = this.mockUsers.find(u => u.socketId === this.socket!.id);
    if (!currentUser) return;

    const oldUsername = currentUser.username;
    currentUser.username = data.newUsername;

    setTimeout(() => {
      this.emit('username_changed', {
        socketId: this.socket!.id,
        oldUsername,
        newUsername: data.newUsername
      });
    }, 100);
  }

  private extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.eventHandlers.clear();
      this.mockUsers = [];
      this.mockQueue = [];
      this.mockChatHistory = [];
      this.currentVideo = null;
      this.videoState = { isPlaying: false, currentTime: 0, lastUpdate: 0 };
    }
  }
}

export default MockSocketManager;