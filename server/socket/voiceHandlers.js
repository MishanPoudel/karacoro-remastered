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
  console.log('[VOICE DEBUG] handleVoiceJoin', { roomId, userId, socketId: socket.id });
    try {
      const user = this.users.get(socket.id);
      if (!user || user.roomId !== roomId) {
        socket.emit('error', { message: 'Must be in room to join voice chat' });
        return;
      }

      // Debug logging
      logger.info('Voice join attempt', {
        socketId: socket.id,
        clientUserId: userId,
        userObjectUserId: user.userId,
        username: user.username,
        roomId
      });

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
        userId: userId, // Use the actual userId passed from client
        username: user.username,
        socketId: socket.id,
        isMuted: true,
        isSpeaking: false,
        connectionQuality: 'good'
      });

      updateRoomActivity(roomId, this.rooms);


      // Get list of existing voice participants (excluding the new user)
      const existingParticipants = Array.from(voiceRoom.participants.values())
        .filter(p => p.socketId !== socket.id);
      console.log('[VOICE DEBUG] Existing participants before join', { roomId, userId, existingParticipants });

      // Create participant data for client
      const participantData = Array.from(voiceRoom.participants.values()).map(p => ({
        id: p.userId,
        username: p.username,
        isMuted: p.isMuted,
        isSpeaking: p.isSpeaking,
        connectionQuality: p.connectionQuality
      }));
      console.log('[VOICE DEBUG] All participants after join', { roomId, userId, participantData });

      // Notify all users in the room about updated participant list
      this.io.to(roomId).emit('voice_user_joined', {
        userId: userId,
        username: user.username,
        participants: participantData
      });

      logger.info('User joined voice chat', { 
        username: user.username, 
        userId,
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
  const user = this.users.get(socket.id);
  console.log('[VOICE DEBUG] handleVoiceOffer', { roomId: user?.roomId, fromUserId: user?.userId, targetUserId });
    try {
      const user = this.users.get(socket.id);
      if (!user) return;

      // Find target user by userId in the same room's voice participants
      const voiceRoom = this.voiceRooms.get(user.roomId);
      if (!voiceRoom) return;

      // Debug logging
      logger.debug('Voice offer attempt', {
        fromUserId: user.userId,
        targetUserId,
        voiceRoomParticipants: Array.from(voiceRoom.participants.values()).map(p => ({
          userId: p.userId,
          socketId: p.socketId,
          username: p.username
        }))
      });

      // Find the target participant in voice room
      const targetParticipant = Array.from(voiceRoom.participants.values()).find(p => 
        String(p.userId) === String(targetUserId)
      );
      
      if (!targetParticipant) {
        logger.warn('Target user not found in voice chat', { 
          targetUserId, 
          roomId: user.roomId,
          availableParticipants: Array.from(voiceRoom.participants.values()).map(p => p.userId)
        });
        return;
      }

      // Send offer to target user - use userId consistently
      socket.to(targetParticipant.socketId).emit('voice_offer', {
        fromUserId: user.userId,
        offer
      });

      logger.debug('Voice offer forwarded', { 
        from: user.username, 
        fromUserId: user.userId,
        to: targetUserId, 
        roomId: user.roomId
      });
    } catch (error) {
      logger.error('Error handling voice offer', { error: error.message, socketId: socket.id });
    }
  }

  // Voice answer (WebRTC signaling)
  handleVoiceAnswer(socket, { targetUserId, answer }) {
  const user = this.users.get(socket.id);
  console.log('[VOICE DEBUG] handleVoiceAnswer', { roomId: user?.roomId, fromUserId: user?.userId, targetUserId });
    try {
      const user = this.users.get(socket.id);
      if (!user) return;

      // Find target user by userId in the same room's voice participants
      const voiceRoom = this.voiceRooms.get(user.roomId);
      if (!voiceRoom) return;

      // Find the target participant in voice room
      const targetParticipant = Array.from(voiceRoom.participants.values()).find(p => 
        String(p.userId) === String(targetUserId)
      );
      
      if (!targetParticipant) {
        logger.warn('Target user not found for voice answer', { 
          from: user.username, 
          to: targetUserId, 
          roomId: user.roomId,
          availableParticipants: Array.from(voiceRoom.participants.values()).map(p => p.userId)
        });
        return;
      }

      // Forward answer to target user - use userId consistently
      this.io.to(targetParticipant.socketId).emit('voice_answer', {
        fromUserId: user.userId,
        answer
      });

      logger.debug('Voice answer forwarded', { 
        from: user.username, 
        fromUserId: user.userId,
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

      // Find target user by userId in the same room's voice participants
      const voiceRoom = this.voiceRooms.get(user.roomId);
      if (!voiceRoom) return;

      // Find the target participant in voice room
      const targetParticipant = Array.from(voiceRoom.participants.values()).find(p => 
        String(p.userId) === String(targetUserId)
      );
      
      if (!targetParticipant) return;

      // Forward ICE candidate to target user
      this.io.to(targetParticipant.socketId).emit('voice_ice_candidate', {
        fromUserId: user.userId,
        candidate
      });

      logger.debug('ICE candidate forwarded', { 
        from: user.username, 
        fromUserId: user.userId,
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

      // Notify other users in the room - use userId consistently
      socket.to(roomId).emit('voice_mute_status', {
        userId: user.userId,
        isMuted
      });

      logger.debug('Voice mute status updated', { 
        username: user.username, 
        userId: user.userId,
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

      // Forward voice activity to other users in the room - use userId consistently
      socket.to(roomId).emit('voice_activity', {
        userId: user.userId,
        isSpeaking: isSpeaking && !user.isMuted,
        volume
      });

      logger.debug('Voice activity detected', { 
        username: user.username, 
        userId: user.userId,
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

      // Notify other users about connection quality - use userId consistently
      socket.to(roomId).emit('voice_connection_quality', {
        userId: user.userId,
        quality
      });

      logger.debug('Voice connection quality updated', { 
        username: user.username, 
        userId: user.userId,
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

      // Find target user by userId in the same room's voice participants
      const voiceRoom = this.voiceRooms.get(user.roomId);
      if (!voiceRoom) return;

      // Find the target participant in voice room
      const targetParticipant = Array.from(voiceRoom.participants.values()).find(p => 
        String(p.userId) === String(targetUserId)
      );
      
      if (!targetParticipant) return;

      // Notify target user to reinitiate connection - use userId consistently
      this.io.to(targetParticipant.socketId).emit('voice_reconnect_request', {
        userId: user.userId
      });

      logger.info('Voice reconnection requested', { 
        from: user.username, 
        fromUserId: user.userId,
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
        userId: user.userId,
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
        userId: user.userId,
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
      
      // Create updated participant data for remaining users
      const participantData = Array.from(voiceRoom.participants.values()).map(p => ({
        id: p.userId,
        username: p.username,
        isMuted: p.isMuted,
        isSpeaking: p.isSpeaking,
        connectionQuality: p.connectionQuality
      }));
      
      // Notify other users in the room about user leaving with updated list
      socket.to(roomId).emit('voice_user_left', {
        userId: user.userId,
        participants: participantData
      });
      
      // Clean up empty voice room
      if (voiceRoom.participants.size === 0) {
        this.voiceRooms.delete(roomId);
        logger.debug('Voice room cleaned up', { roomId });
      }
    }
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