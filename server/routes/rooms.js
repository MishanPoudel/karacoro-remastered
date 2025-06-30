const express = require('express');
const { validateRoomCreation, validateRoomCheck } = require('../middleware/validation');
const { roomCreationLimiter } = require('../middleware/rateLimiter');
const { generateRoomId, validateRoomId } = require('../utils/roomUtils');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const config = require('../config');

const router = express.Router();

// In-memory storage for rooms (in production, use a database)
const rooms = new Map();

/**
 * POST /api/rooms
 * Create a new room
 */
router.post('/', roomCreationLimiter, validateRoomCreation, async (req, res, next) => {
  try {
    const { roomId: customRoomId, name } = req.body;
    
    // Check if we've reached the maximum number of rooms
    if (rooms.size >= config.rooms.maxRooms) {
      return next(new AppError('Maximum number of rooms reached. Please try again later.', 503));
    }
    
    // Generate or use custom room ID
    let roomId = customRoomId;
    
    if (!roomId) {
      // Generate a unique room ID
      do {
        roomId = generateRoomId();
      } while (rooms.has(roomId));
    } else {
      // Validate custom room ID
      if (!validateRoomId(roomId)) {
        return next(new AppError('Room ID must be 6 uppercase alphanumeric characters', 400));
      }
      
      // Check if custom room ID already exists
      if (rooms.has(roomId)) {
        return next(new AppError('Room ID already exists. Please choose a different ID.', 409));
      }
    }
    
    // Create room entry
    const room = {
      roomId,
      name: name.trim(),
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: false, // Will be set to true when first user joins
      userCount: 0
    };
    
    rooms.set(roomId, room);
    
    logger.info('Room created', { roomId, name, ip: req.ip });
    
    res.status(201).json({
      success: true,
      data: {
        roomId: room.roomId,
        name: room.name,
        createdAt: room.createdAt
      }
    });
    
  } catch (error) {
    logger.error('Error creating room', { error: error.message, ip: req.ip });
    next(error);
  }
});

/**
 * GET /api/rooms/check
 * Check if a room exists
 */
router.get('/check', validateRoomCheck, async (req, res, next) => {
  try {
    const { roomId } = req.query;
    
    const room = rooms.get(roomId);
    const exists = !!room;
    
    logger.debug('Room check', { roomId, exists, ip: req.ip });
    
    res.json({
      success: true,
      data: {
        exists,
        room: exists ? {
          roomId: room.roomId,
          name: room.name,
          createdAt: room.createdAt,
          isActive: room.isActive,
          userCount: room.userCount
        } : null
      }
    });
    
  } catch (error) {
    logger.error('Error checking room', { error: error.message, ip: req.ip });
    next(error);
  }
});

/**
 * GET /api/rooms
 * Get all rooms (for debugging/admin purposes)
 */
router.get('/', async (req, res, next) => {
  try {
    // Only allow in development mode
    if (!config.isDevelopment) {
      return next(new AppError('This endpoint is only available in development mode', 403));
    }
    
    const allRooms = Array.from(rooms.values()).map(room => ({
      roomId: room.roomId,
      name: room.name,
      createdAt: room.createdAt,
      isActive: room.isActive,
      userCount: room.userCount,
      lastActivity: room.lastActivity
    }));
    
    res.json({
      success: true,
      data: {
        rooms: allRooms,
        total: allRooms.length
      }
    });
    
  } catch (error) {
    logger.error('Error fetching rooms', { error: error.message, ip: req.ip });
    next(error);
  }
});

/**
 * DELETE /api/rooms/:roomId
 * Delete a room (for admin purposes)
 */
router.delete('/:roomId', async (req, res, next) => {
  try {
    // Only allow in development mode
    if (!config.isDevelopment) {
      return next(new AppError('This endpoint is only available in development mode', 403));
    }
    
    const { roomId } = req.params;
    
    if (!validateRoomId(roomId)) {
      return next(new AppError('Invalid room ID format', 400));
    }
    
    const deleted = rooms.delete(roomId);
    
    if (!deleted) {
      return next(new AppError('Room not found', 404));
    }
    
    logger.info('Room deleted', { roomId, ip: req.ip });
    
    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
    
  } catch (error) {
    logger.error('Error deleting room', { error: error.message, ip: req.ip });
    next(error);
  }
});

/**
 * GET /api/rooms/stats
 * Get room statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = {
      totalRooms: rooms.size,
      activeRooms: Array.from(rooms.values()).filter(room => room.isActive).length,
      totalUsers: Array.from(rooms.values()).reduce((sum, room) => sum + room.userCount, 0)
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    logger.error('Error fetching room stats', { error: error.message, ip: req.ip });
    next(error);
  }
});

// Export both router and rooms map for use in socket handlers
module.exports = { router, rooms };