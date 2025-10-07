const logger = require('../utils/logger');
const { updateRoomActivity } = require('../utils/roomUtils');

class VoiceHandlers {
  constructor(io, rooms, users) {
    this.io = io;
    this.rooms = rooms;
    this.users = users;
    this.voiceRooms = new Map();
  }

  handleVoiceOffer(socket, { roomId, targetUserId, offer }) {
    const targetUser = Array.from(this.users.values()).find(u => u.userId === targetUserId);
    if (targetUser) {
      this.io.to(targetUser.socketId).emit('voice_offer', {
        fromUserId: this.users.get(socket.id)?.userId,
        offer,
      });
    }
  }

  handleVoiceAnswer(socket, { roomId, targetUserId, answer }) {
    const targetUser = Array.from(this.users.values()).find(u => u.userId === targetUserId);
    if (targetUser) {
      this.io.to(targetUser.socketId).emit('voice_answer', {
        fromUserId: this.users.get(socket.id)?.userId,
        answer,
      });
    }
  }

  handleVoiceIceCandidate(socket, { roomId, targetUserId, candidate }) {
    const targetUser = Array.from(this.users.values()).find(u => u.userId === targetUserId);
    if (targetUser) {
      this.io.to(targetUser.socketId).emit('voice_ice_candidate', {
        fromUserId: this.users.get(socket.id)?.userId,
        candidate,
      });
    }
  }

  // Voice chat join
  handleVoiceJoin(socket, { roomId, userId }) {
    console.log('\n=== VOICE JOIN HANDLER START ===');
    console.log('[VOICE DEBUG] handleVoiceJoin called with:', { roomId, clientUserId: userId, socketId: socket.id });
    console.log('[VOICE DEBUG] Total users in memory:', this.users.size);
    console.log('[VOICE DEBUG] All users:', Array.from(this.users.entries()).map(([sid, u]) => ({ sid, userId: u.userId, username: u.username, roomId: u.roomId })));
    
    try {
      const user = this.users.get(socket.id);
      console.log('[VOICE DEBUG] Found user for socket:', user ? { username: user.username, userId: user.userId, roomId: user.roomId } : 'NOT FOUND');
      
      if (!user) {
        console.error('[VOICE DEBUG] ERROR: User not found for socket.id:', socket.id);
        socket.emit('error', { message: 'User not found. Please rejoin the room.' });
        return;
      }
      
      if (user.roomId !== roomId) {
        console.error('[VOICE DEBUG] ERROR: Room mismatch. User room:', user.roomId, 'Request room:', roomId);
        socket.emit('error', { message: 'Room ID mismatch. Please rejoin the room.' });
        return;
      }

      // Use the user's stored userId, not the client-provided one
      const actualUserId = user.userId;

      // Debug logging
      logger.info('Voice join attempt', {
        socketId: socket.id,
        clientUserId: userId,
        actualUserId: actualUserId,
        username: user.username,
        roomId
      });

      const room = this.rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Initialize voice room if it doesn't exist
      console.log('[VOICE DEBUG] Voice rooms before init:', this.voiceRooms.size);
      if (!this.voiceRooms.has(roomId)) {
        console.log('[VOICE DEBUG] Creating new voice room for:', roomId);
        this.voiceRooms.set(roomId, {
          participants: new Map(),
          connections: new Map()
        });
      }

      const voiceRoom = this.voiceRooms.get(roomId);
      console.log('[VOICE DEBUG] Voice room participants before join:', voiceRoom.participants.size);

      // Check if user is already in voice chat - use actualUserId
      if (voiceRoom.participants.has(actualUserId)) {
        logger.warn('User already in voice chat', { username: user.username, roomId });
        // Send current participants list anyway
        const participantData = Array.from(voiceRoom.participants.values()).map(p => ({
          id: p.userId,
          username: p.username,
          isMuted: p.isMuted,
          isSpeaking: p.isSpeaking,
          connectionQuality: p.connectionQuality
        }));
        socket.emit('voice_user_joined', {
          userId: actualUserId,
          username: user.username,
          participants: participantData
        });
        return;
      }

      // Add voice info to user
      user.voiceConnected = true;
      user.isMuted = true; // Start muted
      user.lastActivity = new Date();
      this.users.set(socket.id, user);

      // Add to voice room participants - key by actualUserId for consistent lookups
      voiceRoom.participants.set(actualUserId, {
        userId: actualUserId,
        username: user.username,
        socketId: socket.id,
        isMuted: true,
        isSpeaking: false,
        connectionQuality: 'good'
      });

      updateRoomActivity(roomId, this.rooms);

      // Get list of existing voice participants (excluding the new user)
      const existingParticipants = Array.from(voiceRoom.participants.values())
        .filter(p => p.userId !== actualUserId);
      console.log('[VOICE DEBUG] Existing participants before join', { roomId, actualUserId, existingParticipants });

      // Create participant data for client
      const participantData = Array.from(voiceRoom.participants.values()).map(p => ({
        id: p.userId,
        username: p.username,
        isMuted: p.isMuted,
        isSpeaking: p.isSpeaking,
        connectionQuality: p.connectionQuality
      }));
      console.log('[VOICE DEBUG] All participants after join', { roomId, actualUserId, participantData });

      // Notify all users in the room about updated participant list
      console.log('[VOICE DEBUG] Emitting voice_user_joined to room:', roomId);
      console.log('[VOICE DEBUG] Event data:', { userId: actualUserId, username: user.username, participantsCount: participantData.length });
      console.log('[VOICE DEBUG] Full participants array:', participantData);
      
      this.io.to(roomId).emit('voice_user_joined', {
        userId: actualUserId,
        username: user.username,
        participants: participantData
      });
      
      console.log('[VOICE DEBUG] voice_user_joined emitted successfully');
      console.log('=== VOICE JOIN HANDLER END ===\n');

      logger.info('User joined voice chat', { 
        username: user.username, 
        userId: actualUserId,
        roomId, 
        socketId: socket.id,
        totalVoiceParticipants: voiceRoom.participants.size
      });
    } catch (error) {
      console.error('\n=== VOICE JOIN ERROR ===');
      console.error('[VOICE DEBUG] Exception caught:', error);
      console.error('[VOICE DEBUG] Stack trace:', error.stack);
      console.error('=== VOICE JOIN ERROR END ===\n');
      logger.error('Error handling voice join', { error: error.message, socketId: socket.id });
      socket.emit('error', { message: 'Failed to join voice chat' });
    }
  }

