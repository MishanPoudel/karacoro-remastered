const config = require('../config');

/**
 * Generates a random uppercase alphanumeric room ID
 * @param {number} length - Length of the room ID (default: 6)
 * @returns {string} Random uppercase alphanumeric string
 */
const generateRoomId = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

/**
 * Validates room ID format (uppercase alphanumeric, 6 characters)
 * @param {string} roomId - Room ID to validate
 * @returns {boolean} Boolean indicating if room ID is valid
 */
const validateRoomId = (roomId) => {
  const roomIdRegex = /^[A-Z0-9]{6}$/;
  return roomIdRegex.test(roomId);
};

/**
 * Validates username format and length
 * @param {string} username - Username to validate
 * @returns {boolean} Boolean indicating if username is valid
 */
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  return trimmed.length >= 2 && trimmed.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
};

/**
 * Checks if username is available in a room
 * @param {string} username - Username to check
 * @param {string} roomId - Room ID to check in
 * @param {Map} rooms - Rooms map
 * @param {string} excludeSocketId - Socket ID to exclude from check
 * @returns {boolean} Boolean indicating if username is available
 */
const isUsernameAvailable = (username, roomId, rooms, excludeSocketId = null) => {
  const room = rooms.get(roomId);
  if (!room) return true;
  
  for (const [socketId, user] of room.users) {
    if (socketId !== excludeSocketId && user.username.toLowerCase() === username.toLowerCase()) {
      return false;
    }
  }
  return true;
};

/**
 * Extracts video ID from YouTube URL
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null if invalid
 */
const extractVideoId = (url) => {
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
};

/**
 * Validates YouTube URL
 * @param {string} url - URL to validate
 * @returns {boolean} Boolean indicating if URL is valid YouTube URL
 */
const isValidYouTubeUrl = (url) => {
  return extractVideoId(url) !== null;
};

/**
 * Creates a new room object
 * @param {string} roomId - Room ID
 * @param {string} hostId - Host socket ID
 * @returns {object} Room object
 */
const createRoom = (roomId, hostId) => ({
  id: roomId,
  hostId,
  users: new Map(),
  queue: [],
  playedVideos: new Set(),
  currentVideo: null,
  videoState: {
    isPlaying: false,
    currentTime: 0,
    lastUpdate: Date.now()
  },
  chatHistory: [],
  createdAt: new Date(),
  lastActivity: new Date(),
  settings: {
    maxUsers: config.rooms.maxUsersPerRoom,
    maxQueueSize: config.rooms.maxQueueSize,
    allowDuplicates: false,
    requireHostApproval: false
  }
});

/**
 * Creates a new user object
 * @param {string} socketId - Socket ID
 * @param {string} username - Username
 * @param {string} roomId - Room ID
 * @param {boolean} isHost - Whether user is host
 * @param {string} userId - User ID for voice chat
 * @returns {object} User object
 */
const createUser = (socketId, username, roomId, isHost = false, userId = null) => ({
  socketId,
  username: username.trim(),
  roomId,
  isHost,
  userId: userId || socketId, // Use provided userId or fallback to socketId
  joinedAt: new Date(),
  lastActivity: new Date(),
  voiceConnected: false,
  voiceRegion: null,
  isMuted: true,
  permissions: {
    canAddVideos: true,
    canChat: true,
    canSkipVote: true
  }
});

/**
 * Transfers host to another user in the room
 * @param {string} roomId - Room ID
 * @param {Map} rooms - Rooms map
 * @param {Map} users - Users map
 * @returns {object|null} New host user object or null
 */
const transferHost = (roomId, rooms, users) => {
  const room = rooms.get(roomId);
  if (!room || room.users.size === 0) return null;
  
  // Find the user who joined earliest (excluding current host)
  let newHost = null;
  let earliestJoinTime = null;
  
  for (const [socketId, user] of room.users) {
    if (!user.isHost && (!earliestJoinTime || user.joinedAt < earliestJoinTime)) {
      newHost = { socketId, user };
      earliestJoinTime = user.joinedAt;
    }
  }
  
  if (newHost) {
    // Update host status
    room.hostId = newHost.socketId;
    newHost.user.isHost = true;
    
    // Update user in global users map
    users.set(newHost.socketId, newHost.user);
    
    return newHost.user;
  }
  
  return null;
};

/**
 * Cleans up inactive rooms
 * @param {Map} rooms - Rooms map
 * @param {number} timeoutMinutes - Timeout in minutes
 * @returns {number} Number of rooms cleaned up
 */
const cleanupInactiveRooms = (rooms, timeoutMinutes = config.rooms.inactiveTimeoutMinutes) => {
  const now = new Date();
  const timeout = timeoutMinutes * 60 * 1000; // Convert to milliseconds
  let cleanedUp = 0;
  
  for (const [roomId, room] of rooms) {
    const timeSinceLastActivity = now - room.lastActivity;
    
    if (timeSinceLastActivity > timeout || room.users.size === 0) {
      rooms.delete(roomId);
      cleanedUp++;
      console.log(`Cleaned up inactive room: ${roomId}`);
    }
  }
  
  return cleanedUp;
};

/**
 * Updates room activity timestamp
 * @param {string} roomId - Room ID
 * @param {Map} rooms - Rooms map
 */
const updateRoomActivity = (roomId, rooms) => {
  const room = rooms.get(roomId);
  if (room) {
    room.lastActivity = new Date();
  }
};

/**
 * Gets room statistics
 * @param {Map} rooms - Rooms map
 * @returns {object} Room statistics
 */
const getRoomStats = (rooms) => {
  let totalUsers = 0;
  let activeRooms = 0;
  
  for (const room of rooms.values()) {
    if (room.users.size > 0) {
      activeRooms++;
      totalUsers += room.users.size;
    }
  }
  
  return {
    totalRooms: rooms.size,
    activeRooms,
    totalUsers,
    averageUsersPerRoom: activeRooms > 0 ? (totalUsers / activeRooms).toFixed(2) : 0
  };
};

module.exports = {
  generateRoomId,
  validateRoomId,
  validateUsername,
  isUsernameAvailable,
  extractVideoId,
  isValidYouTubeUrl,
  createRoom,
  createUser,
  transferHost,
  cleanupInactiveRooms,
  updateRoomActivity,
  getRoomStats
};