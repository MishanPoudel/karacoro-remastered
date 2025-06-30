const { 
  validateUsername, 
  isUsernameAvailable, 
  extractVideoId, 
  isValidYouTubeUrl,
  createRoom,
  createUser,
  transferHost,
  updateRoomActivity
} = require('../utils/roomUtils');
const logger = require('../utils/logger');
const config = require('../config');

class SocketHandlers {
  constructor(io, rooms, users) {
    this.io = io;
    this.rooms = rooms;
    this.users = users;
  }

  // Join room handler
  handleJoinRoom(socket, { roomId, username }) {
    try {
      if (!validateUsername(username)) {
        socket.emit('error', { message: 'Username must be 2-20 characters long and contain only letters, numbers, underscores, and hyphens' });
        return;
      }

      if (!isUsernameAvailable(username, roomId, this.rooms, socket.id)) {
        socket.emit('error', { message: 'Username already taken in this room' });
        return;
      }

      // Leave current room if in one
      this.handleLeaveCurrentRoom(socket);

      // Create or get room
      let room = this.rooms.get(roomId);
      const isHost = !room;
      
      if (!room) {
        room = createRoom(roomId, socket.id);
        this.rooms.set(roomId, room);
        logger.info('Room created via socket', { roomId, hostId: socket.id });
      }

      // Check room capacity
      if (room.users.size >= config.rooms.maxUsersPerRoom) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      // Create user
      const user = createUser(socket.id, username, roomId, isHost);
      this.users.set(socket.id, user);
      room.users.set(socket.id, user);

      // Update room activity
      updateRoomActivity(roomId, this.rooms);

      // Join socket room
      socket.join(roomId);

      // Send room state to new user
      socket.emit('room_joined', {
        roomId,
        username: user.username,
        isHost: user.isHost,
        users: Array.from(room.users.values()).map(u => ({
          username: u.username,
          isHost: u.isHost,
          socketId: u.socketId
        })),
        queue: room.queue,
        currentVideo: room.currentVideo,
        videoState: room.videoState,
        chatHistory: room.chatHistory.slice(-config.rooms.maxChatHistory)
      });

      // Notify others about new user
      socket.to(roomId).emit('user_joined', {
        username: user.username,
        isHost: user.isHost,
        socketId: socket.id
      });

      logger.info('User joined room', { 
        username, 
        roomId, 
        isHost, 
        userCount: room.users.size,
        socketId: socket.id 
      });

    } catch (error) {
      logger.error('Error joining room', { error: error.message, socketId: socket.id });
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  // Change username handler
  handleChangeUsername(socket, { newUsername }) {
    try {
      const user = this.users.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      if (!validateUsername(newUsername)) {
        socket.emit('error', { message: 'Username must be 2-20 characters long and contain only letters, numbers, underscores, and hyphens' });
        return;
      }

      if (!isUsernameAvailable(newUsername, user.roomId, this.rooms, socket.id)) {
        socket.emit('error', { message: 'Username already taken in this room' });
        return;
      }

      const oldUsername = user.username;
      user.username = newUsername.trim();
      user.lastActivity = new Date();
      
      const room = this.rooms.get(user.roomId);
      if (room) {
        room.users.set(socket.id, user);
        updateRoomActivity(user.roomId, this.rooms);
        
        // Notify all users in room
        this.io.to(user.roomId).emit('username_changed', {
          socketId: socket.id,
          oldUsername,
          newUsername: user.username
        });
      }

      socket.emit('username_change_success', { newUsername: user.username });
      
      logger.info('Username changed', { 
        oldUsername, 
        newUsername: user.username, 
        roomId: user.roomId,
        socketId: socket.id 
      });

    } catch (error) {
      logger.error('Error changing username', { error: error.message, socketId: socket.id });
      socket.emit('error', { message: 'Failed to change username' });
    }
  }

  // Chat message handler
  handleChatMessage(socket, { message }) {
    try {
      const user = this.users.get(socket.id);
      if (!user) return;

      if (!message || message.trim().length === 0 || message.trim().length > 500) {
        socket.emit('error', { message: 'Message must be 1-500 characters long' });
        return;
      }

      const chatMessage = {
        id: Date.now() + Math.random(),
        username: user.username,
        message: message.trim(),
        timestamp: new Date(),
        isHost: user.isHost
      };

      const room = this.rooms.get(user.roomId);
      if (room) {
        room.chatHistory.push(chatMessage);
        // Keep only last N messages
        if (room.chatHistory.length > config.rooms.maxChatHistory) {
          room.chatHistory = room.chatHistory.slice(-config.rooms.maxChatHistory);
        }
        updateRoomActivity(user.roomId, this.rooms);
      }

      this.io.to(user.roomId).emit('chat_message', chatMessage);
      
      logger.debug('Chat message sent', { 
        username: user.username, 
        roomId: user.roomId, 
        messageLength: message.length 
      });

    } catch (error) {
      logger.error('Error sending chat message', { error: error.message, socketId: socket.id });
    }
  }

  // Add video to queue handler
  handleAddToQueue(socket, { videoUrl, title, duration, thumbnail }) {
    try {
      const user = this.users.get(socket.id);
      if (!user) return;

      const videoId = extractVideoId(videoUrl);
      if (!videoId) {
        socket.emit('error', { message: 'Invalid YouTube URL' });
        return;
      }

      const room = this.rooms.get(user.roomId);
      if (!room) return;

      // Check queue size limit
      if (room.queue.length >= config.rooms.maxQueueSize) {
        socket.emit('error', { message: `Queue is full (maximum ${config.rooms.maxQueueSize} videos)` });
        return;
      }

      // Check if video already in queue or played
      const alreadyInQueue = room.queue.some(v => v.videoId === videoId);
      const alreadyPlayed = room.playedVideos.has(videoId);
      const isCurrentVideo = room.currentVideo && room.currentVideo.videoId === videoId;

      if (alreadyInQueue || alreadyPlayed || isCurrentVideo) {
        socket.emit('error', { message: 'Video already in queue or has been played' });
        return;
      }

      const queueItem = {
        id: Date.now() + Math.random(),
        videoId,
        title: title || 'Unknown Title',
        duration: duration || 0,
        thumbnail: thumbnail || '',
        addedBy: user.username,
        addedAt: new Date()
      };

      // Always add to queue first
      room.queue.push(queueItem);
      updateRoomActivity(user.roomId, this.rooms);

      // Emit queue update to all users
      this.io.to(user.roomId).emit('queue_updated', {
        queue: room.queue,
        addedBy: user.username,
        videoTitle: queueItem.title
      });

      // Only auto-play if there's no current video playing
      if (!room.currentVideo) {
        const nextVideo = room.queue.shift();
        room.currentVideo = nextVideo;
        room.playedVideos.add(nextVideo.videoId);
        room.videoState = {
          isPlaying: false, // Don't auto-start, let host control
          currentTime: 0,
          lastUpdate: Date.now()
        };

        this.io.to(user.roomId).emit('video_changed', {
          video: room.currentVideo,
          queue: room.queue,
          videoState: room.videoState
        });

        logger.info('Auto-started first video', { 
          videoTitle: nextVideo.title, 
          roomId: user.roomId,
          addedBy: user.username 
        });
      } else {
        logger.info('Added to queue', { 
          videoTitle: queueItem.title, 
          roomId: user.roomId, 
          queueLength: room.queue.length,
          addedBy: user.username 
        });
      }

    } catch (error) {
      logger.error('Error adding to queue', { error: error.message, socketId: socket.id });
      socket.emit('error', { message: 'Failed to add video to queue' });
    }
  }

  // Remove from queue handler (host only)
  handleRemoveFromQueue(socket, { videoId }) {
    try {
      const user = this.users.get(socket.id);
      if (!user || !user.isHost) {
        socket.emit('error', { message: 'Only host can remove videos from queue' });
        return;
      }

      const room = this.rooms.get(user.roomId);
      if (!room) return;

      const initialLength = room.queue.length;
      room.queue = room.queue.filter(v => v.id !== videoId);

      if (room.queue.length < initialLength) {
        updateRoomActivity(user.roomId, this.rooms);
        
        this.io.to(user.roomId).emit('queue_updated', {
          queue: room.queue,
          removedBy: user.username
        });
        
        logger.info('Video removed from queue', { 
          videoId, 
          roomId: user.roomId, 
          removedBy: user.username 
        });
      }

    } catch (error) {
      logger.error('Error removing from queue', { error: error.message, socketId: socket.id });
    }
  }

  // Video state change handler (host only)
  handleVideoStateChange(socket, { isPlaying, currentTime, action }) {
    try {
      const user = this.users.get(socket.id);
      if (!user || !user.isHost) return;

      const room = this.rooms.get(user.roomId);
      if (!room) return;

      room.videoState = {
        isPlaying,
        currentTime,
        lastUpdate: Date.now(),
        action
      };

      updateRoomActivity(user.roomId, this.rooms);
      
      // Broadcast to all other users in the room
      socket.to(user.roomId).emit('video_state_sync', room.videoState);
      
      logger.debug('Video state changed', { 
        isPlaying, 
        currentTime, 
        action, 
        roomId: user.roomId 
      });

    } catch (error) {
      logger.error('Error syncing video state', { error: error.message, socketId: socket.id });
    }
  }

  // Skip video handler (host only)
  handleSkipVideo(socket) {
    try {
      const user = this.users.get(socket.id);
      if (!user || !user.isHost) return;

      const room = this.rooms.get(user.roomId);
      if (!room) return;

      // Move to next video
      if (room.queue.length > 0) {
        const nextVideo = room.queue.shift();
        room.currentVideo = nextVideo;
        room.playedVideos.add(nextVideo.videoId);
        room.videoState = {
          isPlaying: false, // Don't auto-start, let host control
          currentTime: 0,
          lastUpdate: Date.now()
        };

        updateRoomActivity(user.roomId, this.rooms);

        this.io.to(user.roomId).emit('video_changed', {
          video: room.currentVideo,
          queue: room.queue,
          videoState: room.videoState,
          skippedBy: user.username
        });

        logger.info('Video skipped', { 
          nextVideo: nextVideo.title, 
          roomId: user.roomId, 
          skippedBy: user.username 
        });
      } else {
        room.currentVideo = null;
        room.videoState = {
          isPlaying: false,
          currentTime: 0,
          lastUpdate: Date.now()
        };

        updateRoomActivity(user.roomId, this.rooms);

        this.io.to(user.roomId).emit('video_ended', {
          queue: room.queue,
          videoState: room.videoState
        });

        logger.info('No more videos in queue', { roomId: user.roomId });
      }

    } catch (error) {
      logger.error('Error skipping video', { error: error.message, socketId: socket.id });
    }
  }

  // Video ended handler
  handleVideoEnded(socket) {
    try {
      const user = this.users.get(socket.id);
      if (!user || !user.isHost) return;

      const room = this.rooms.get(user.roomId);
      if (!room) return;

      // Auto-advance to next video
      if (room.queue.length > 0) {
        const nextVideo = room.queue.shift();
        room.currentVideo = nextVideo;
        room.playedVideos.add(nextVideo.videoId);
        room.videoState = {
          isPlaying: false, // Don't auto-start, let host control
          currentTime: 0,
          lastUpdate: Date.now()
        };

        updateRoomActivity(user.roomId, this.rooms);

        this.io.to(user.roomId).emit('video_changed', {
          video: room.currentVideo,
          queue: room.queue,
          videoState: room.videoState
        });

        logger.info('Auto-advanced to next video', { 
          nextVideo: nextVideo.title, 
          roomId: user.roomId 
        });
      } else {
        room.currentVideo = null;
        room.videoState = {
          isPlaying: false,
          currentTime: 0,
          lastUpdate: Date.now()
        };

        updateRoomActivity(user.roomId, this.rooms);

        this.io.to(user.roomId).emit('video_ended', {
          queue: room.queue,
          videoState: room.videoState
        });

        logger.info('Queue empty after video ended', { roomId: user.roomId });
      }

    } catch (error) {
      logger.error('Error handling video end', { error: error.message, socketId: socket.id });
    }
  }

  // Leave current room helper
  handleLeaveCurrentRoom(socket) {
    const currentUser = this.users.get(socket.id);
    if (currentUser) {
      socket.leave(currentUser.roomId);
      const currentRoom = this.rooms.get(currentUser.roomId);
      if (currentRoom) {
        currentRoom.users.delete(socket.id);
        socket.to(currentUser.roomId).emit('user_left', {
          username: currentUser.username,
          isHost: currentUser.isHost
        });
        
        // Notify about voice disconnection if applicable
        if (currentUser.voiceConnected) {
          socket.to(currentUser.roomId).emit('voice_user_left', {
            userId: currentUser.username
          });
        }
        
        // Transfer host if needed
        if (currentUser.isHost && currentRoom.users.size > 0) {
          const newHost = transferHost(currentUser.roomId, this.rooms, this.users);
          if (newHost) {
            this.io.to(currentUser.roomId).emit('host_changed', {
              newHost: newHost.username,
              socketId: newHost.socketId
            });
            
            logger.info('Host transferred', { 
              oldHost: currentUser.username, 
              newHost: newHost.username, 
              roomId: currentUser.roomId 
            });
          }
        }
        
        // Delete room if empty
        if (currentRoom.users.size === 0) {
          this.rooms.delete(currentUser.roomId);
          logger.info('Room deleted (empty)', { roomId: currentUser.roomId });
        }
      }
    }
  }

  // Disconnect handler
  handleDisconnect(socket) {
    try {
      const user = this.users.get(socket.id);
      if (!user) return;

      const room = this.rooms.get(user.roomId);
      if (room) {
        room.users.delete(socket.id);
        
        socket.to(user.roomId).emit('user_left', {
          username: user.username,
          isHost: user.isHost
        });

        // Notify about voice disconnection if applicable
        if (user.voiceConnected) {
          socket.to(user.roomId).emit('voice_user_left', {
            userId: user.username
          });
        }

        // Transfer host if needed
        if (user.isHost && room.users.size > 0) {
          const newHost = transferHost(user.roomId, this.rooms, this.users);
          if (newHost) {
            this.io.to(user.roomId).emit('host_changed', {
              newHost: newHost.username,
              socketId: newHost.socketId
            });
            
            logger.info('Host transferred on disconnect', { 
              oldHost: user.username, 
              newHost: newHost.username, 
              roomId: user.roomId 
            });
          }
        }

        // Delete room if empty
        if (room.users.size === 0) {
          this.rooms.delete(user.roomId);
          logger.info('Room deleted on disconnect (empty)', { roomId: user.roomId });
        }
      }

      this.users.delete(socket.id);
      logger.info('User disconnected', { 
        username: user.username, 
        roomId: user.roomId, 
        socketId: socket.id 
      });

    } catch (error) {
      logger.error('Error handling disconnect', { error: error.message, socketId: socket.id });
    }
  }
}

module.exports = SocketHandlers;