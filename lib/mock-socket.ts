export class MockSocket {
  connected: boolean = true;
  on(event: string, handler: (...args: any[]) => void) {}
  off(event: string, handler: (...args: any[]) => void) {}
  disconnect() {}
}

class MockSocketManager {
  private static instance: MockSocketManager;

  private constructor() {}

  static getInstance(): MockSocketManager {
    if (!MockSocketManager.instance) {
      MockSocketManager.instance = new MockSocketManager();
    }
    return MockSocketManager.instance;
  }

  createMockSocket(): MockSocket {
    return new MockSocket();
  }
}

export default MockSocketManager;