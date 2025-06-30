const logger = require('../utils/logger');
const { updateRoomActivity } = require('../utils/roomUtils');

class VoiceHandlers {
  constructor(io, rooms, users) {
    this.io = io;
    this.rooms = rooms;
    this.users = users;
    this.voiceRooms = new Map(); // Track voice-specific room data
  }

  // Voice chat join
  handleVoiceJoin(socket, { roomId, userId }) {
    try {
      const user = this.users.get(socket.id);
      if (!user || user.roomId !== roomId) {
        socket.emit('error', { message: 'Must be in room to join voice chat' });
        return;
      }

      const room = this.rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Initialize voice room if it doesn't exist
      if (!this.voiceRooms.has(roomId)) {
        this.voiceRooms.set(roomId, {
          participants: new Map(),
          connections: new Map()
        });
      }

      const voiceRoom = this.voiceRooms.get(roomId);

      // Check if user is already in voice chat
      if (voiceRoom.participants.has(socket.id)) {
        logger.warn('User already in voice chat', { username: user.username, roomId });
        return;
      }

      // Add voice info to user
      user.voiceConnected = true;
      user.isMuted = true; // Start muted
      user.lastActivity = new Date();
      this.users.set(socket.id, user);

      // Add to voice room participants
      voiceRoom.participants.set(socket.id, {
        userId: user.username,
        socketId: socket.id,
        isMuted: true,
        isSpeaking: false,
        connectionQuality: 'good'
      });

      updateRoomActivity(roomId, this.rooms);

      // Get list of existing voice participants (excluding the new user)
      const existingParticipants = Array.from(voiceRoom.participants.values())
        .filter(p => p.socketId !== socket.id);

      // Notify existing voice participants about new user
      if (existingParticipants.length > 0) {
        socket.to(roomId).emit('voice_user_joined', {
          userId: user.username
        });

        // Send existing participants list to new user
        existingParticipants.forEach(participant => {
          socket.emit('voice_user_joined', {
            userId: participant.userId
          });
        });
      }

      logger.info('User joined voice chat', { 
        username: user.username, 
        roomId, 
        socketId: socket.id,
        totalVoiceParticipants: voiceRoom.participants.size
      });
    } catch (error) {
      logger.error('Error handling voice join', { error: error.message, socketId: socket.id });
      socket.emit('error', { message: 'Failed to join voice chat' });
    }
  }

  // Voice offer (WebRTC signaling)
  handleVoiceOffer(socket, { targetUserId, offer }) {
    try {
      const user = this.users.get(socket.id);
      if (!user) return;

      // Find target user by username in the same room
      const targetUser = Array.from(this.users.values()).find(u => 
        u.username === targetUserId && u.roomId === user.roomId && u.voiceConnected
      );
      
      if (!targetUser) {
        logger.warn('Target user not found for voice offer', { 
          from: user.username, 
          to: targetUserId, 
          roomId: user.roomId 
        });
        return;
      }

      // Forward offer to target user
      this.io.to(targetUser.socketId).emit('voice_offer', {
        offer,
        userId: user.username
      });

      logger.debug('Voice offer forwarded', { 
        from: user.username, 
        to: targetUserId, 
        roomId: user.roomId
      });
    } catch (error) {
      logger.error('Error handling voice offer', { error: error.message, socketId: socket.id });
    }
  }

  // Voice answer (WebRTC signaling)
  handleVoiceAnswer(socket, { targetUserId, answer }) {
    try {
      const user = this.users.get(socket.id);
      if (!user) return;

      // Find target user by username in the same room
      const targetUser = Array.from(this.users.values()).find(u => 
        u.username === targetUserId && u.roomId === user.roomId && u.voiceConnected
      );
      
      if (!targetUser) {
        logger.warn('Target user not found for voice answer', { 
          from: user.username, 
          to: targetUserId, 
          roomId: user.roomId 
        });
        return;
      }

      // Forward answer to target user
      this.io.to(targetUser.socketId).emit('voice_answer', {
        answer,
        userId: user.username
      });

      logger.debug('Voice answer forwarded', { 
        from: user.username, 
        to: targetUserId, 
        roomId: user.roomId
      });
    } catch (error) {
      logger.error('Error handling voice answer', { error: error.message, socketId: socket.id });
    }
  }

  // ICE candidate (WebRTC signaling)
  handleIceCandidate(socket, { targetUserId, candidate }) {
    try {
      const user = this.users.get(socket.id);
      if (!user) return;

      // Find target user by username in the same room
      const targetUser = Array.from(this.users.values()).find(u => 
        u.username === targetUserId && u.roomId === user.roomId && u.voiceConnected
      );
      
      if (!targetUser) return;

      // Forward ICE candidate to target user
      this.io.to(targetUser.socketId).emit('voice_ice_candidate', {
        candidate,
        userId: user.username
      });

      logger.debug('ICE candidate forwarded', { 
        from: user.username, 
        to: targetUserId, 
        roomId: user.roomId
      });
    } catch (error) {
      logger.error('Error handling ICE candidate', { error: error.message, socketId: socket.id });
    }
  }

