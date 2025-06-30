const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const config = {
  // Server Configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // CORS Configuration
  cors: {
    origin: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
      ? true // Allow all origins in development/test
      : process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:3000', 'https://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // Room Configuration
  rooms: {
    maxRooms: parseInt(process.env.MAX_ROOMS) || 1000,
    maxUsersPerRoom: parseInt(process.env.MAX_USERS_PER_ROOM) || 50,
    cleanupIntervalMinutes: parseInt(process.env.ROOM_CLEANUP_INTERVAL_MINUTES) || 30,
    inactiveTimeoutMinutes: parseInt(process.env.INACTIVE_ROOM_TIMEOUT_MINUTES) || 60,
    maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE) || 100,
    maxChatHistory: parseInt(process.env.MAX_CHAT_HISTORY) || 100
  },
  
  // YouTube API
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY || '',
    baseUrl: 'https://www.googleapis.com/youtube/v3'
  },
  
  // Socket.io Configuration
  socket: {
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000,
    maxHttpBufferSize: 1e6, // 1MB
    allowEIO3: true
  },
  
  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
  },
  
  // Feature Flags
  features: {
    voiceChat: process.env.ENABLE_VOICE_CHAT === 'true',
    roomPersistence: process.env.ENABLE_ROOM_PERSISTENCE === 'true',
    userAnalytics: process.env.ENABLE_USER_ANALYTICS === 'true',
    rateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false'
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/server.log'
  },
  
  // Development flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production'
};

module.exports = config;