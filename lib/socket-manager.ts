/**
 * Socket Manager for handling Socket.IO connections
 */

import { io, Socket } from 'socket.io-client';
import { envLog } from './config';

export class SocketManager {
  private socket: Socket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;

  constructor(url: string = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001') {
    this.url = url;
  }

  connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      try {
        this.socket = io(this.url, {
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true,
        });

        this.socket.on('connect', () => {
          envLog.info('Socket connected');
          this.reconnectAttempts = 0;
          resolve(this.socket!);
        });

        this.socket.on('connect_error', (error) => {
          envLog.error('Socket connection error:', error);
          this.handleReconnect();
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          envLog.info('Socket disconnected:', reason);
          if (reason === 'io server disconnect') {
            // Server initiated disconnect, reconnect manually
            this.handleReconnect();
          }
        });

      } catch (error) {
        envLog.error('Failed to create socket connection:', error);
        reject(error);
      }
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      envLog.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect().catch(error => {
          envLog.error('Reconnection failed:', error);
        });
      }, this.reconnectInterval * this.reconnectAttempts);
    } else {
      envLog.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      envLog.info('Socket disconnected manually');
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  emit(event: string, ...args: any[]) {
    if (this.socket?.connected) {
      this.socket.emit(event, ...args);
    } else {
      envLog.warn('Cannot emit: Socket not connected');
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

// Singleton instance
export const socketManager = new SocketManager();