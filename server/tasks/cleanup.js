const cron = require('node-cron');
const { cleanupInactiveRooms, getRoomStats } = require('../utils/roomUtils');
const logger = require('../utils/logger');
const config = require('../config');

function initializeCleanupTasks(rooms) {
  // Cleanup inactive rooms every 30 minutes
  const cleanupInterval = `*/${config.rooms.cleanupIntervalMinutes} * * * *`;
  
  cron.schedule(cleanupInterval, () => {
    try {
      const cleanedUp = cleanupInactiveRooms(rooms, config.rooms.inactiveTimeoutMinutes);
      
      if (cleanedUp > 0) {
        logger.info('Cleanup task completed', { 
          roomsCleanedUp: cleanedUp,
          remainingRooms: rooms.size
        });
      }
      
      // Log room statistics
      const stats = getRoomStats(rooms);
      logger.debug('Room statistics', stats);
      
    } catch (error) {
      logger.error('Error in cleanup task', { error: error.message });
    }
  });

  // Log server statistics every hour
  cron.schedule('0 * * * *', () => {
    try {
      const stats = getRoomStats(rooms);
      const memoryUsage = process.memoryUsage();
      
      logger.info('Hourly server statistics', {
        ...stats,
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
        },
        uptime: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`
      });
      
    } catch (error) {
      logger.error('Error in statistics task', { error: error.message });
    }
  });

  logger.info('Cleanup tasks initialized', {
    cleanupInterval: `Every ${config.rooms.cleanupIntervalMinutes} minutes`,
    inactiveTimeout: `${config.rooms.inactiveTimeoutMinutes} minutes`
  });
}

module.exports = initializeCleanupTasks;