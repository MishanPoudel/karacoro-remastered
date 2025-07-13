import { io, Socket } from 'socket.io-client';
import MockSocketManager, { MockSocket } from './mock-socket';
import { toast } from 'sonner';

class SocketManager {
  private socket: Socket | MockSocket | null = null;
  private static instance: SocketManager;
  private isUsingMock: boolean = false;
  private connectionAttempts: number = 0;
  private maxRetries: number = 3;
  private connectionTimeout: number = 5000;

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  private getSocketUrl(): string {
    if (typeof window === 'undefined') {
      return 'http://localhost:3001';
    }

    const currentUrl = window.location;
    
    // Check for environment variable first
    if (process.env.NEXT_PUBLIC_SOCKET_URL) {
      return process.env.NEXT_PUBLIC_SOCKET_URL;
    }
    
    // WebContainer detection
    if (currentUrl.hostname.includes('webcontainer-api.io')) {
      const socketHostname = currentUrl.hostname.replace(/--3000--/, '--3001--');
      return `${currentUrl.protocol}//${socketHostname}`;
    }
    
    // Local development
    if (currentUrl.hostname === 'localhost' || currentUrl.hostname === '127.0.0.1') {
      return `${currentUrl.protocol}//localhost:3001`;
    }
    
    // Production fallback
    return `${currentUrl.protocol}//${currentUrl.hostname}:3001`;
  }

  async connect(): Promise<Socket | MockSocket> {
    if (this.socket && 'connected' in this.socket && this.socket.connected) {
      return this.socket;
    }

    this.connectionAttempts++;

    try {
      const socketUrl = this.getSocketUrl();
      console.log(`🔌 Attempting to connect to socket server (attempt ${this.connectionAttempts}/${this.maxRetries}):`, socketUrl);
      
      const realSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: this.connectionTimeout,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        autoConnect: true,
        upgrade: true,
        rememberUpgrade: false
      });

      const connectionResult = await Promise.race([
        new Promise<Socket>((resolve, reject) => {
          const connectHandler = () => {
            console.log('✅ Connected to real socket server');
            realSocket.off('connect', connectHandler);
            realSocket.off('connect_error', errorHandler);
            realSocket.off('disconnect', disconnectHandler);
            this.isUsingMock = false;
            this.connectionAttempts = 0;
            resolve(realSocket);
          };

          const errorHandler = (error: any) => {
            console.warn('❌ Socket connection error:', error);
            realSocket.off('connect', connectHandler);
            realSocket.off('connect_error', errorHandler);
            realSocket.off('disconnect', disconnectHandler);
            reject(error);
          };

          const disconnectHandler = (reason: string) => {
            console.warn('❌ Socket disconnected during connection:', reason);
            if (reason === 'io server disconnect' || reason === 'io client disconnect') {
              return;
            }
            realSocket.off('connect', connectHandler);
            realSocket.off('connect_error', errorHandler);
            realSocket.off('disconnect', disconnectHandler);
            reject(new Error(`Socket disconnected: ${reason}`));
          };

          realSocket.on('connect', connectHandler);
          realSocket.on('connect_error', errorHandler);
          realSocket.on('disconnect', disconnectHandler);
        }),
        new Promise<null>((_, reject) => {
          setTimeout(() => {
            realSocket.disconnect();
            reject(new Error('Socket connection timeout'));
          }, this.connectionTimeout);
        })
      ]);

      this.socket = connectionResult;
      
      if (typeof window !== 'undefined') {
        (window as any).__KARAOKE_SOCKET__ = this.socket;
      }

      return this.socket;

    } catch (error) {
      console.warn(`❌ Failed to connect to socket server (attempt ${this.connectionAttempts}/${this.maxRetries}):`, error);
      
      if (this.connectionAttempts < this.maxRetries) {
        console.log(`🔄 Retrying connection in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.connect();
      }

      console.log('🎭 All connection attempts failed, switching to demo mode');
      const mockSocketManager = MockSocketManager.getInstance();
      this.socket = mockSocketManager.createMockSocket();
      this.isUsingMock = true;
      this.connectionAttempts = 0;

      if (typeof window !== 'undefined') {
        (window as any).__KARAOKE_SOCKET__ = this.socket;
      }

      toast.info('🎭 Demo Mode Active', {
        description: 'Server unavailable. Using demo mode with simulated features.',
        duration: 4000,
      });

      return this.socket;
    }
  }

  disconnect(): void {
    if (this.socket) {
      if (this.isUsingMock) {
        const mockSocketManager = MockSocketManager.getInstance();
        mockSocketManager.disconnect();
      } else {
        (this.socket as Socket).disconnect();
      }
      this.socket = null;
      this.isUsingMock = false;
      this.connectionAttempts = 0;
      
      if (typeof window !== 'undefined') {
        delete (window as any).__KARAOKE_SOCKET__;
      }
    }
  }

  getSocket(): Socket | MockSocket | null {
    return this.socket;
  }

  isInDemoMode(): boolean {
    return this.isUsingMock;
  }

  isConnected(): boolean {
    if (!this.socket) return false;
    if (this.isUsingMock) return true;
    return (this.socket as Socket).connected;
  }
}

export default SocketManager;