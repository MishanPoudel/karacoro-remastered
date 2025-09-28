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
  handleJoinRoom(socket, { roomId, username, userId }) {
    try {
      if (!validateUsername(username)) {
        socket.emit('error', { message: 'Username must be 2-20 characters long and contain only letters, numbers, underscores, and hyphens' });
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

      let user;
      // Restore user by userId if possible
      if (userId && this.users.has(userId)) {
        user = this.users.get(userId);
        user.socketId = socket.id;
        user.lastActivity = new Date();
        // Restore host status if user was host
        if (user.isHost) {
          room.hostId = socket.id;
          user.isHost = true;
        }
        this.users.set(socket.id, user); // Map new socketId to user
      } else {
        // Normal join logic
        if (!isUsernameAvailable(username, roomId, this.rooms, socket.id)) {
          socket.emit('error', { message: 'Username already taken in this room' });
          return;
        }
        user = createUser(socket.id, username, roomId, isHost);
        this.users.set(socket.id, user);
      }

      // Add user to room
      room.users.set(socket.id, user);

      // Update room activity
      updateRoomActivity(roomId, this.rooms);

      // Join socket room
      socket.join(roomId);

      // Send system message as toast instead of chat
      const joinMessage = {
        id: Date.now() + Math.random(),
        username: 'System',
        message: `🎉 ${user.username} joined the room${user.isHost ? ' as host' : ''}`,
        timestamp: new Date(),
        isSystem: true,
        isHost: false
      };
      console.log('Server: Creating join toast:', joinMessage);

      // Send room state to new user (including the join message in history)
      const roomState = {
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
      };
      console.log('Server: Sending room state with chat history length:', roomState.chatHistory.length);
      socket.emit('room_joined', roomState);

      // Notify others about new user
      socket.to(roomId).emit('user_joined', {
        username: user.username,
        isHost: user.isHost,
        socketId: socket.id
      });

      // Send join toast to everyone including the new user
      console.log('🚀 [Server] Sending join message to room:', roomId, joinMessage);
      this.io.to(roomId).emit('chat_message', joinMessage);
      console.log('🚀 [Server] Join message sent successfully');

      logger.info('User joined room', { 
        username, 
        roomId, 
        isHost: user.isHost, 
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

      // Send system message for video added as toast
      const queueMessage = {
        id: Date.now() + Math.random(),
        username: 'System',
        message: `🎵 ${user.username} added "${queueItem.title}" to the queue`,
        timestamp: new Date(),
        isSystem: true,
        isHost: false
      };
      this.io.to(user.roomId).emit('chat_message', queueMessage);

      // Only auto-play if there's no current video playing
      if (!room.currentVideo) {
        const nextVideo = room.queue.shift();
        room.currentVideo = nextVideo;
        room.playedVideos.add(nextVideo.videoId);
        room.videoState = {
          isPlaying: true, // Auto-start video
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
          isPlaying: true, // Auto-start video
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

        // Send system message for video skip as toast
        const skipMessage = {
          id: Date.now() + Math.random(),
          username: 'System',
          message: `⏭️ ${user.username} skipped to "${nextVideo.title}"`,
          timestamp: new Date(),
          isSystem: true,
          isHost: false
        };
        this.io.to(user.roomId).emit('chat_message', skipMessage);

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
          isPlaying: true, // Auto-start video
          currentTime: 0,
          lastUpdate: Date.now()
        };

        updateRoomActivity(user.roomId, this.rooms);

        this.io.to(user.roomId).emit('video_changed', {
          video: room.currentVideo,
          queue: room.queue,
          videoState: room.videoState
        });

        // Send system message for auto-advance as toast
        const autoAdvanceMessage = {
          id: Date.now() + Math.random(),
          username: 'System',
          message: `▶️ Now playing: "${nextVideo.title}"`,
          timestamp: new Date(),
          isSystem: true,
          isHost: false
        };
        this.io.to(user.roomId).emit('chat_message', autoAdvanceMessage);

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

        // Send system message for user leaving as toast
        const leaveMessage = {
          id: Date.now() + Math.random(),
          username: 'System',
          message: `👋 ${currentUser.username} left the room`,
          timestamp: new Date(),
          isSystem: true,
          isHost: false
        };
        socket.to(currentUser.roomId).emit('chat_message', leaveMessage);
        
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

            // Send system message for host change as toast
            const hostChangeMessage = {
              id: Date.now() + Math.random(),
              username: 'System',
              message: `👑 ${newHost.username} is now the host`,
              timestamp: new Date(),
              isSystem: true,
              isHost: false
            };
            this.io.to(currentUser.roomId).emit('chat_message', hostChangeMessage);
            
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