  // Mute status update
  handleMuteStatus(socket, { roomId, userId, isMuted }) {
    try {
      const user = this.users.get(socket.id);
      if (!user || user.roomId !== roomId) return;

      user.isMuted = isMuted;
      user.lastActivity = new Date();
      this.users.set(socket.id, user);

      // Update voice room participant
      const voiceRoom = this.voiceRooms.get(roomId);
      if (voiceRoom) {
        const participant = voiceRoom.participants.get(socket.id);
        if (participant) {
          participant.isMuted = isMuted;
          participant.isSpeaking = false; // Stop speaking when muted
        }
      }

      updateRoomActivity(roomId, this.rooms);

      // Notify other users in the room
      socket.to(roomId).emit('voice_mute_status', {
        userId: user.username,
        isMuted
      });

      logger.debug('Voice mute status updated', { 
        username: user.username, 
        isMuted, 
        roomId, 
        socketId: socket.id 
      });
    } catch (error) {
      logger.error('Error handling mute status', { error: error.message, socketId: socket.id });
    }
  }

  // Voice activity detection
  handleVoiceActivity(socket, { roomId, userId, isSpeaking, volume }) {
    try {
      const user = this.users.get(socket.id);
      if (!user || user.roomId !== roomId || user.isMuted) return;

      // Update voice room participant
      const voiceRoom = this.voiceRooms.get(roomId);
      if (voiceRoom) {
        const participant = voiceRoom.participants.get(socket.id);
        if (participant) {
          participant.isSpeaking = isSpeaking && !participant.isMuted;
          participant.volume = volume;
        }
      }

      // Forward voice activity to other users in the room
      socket.to(roomId).emit('voice_activity', {
        userId: user.username,
        isSpeaking: isSpeaking && !user.isMuted,
        volume
      });

      logger.debug('Voice activity detected', { 
        username: user.username, 
        isSpeaking, 
        volume,
        roomId, 
        socketId: socket.id 
      });
    } catch (error) {
      logger.error('Error handling voice activity', { error: error.message, socketId: socket.id });
    }
  }

  // Connection quality update
  handleConnectionQuality(socket, { roomId, userId, quality }) {
    try {
      const user = this.users.get(socket.id);
      if (!user || user.roomId !== roomId) return;

      // Update voice room participant
      const voiceRoom = this.voiceRooms.get(roomId);
      if (voiceRoom) {
        const participant = voiceRoom.participants.get(socket.id);
        if (participant) {
          participant.connectionQuality = quality;
        }
      }

      // Notify other users about connection quality
      socket.to(roomId).emit('voice_connection_quality', {
        userId: user.username,
        quality
      });

      logger.debug('Voice connection quality updated', { 
        username: user.username, 
        quality, 
        roomId, 
        socketId: socket.id 
      });
    } catch (error) {
      logger.error('Error handling connection quality', { error: error.message, socketId: socket.id });
    }
  }

  // Reconnection request
  handleReconnectRequest(socket, { targetUserId }) {
    try {
      const user = this.users.get(socket.id);
      if (!user) return;

      // Find target user by username in the same room
      const targetUser = Array.from(this.users.values()).find(u => 
        u.username === targetUserId && u.roomId === user.roomId && u.voiceConnected
      );
      
      if (!targetUser) return;

      // Notify target user to reinitiate connection
      this.io.to(targetUser.socketId).emit('voice_reconnect_request', {
        userId: user.username
      });

      logger.info('Voice reconnection requested', { 
        from: user.username, 
        to: targetUserId, 
        roomId: user.roomId
      });
    } catch (error) {
      logger.error('Error handling reconnection request', { error: error.message, socketId: socket.id });
    }
  }

  // Voice chat leave
  handleVoiceLeave(socket, { roomId, userId }) {
    try {
      const user = this.users.get(socket.id);
      if (!user || user.roomId !== roomId) return;

      this.removeUserFromVoiceChat(socket, user, roomId);

      logger.info('User left voice chat', { 
        username: user.username, 
        roomId, 
        socketId: socket.id
      });
    } catch (error) {
      logger.error('Error handling voice leave', { error: error.message, socketId: socket.id });
    }
  }

  // Handle disconnect - cleanup voice connections
  handleVoiceDisconnect(socket) {
    try {
      const user = this.users.get(socket.id);
      if (!user || !user.voiceConnected) return;

      const roomId = user.roomId;
      this.removeUserFromVoiceChat(socket, user, roomId);

      logger.info('User disconnected from voice chat', { 
        username: user.username, 
        roomId, 
        socketId: socket.id
      });
    } catch (error) {
      logger.error('Error handling voice disconnect', { error: error.message, socketId: socket.id });
    }
  }

  // Helper method to remove user from voice chat
  removeUserFromVoiceChat(socket, user, roomId) {
    user.voiceConnected = false;
    user.lastActivity = new Date();
    this.users.set(socket.id, user);

    // Remove from voice room
    const voiceRoom = this.voiceRooms.get(roomId);
    if (voiceRoom) {
      voiceRoom.participants.delete(socket.id);
      
      // Clean up empty voice room
      if (voiceRoom.participants.size === 0) {
        this.voiceRooms.delete(roomId);
        logger.debug('Voice room cleaned up', { roomId });
      }
    }

    updateRoomActivity(roomId, this.rooms);

    // Notify other users in the room about voice disconnection
    socket.to(roomId).emit('voice_user_left', {
      userId: user.username
    });
  }

  // Get voice room statistics
  getVoiceRoomStats(roomId) {
    const voiceRoom = this.voiceRooms.get(roomId);
    if (!voiceRoom) return null;

    return {
      totalParticipants: voiceRoom.participants.size,
      mutedParticipants: Array.from(voiceRoom.participants.values()).filter(p => p.isMuted).length,
      speakingParticipants: Array.from(voiceRoom.participants.values()).filter(p => p.isSpeaking).length
    };
  }
}

module.exports = VoiceHandlers;