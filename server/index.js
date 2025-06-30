const express = require('express');
const { createServer } = require('http');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// Import configuration and utilities
const config = require('./config');
const logger = require('./utils/logger');
const corsMiddleware = require('./middleware/cors');
const { generalLimiter, apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const { router: roomsRouter, rooms } = require('./routes/rooms');
const healthRouter = require('./routes/health');

// Import socket and tasks
const initializeSocket = require('./socket');
const initializeCleanupTasks = require('./tasks/cleanup');

// Create Express app
const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS middleware
app.use(corsMiddleware);

// Compression middleware
app.use(compression());

// Request logging
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (if enabled)
if (config.features.rateLimiting) {
  app.use(generalLimiter);
  app.use('/api', apiLimiter);
}

// Custom request logger
app.use(logger.requestLogger());

// Health check routes (no rate limiting)
app.use('/api/health', healthRouter);

// API routes
app.use('/api/rooms', roomsRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Karaoke Party Server',
    version: '1.0.0',
    status: 'running',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    features: {
      voiceChat: config.features.voiceChat,
      rateLimiting: config.features.rateLimiting
    }
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Karaoke Party API',
    version: '1.0.0',
    endpoints: {
      rooms: {
        'POST /api/rooms': 'Create a new room',
        'GET /api/rooms/check': 'Check if room exists',
        'GET /api/rooms/stats': 'Get room statistics'
      },
      health: {
        'GET /api/health': 'Basic health check',
        'GET /api/health/detailed': 'Detailed health information'
      }
    },
    websocket: {
      endpoint: '/socket.io',
      events: [
        'join_room',
        'chat_message',
        'add_to_queue',
        'video_state_change',
        'skip_video',
        'video_ended'
      ]
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Initialize Socket.io
const { io, users } = initializeSocket(server, rooms);

// Initialize cleanup tasks
initializeCleanupTasks(rooms);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Unhandled promise rejection handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  // Don't exit the process in production
  if (config.isDevelopment) {
    process.exit(1);
  }
});

// Uncaught exception handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  // Exit the process as the application is in an undefined state
  process.exit(1);
});

// Start server
const PORT = config.port;
server.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: config.nodeEnv,
    cors: config.cors.origin,
    features: config.features,
    limits: {
      maxRooms: config.rooms.maxRooms,
      maxUsersPerRoom: config.rooms.maxUsersPerRoom,
      maxQueueSize: config.rooms.maxQueueSize
    }
  });
  
  if (config.isDevelopment) {
    console.log(`
🎤 Karaoke Party Server is running!
🌐 Server: http://localhost:${PORT}
📊 Health: http://localhost:${PORT}/api/health
📚 API Docs: http://localhost:${PORT}/api
🔧 Environment: ${config.nodeEnv}
    `);
  }
});

// Export for testing
module.exports = { app, server, io };