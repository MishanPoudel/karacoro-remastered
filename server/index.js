const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = createServer(app);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      "http://localhost:3000", 
      "https://localhost:3000",
      /\.webcontainer-api\.io$/,
      /\.local-credentialless\.webcontainer-api\.io$/
    ];
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      }
      return allowed.test(origin);
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all for development
    }
  },
  credentials: true,
  methods: ["GET", "POST"]
};

app.use(cors(corsOptions));
app.use(express.json());

// Socket.io setup
const io = new Server(server, {
  cors: corsOptions,
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// In-memory storage
const rooms = new Map();
const users = new Map();

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// Socket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', ({ roomId, username }) => {
    try {
      console.log(`User ${username} joining room ${roomId}`);
      
      // Validate inputs
      if (!roomId || !username) {
        socket.emit('error', { message: 'Room ID and username are required' });
        return;
      }
      
      // Remove user from any existing room first
      const existingUser = users.get(socket.id);
      if (existingUser) {
        const oldRoom = rooms.get(existingUser.roomId);
        if (oldRoom) {
          oldRoom.users.delete(socket.id);
          socket.leave(existingUser.roomId);
          socket.to(existingUser.roomId).emit('user_left', {
            username: existingUser.username,
            isHost: existingUser.isHost,
            socketId: socket.id
          });
        }
      }

      // Create room if doesn't exist
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          id: roomId,
          users: new Map(),
          queue: [],
          currentVideo: null,
          videoState: { isPlaying: false, currentTime: 0, lastUpdate: Date.now() },
          chatHistory: []
        });
        console.log(`Created new room: ${roomId}`);
      }

      const room = rooms.get(roomId);
      const isHost = room.users.size === 0;

      // Create user
      const user = {
        socketId: socket.id,
        username,
        roomId,
        isHost,
        joinedAt: new Date()
      };

      users.set(socket.id, user);
      room.users.set(socket.id, user);
      socket.join(roomId);

      console.log(`User ${username} joined room ${roomId} as ${isHost ? 'host' : 'guest'}. Room now has ${room.users.size} users.`);

      // Send room state to user
      socket.emit('room_joined', {
        roomId,
        username,
        isHost,
        users: Array.from(room.users.values()).map(u => ({
          username: u.username,
          isHost: u.isHost,
          socketId: u.socketId
        })),
        queue: room.queue,
        currentVideo: room.currentVideo,
        videoState: room.videoState,
        chatHistory: room.chatHistory
      });

      // Notify others
      socket.to(roomId).emit('user_joined', {
        username: user.username,
        isHost: user.isHost,
        socketId: user.socketId
      });

    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('change_username', ({ newUsername }) => {
    try {
      const user = users.get(socket.id);
      if (!user) return;

      const oldUsername = user.username;
      user.username = newUsername;
      users.set(socket.id, user);

      const room = rooms.get(user.roomId);
      if (room) {
        room.users.set(socket.id, user);
        io.to(user.roomId).emit('username_changed', {
          socketId: socket.id,
          oldUsername,
          newUsername
        });
      }
    } catch (error) {
      console.error('Error changing username:', error);
    }
  });

  socket.on('chat_message', ({ message }) => {
    try {
      const user = users.get(socket.id);
      if (!user) return;

      const chatMessage = {
        id: Date.now() + Math.random(),
        username: user.username,
        message: message.trim(),
        timestamp: new Date(),
        isHost: user.isHost
      };

      const room = rooms.get(user.roomId);
      if (room) {
        room.chatHistory.push(chatMessage);
        if (room.chatHistory.length > 100) {
          room.chatHistory = room.chatHistory.slice(-100);
        }
        io.to(user.roomId).emit('chat_message', chatMessage);
        console.log(`Chat message from ${user.username} in room ${user.roomId}: ${message}`);
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  });

  socket.on('add_to_queue', ({ videoUrl, title, duration, thumbnail }) => {
    try {
      const user = users.get(socket.id);
      if (!user) return;

      const room = rooms.get(user.roomId);
      if (!room) return;

      const videoId = extractVideoId(videoUrl);
      if (!videoId) {
        socket.emit('error', { message: 'Invalid YouTube URL' });
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

      room.queue.push(queueItem);
      console.log(`Added video "${title}" to queue in room ${user.roomId}`);

      io.to(user.roomId).emit('queue_updated', { queue: room.queue });

      // Auto-start if no current video
      if (!room.currentVideo) {
        const nextVideo = room.queue.shift();
        room.currentVideo = nextVideo;
        room.videoState = { isPlaying: false, currentTime: 0, lastUpdate: Date.now() };

        io.to(user.roomId).emit('video_changed', {
          video: room.currentVideo,
          queue: room.queue,
          videoState: room.videoState
        });
        console.log(`Auto-started video "${nextVideo.title}" in room ${user.roomId}`);
      }
    } catch (error) {
      console.error('Error adding to queue:', error);
    }
  });

  socket.on('remove_from_queue', ({ videoId }) => {
    try {
      const user = users.get(socket.id);
      if (!user || !user.isHost) return;

      const room = rooms.get(user.roomId);
      if (!room) return;

      const initialLength = room.queue.length;
      room.queue = room.queue.filter(v => v.id !== videoId);

      if (room.queue.length < initialLength) {
        io.to(user.roomId).emit('queue_updated', { queue: room.queue });
        console.log(`Removed video from queue in room ${user.roomId}`);
      }
    } catch (error) {
      console.error('Error removing from queue:', error);
    }
  });

  socket.on('video_state_change', ({ isPlaying, currentTime, action }) => {
    try {
      const user = users.get(socket.id);
      if (!user || !user.isHost) return;

      const room = rooms.get(user.roomId);
      if (!room) return;

      room.videoState = {
        isPlaying,
        currentTime,
        lastUpdate: Date.now(),
        action
      };

      socket.to(user.roomId).emit('video_state_sync', room.videoState);
      console.log(`Video state changed in room ${user.roomId}: ${action} at ${currentTime}s`);
    } catch (error) {
      console.error('Error syncing video state:', error);
    }
  });

  socket.on('skip_video', () => {
    try {
      const user = users.get(socket.id);
      if (!user || !user.isHost) return;

      const room = rooms.get(user.roomId);
      if (!room) return;

      if (room.queue.length > 0) {
        const nextVideo = room.queue.shift();
        room.currentVideo = nextVideo;
        room.videoState = { isPlaying: false, currentTime: 0, lastUpdate: Date.now() };

        io.to(user.roomId).emit('video_changed', {
          video: room.currentVideo,
          queue: room.queue,
          videoState: room.videoState
        });
        console.log(`Skipped to next video "${nextVideo.title}" in room ${user.roomId}`);
      } else {
        room.currentVideo = null;
        room.videoState = { isPlaying: false, currentTime: 0, lastUpdate: Date.now() };
        io.to(user.roomId).emit('video_ended', {
          queue: room.queue,
          videoState: room.videoState
        });
        console.log(`No more videos in queue for room ${user.roomId}`);
      }
    } catch (error) {
      console.error('Error skipping video:', error);
    }
  });

  socket.on('video_ended', () => {
    try {
      const user = users.get(socket.id);
      if (!user || !user.isHost) return;

      const room = rooms.get(user.roomId);
      if (!room) return;

      if (room.queue.length > 0) {
        const nextVideo = room.queue.shift();
        room.currentVideo = nextVideo;
        room.videoState = { isPlaying: false, currentTime: 0, lastUpdate: Date.now() };

        io.to(user.roomId).emit('video_changed', {
          video: room.currentVideo,
          queue: room.queue,
          videoState: room.videoState
        });
        console.log(`Auto-advanced to next video "${nextVideo.title}" in room ${user.roomId}`);
      } else {
        room.currentVideo = null;
        room.videoState = { isPlaying: false, currentTime: 0, lastUpdate: Date.now() };
        io.to(user.roomId).emit('video_ended', {
          queue: room.queue,
          videoState: room.videoState
        });
        console.log(`Queue empty in room ${user.roomId}`);
      }
    } catch (error) {
      console.error('Error handling video end:', error);
    }
  });

  socket.on('disconnect', () => {
    try {
      console.log('User disconnected:', socket.id);
      const user = users.get(socket.id);
      if (!user) return;

      const room = rooms.get(user.roomId);
      if (room) {
        room.users.delete(socket.id);
        socket.to(user.roomId).emit('user_left', {
          username: user.username,
          isHost: user.isHost,
          socketId: socket.id
        });
        console.log(`User ${user.username} left room ${user.roomId}. Room now has ${room.users.size} users.`);

        // Transfer host if needed
        if (user.isHost && room.users.size > 0) {
          const newHost = Array.from(room.users.values())[0];
          newHost.isHost = true;
          users.set(newHost.socketId, newHost);
          room.users.set(newHost.socketId, newHost);
          io.to(user.roomId).emit('host_changed', {
            newHost: newHost.username,
            socketId: newHost.socketId
          });
          console.log(`Host transferred to ${newHost.username} in room ${user.roomId}`);
        }

        // Delete empty room
        if (room.users.size === 0) {
          rooms.delete(user.roomId);
          console.log(`Deleted empty room ${user.roomId}`);
        }
      }

      users.delete(socket.id);
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: rooms.size, 
    users: users.size,
    roomDetails: Array.from(rooms.entries()).map(([id, room]) => ({
      id,
      userCount: room.users.size,
      queueLength: room.queue.length,
      hasCurrentVideo: !!room.currentVideo
    }))
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎤 Karaoke server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});