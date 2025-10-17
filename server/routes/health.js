const express = require('express');
const config = require('../config');
const { getRoomStats } = require('../utils/roomUtils');

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(uptime),
      human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
    },
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
    },
    environment: config.nodeEnv,
    version: process.version,
    platform: process.platform
  });
});

/**
 * GET /api/health/detailed
 * Detailed health check with room statistics
 */
router.get('/detailed', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  // Get room statistics (this would need to be passed from the main app)
  // For now, we'll return basic info
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: {
      uptime: {
        seconds: Math.floor(uptime),
        human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
        arrayBuffers: `${Math.round(memoryUsage.arrayBuffers / 1024 / 1024)}MB`
      },
      cpu: {
        usage: process.cpuUsage()
      },
      environment: config.nodeEnv,
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid
    },
    features: {
      voiceChat: config.features.voiceChat,
      roomPersistence: config.features.roomPersistence,
      userAnalytics: config.features.userAnalytics,
      rateLimiting: config.features.rateLimiting
    },
    limits: {
      maxRooms: config.rooms.maxRooms,
      maxUsersPerRoom: config.rooms.maxUsersPerRoom,
      maxQueueSize: config.rooms.maxQueueSize,
      maxChatHistory: config.rooms.maxChatHistory
    }
  });
});

module.exports = router;