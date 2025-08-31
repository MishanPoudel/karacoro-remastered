import { io, Socket } from 'socket.io-client';
import MockSocketManager, { MockSocket } from './mock-socket';
import { toast } from 'sonner';

class SocketManager {
  private socket: Socket | MockSocket | null = null;
  private static instance: SocketManager;
  private isUsingMock: boolean = false;

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
    
    if (process.env.NEXT_PUBLIC_SOCKET_URL) {
      return process.env.NEXT_PUBLIC_SOCKET_URL;
    }
    
    if (currentUrl.hostname.includes('webcontainer-api.io')) {
      const socketHostname = currentUrl.hostname.replace(/--3000--/, '--3001--');
      return `http://${socketHostname}`;
    }
    
    if (currentUrl.hostname === 'localhost' || currentUrl.hostname === '127.0.0.1') {
      return `http://localhost:3001`;
    }
    
    return `${currentUrl.protocol}//${currentUrl.hostname}:3001`;
  }

  async connect(): Promise<Socket | MockSocket> {
    if (this.socket) {
      return this.socket;
    }

    try {
      const socketUrl = this.getSocketUrl();
      console.log('Connecting to socket server:', socketUrl);
      
      const realSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        autoConnect: true,
        forceNew: false
      });

      const connectionResult = await Promise.race([
        new Promise<Socket>((resolve, reject) => {
          const connectHandler = () => {
            console.log('Connected to real socket server');
            realSocket.off('connect', connectHandler);
            realSocket.off('connect_error', errorHandler);
            this.isUsingMock = false;
            resolve(realSocket);
          };

          const errorHandler = (error: any) => {
            console.warn('Socket connection error:', error);
            realSocket.off('connect', connectHandler);
            realSocket.off('connect_error', errorHandler);
            reject(error);
          };

          realSocket.on('connect', connectHandler);
          realSocket.on('connect_error', errorHandler);
        }),
        new Promise<null>((_, reject) => {
          setTimeout(() => {
            realSocket.disconnect();
            reject(new Error('Socket connection timeout'));
          }, 5000);
        })
      ]);
      this.socket = connectionResult;
      return this.socket;

    } catch (error) {
      console.log('Switching to demo mode');
      const mockSocketManager = MockSocketManager.getInstance();
      this.socket = mockSocketManager.createMockSocket();
      this.isUsingMock = true;

      toast.info('🎭 Demo Mode Active', {
        description: 'Server unavailable. Using demo mode.',
        duration: 4000,
      });

      return this.socket;
    }
  }

  disconnect(): void {
    // Don't disconnect automatically
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