  // Voice offer (WebRTC signaling)
  handleVoiceOffer(socket, { targetUserId, offer }) {
    try {
      const user = this.users.get(socket.id);
      if (!user) return;

      const voiceRoom = this.voiceRooms.get(user.roomId);
      if (!voiceRoom) return;

      const targetParticipant = voiceRoom.participants.get(targetUserId);
      
      if (!targetParticipant) {
        logger.warn('Target user not found for voice offer', { 
          from: user.username, 
          to: targetUserId, 
          roomId: user.roomId,
          availableParticipants: Array.from(voiceRoom.participants.values()).map(p => p.userId)
        });
        return;
      }

      this.io.to(targetParticipant.socketId).emit('voice_offer', {
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
    try {
      const user = this.users.get(socket.id);
      if (!user) return;

      const voiceRoom = this.voiceRooms.get(user.roomId);
      if (!voiceRoom) return;

      const targetParticipant = voiceRoom.participants.get(targetUserId);
      
      if (!targetParticipant) {
        logger.warn('Target user not found for voice answer', { 
          from: user.username, 
          to: targetUserId, 
          roomId: user.roomId,
          availableParticipants: Array.from(voiceRoom.participants.values()).map(p => p.userId)
        });
        return;
      }

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

      // Find the target participant in voice room by userId key
      const targetParticipant = voiceRoom.participants.get(targetUserId);
      
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
        const participant = voiceRoom.participants.get(userId);
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
        const participant = voiceRoom.participants.get(userId);
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
        const participant = voiceRoom.participants.get(userId);
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

      // Find the target participant in voice room by userId key
      const targetParticipant = voiceRoom.participants.get(targetUserId);
      
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
      voiceRoom.participants.delete(user.userId);
      
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