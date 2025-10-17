/**
 * Shared room storage for password-protected rooms
 * This is used by both Next.js API routes and can be exported for Socket.io server
 */

interface RoomMetadata {
  roomId: string;
  name: string;
  password?: string;
  hasPassword: boolean;
  createdAt: Date;
}

// In-memory storage (would be Redis in production)
const roomsStore = new Map<string, RoomMetadata>();

export const roomStorage = {
  // Create a new room
  createRoom(roomId: string, name: string, password?: string): RoomMetadata {
    const room: RoomMetadata = {
      roomId,
      name: name.trim(),
      password: password?.trim() || undefined,
      hasPassword: Boolean(password?.trim()),
      createdAt: new Date(),
    };
    
    roomsStore.set(roomId, room);
    return room;
  },

  // Get room metadata
  getRoom(roomId: string): RoomMetadata | undefined {
    return roomsStore.get(roomId);
  },

  // Check if room exists
  hasRoom(roomId: string): boolean {
    return roomsStore.has(roomId);
  },

  // Verify room password
  verifyPassword(roomId: string, password: string): boolean {
    const room = roomsStore.get(roomId);
    if (!room) return false;
    if (!room.hasPassword) return true; // Public room
    return room.password === password;
  },

  // Get room without sensitive data
  getSafeRoom(roomId: string): Omit<RoomMetadata, 'password'> | undefined {
    const room = roomsStore.get(roomId);
    if (!room) return undefined;
    
    const { password, ...safeRoom } = room;
    return safeRoom;
  },

  // Delete a room
  deleteRoom(roomId: string): boolean {
    return roomsStore.delete(roomId);
  },

  // Get all rooms (for debugging)
  getAllRooms(): RoomMetadata[] {
    return Array.from(roomsStore.values());
  },

  // Clear all rooms (for testing)
  clear(): void {
    roomsStore.clear();
  },
};
