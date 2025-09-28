/**
 * Mock Socket.io client for testing
 */

export class MockSocket {
  private events: { [key: string]: Function[] } = {};
  private connected = false;

  emit(event: string, ...args: any[]) {
    console.log(`MockSocket: Emitting ${event}`, args);
    return this;
  }

  on(event: string, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return this;
  }

  off(event: string, callback?: Function) {
    if (!this.events[event]) return this;
    
    if (callback) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    } else {
      delete this.events[event];
    }
    return this;
  }

  connect() {
    this.connected = true;
    this.triggerEvent('connect');
    return this;
  }

  disconnect() {
    this.connected = false;
    this.triggerEvent('disconnect');
    return this;
  }

  private triggerEvent(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(...args));
    }
  }

  // Mock method to simulate server events
  mockServerEvent(event: string, ...args: any[]) {
    this.triggerEvent(event, ...args);
  }

  get isConnected() {
    return this.connected;
  }
}

export const createMockSocket = () => new MockSocket();