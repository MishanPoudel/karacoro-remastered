const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('🔧 [SERVER] Environment loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
});

const app = express();
const server = createServer(app);

const corsOptions = {
  origin: function (origin, callback) {
    console.log('🔍 [SERVER] CORS check for origin:', origin);
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      console.log('✅ [SERVER] No origin header, allowing request');
      return callback(null, true);
    }
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [SERVER] Development mode, allowing all origins');
      return callback(null, true);
    }
    
    // In production, check allowed origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['https://your-frontend-domain.com'];
    
    console.log('🔍 [SERVER] Checking against allowed origins:', allowedOrigins);
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ [SERVER] Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log('❌ [SERVER] Origin blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
};

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`📥 [SERVER] ${req.method} ${req.path}`, {
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']?.substring(0, 50) + '...',
    referer: req.headers.referer
  });
  next();
});

app.use(express.json());

console.log('🔧 [SERVER] Initializing Socket.IO with options:', {
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  cors: 'configured with dynamic origin check'
});

const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

console.log('✅ [SERVER] Socket.IO initialized successfully');

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

io.on('connection', (socket) => {
  console.log('🔌 [SERVER] New connection established');
  console.log('🔌 [SERVER] Socket ID:', socket.id);
  console.log('🔌 [SERVER] Client info:', {
    transport: socket.conn.transport.name,
    origin: socket.handshake.headers.origin,
    userAgent: socket.handshake.headers['user-agent'],
    referer: socket.handshake.headers.referer,
    remoteAddress: socket.handshake.address
  });

  socket.on('join_room', ({ roomId, username }) => {
    try {
      console.log(`👤 User ${username} joining room ${roomId}`);
      
      if (!roomId || !username) {
        socket.emit('error', { message: 'Room ID and username are required' });
        return;
      }
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          id: roomId,
          users: new Map(),
          queue: [],
          currentVideo: null,
          videoState: { isPlaying: false, currentTime: 0, lastUpdate: Date.now() },
          chatHistory: [],
          createdAt: new Date()
        });
        console.log(`🏠 Created new room: ${roomId}`);
      }

      const room = rooms.get(roomId);
      const isHost = room.users.size === 0;

      const user = {
        socketId: socket.id,
        username: username.trim(),
        roomId,
        isHost,
        joinedAt: new Date()
      };

      users.set(socket.id, user);
      room.users.set(socket.id, user);
      socket.join(roomId);

      console.log(`✅ User ${username} joined room ${roomId} as ${isHost ? 'host' : 'guest'}. Room now has ${room.users.size} users.`);

      socket.emit('room_joined', {
        roomId,
        username: user.username,
        isHost,
        users: Array.from(room.users.values()).map(u => ({
          username: u.username,
          isHost: u.isHost,
          socketId: u.socketId
        })),
        queue: room.queue,
        currentVideo: room.currentVideo,
        videoState: room.videoState,
        chatHistory: room.chatHistory.slice(-50)
      });

      socket.to(roomId).emit('user_joined', {
        username: user.username,
        isHost: user.isHost,
        socketId: user.socketId
      });

    } catch (error) {
      console.error('❌ Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('chat_message', ({ message }) => {
    try {
      const user = users.get(socket.id);
      if (!user) return;

      if (!message || message.trim().length === 0) {
        socket.emit('error', { message: 'Message cannot be empty' });
        return;
      }

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
        console.log(`💬 Chat message from ${user.username} in room ${user.roomId}`);
      }
    } catch (error) {
      console.error('❌ Error sending chat message:', error);
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

      const alreadyInQueue = room.queue.some(v => v.videoId === videoId);
      const isCurrentVideo = room.currentVideo && room.currentVideo.videoId === videoId;
      
      if (alreadyInQueue || isCurrentVideo) {
        socket.emit('error', { message: 'Video already in queue or currently playing' });
        return;
      }

      const queueItem = {
        id: Date.now() + Math.random(),
        videoId,
        title: title || 'Unknown Title',
        duration: duration || 0,
        thumbnail: thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        addedBy: user.username,
        addedAt: new Date()
      };

      room.queue.push(queueItem);
      console.log(`🎵 Added video "${title}" to queue in room ${user.roomId} by ${user.username}`);

      io.to(user.roomId).emit('queue_updated', { 
        queue: room.queue,
        addedBy: user.username,
        videoTitle: queueItem.title
      });

      if (!room.currentVideo) {
        const nextVideo = room.queue.shift();
        if (nextVideo) {
          room.currentVideo = nextVideo;
          room.videoState = { isPlaying: true, currentTime: 0, lastUpdate: Date.now() };

          io.to(user.roomId).emit('video_changed', {
            video: room.currentVideo,
            queue: room.queue,
            videoState: room.videoState
          });
          console.log(`▶️ Auto-started video "${nextVideo.title}" in room ${user.roomId}`);
        }
      }
    } catch (error) {
      console.error('❌ Error adding to queue:', error);
      socket.emit('error', { message: 'Failed to add video to queue' });
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
      console.log(`🎬 Video state changed in room ${user.roomId}: ${action} at ${currentTime.toFixed(1)}s`);
    } catch (error) {
      console.error('❌ Error syncing video state:', error);
    }
  });

  socket.on('skip_video', () => {
    try {
      const user = users.get(socket.id);
      if (!user || !user.isHost) {
        socket.emit('error', { message: 'Only host can skip videos' });
        return;
      }

      const room = rooms.get(user.roomId);
      if (!room) return;

      if (room.queue.length > 0) {
        const nextVideo = room.queue.shift();
        room.currentVideo = nextVideo;
        room.videoState = { isPlaying: true, currentTime: 0, lastUpdate: Date.now() };

        io.to(user.roomId).emit('video_changed', {
          video: room.currentVideo,
          queue: room.queue,
          videoState: room.videoState,
          skippedBy: user.username
        });
        console.log(`⏭️ Skipped to next video "${nextVideo.title}" in room ${user.roomId}`);
      } else {
        room.currentVideo = null;
        room.videoState = { isPlaying: false, currentTime: 0, lastUpdate: Date.now() };
        
        io.to(user.roomId).emit('video_ended', {
          queue: room.queue,
          videoState: room.videoState
        });
        console.log(`⏹️ No more videos in queue for room ${user.roomId}`);
      }
    } catch (error) {
      console.error('❌ Error skipping video:', error);
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
        room.videoState = { isPlaying: true, currentTime: 0, lastUpdate: Date.now() };

        io.to(user.roomId).emit('video_changed', {
          video: room.currentVideo,
          queue: room.queue,
          videoState: room.videoState
        });
        console.log(`🔄 Auto-advanced to next video "${nextVideo.title}" in room ${user.roomId}`);
      } else {
        room.currentVideo = null;
        room.videoState = { isPlaying: false, currentTime: 0, lastUpdate: Date.now() };
        
        io.to(user.roomId).emit('video_ended', {
          queue: room.queue,
          videoState: room.videoState
        });
        console.log(`🏁 Queue empty in room ${user.roomId}`);
      }
    } catch (error) {
      console.error('❌ Error handling video end:', error);
    }
  });

  // Handle force sync request from new host
  socket.on('force_sync_all', ({ isPlaying, currentTime }) => {
    try {
      const user = users.get(socket.id);
      if (!user || !user.isHost) return;

      const room = rooms.get(user.roomId);
      if (!room) return;

      console.log(`🔄 [FORCE SYNC] Host ${user.username} force syncing room ${user.roomId}`);

      // Update room video state
      room.videoState.isPlaying = isPlaying;
      room.videoState.currentTime = currentTime;
      room.videoState.lastUpdate = Date.now();

      // Broadcast to all users in the room
      io.to(user.roomId).emit('video_sync', {
        videoId: room.currentVideo?.videoId,
        currentTime: currentTime,
        isPlaying: isPlaying,
        timestamp: room.videoState.lastUpdate,
        fromHost: socket.id,
        reason: 'force_sync'
      });

      console.log(`✅ [FORCE SYNC] Synced all users in room ${user.roomId}`);
    } catch (error) {
      console.error('❌ Error handling force sync:', error);
    }
  });

  // Handle sync request from participants
  socket.on('request_video_sync', () => {
    try {
      const user = users.get(socket.id);
      if (!user) return;

      const room = rooms.get(user.roomId);
      if (!room || !room.currentVideo) return;

      console.log(`🔄 [SYNC REQUEST] User ${user.username} requested sync in room ${user.roomId}`);

      // Send current state back to the requesting user
      socket.emit('video_sync', {
        videoId: room.currentVideo.videoId,
        currentTime: room.videoState.currentTime,
        isPlaying: room.videoState.isPlaying,
        timestamp: room.videoState.lastUpdate,
        reason: 'sync_request_response'
      });

      console.log(`✅ [SYNC REQUEST] Sent current state to ${user.username}`);
    } catch (error) {
      console.error('❌ Error handling sync request:', error);
    }
  });

  socket.on('disconnect', (reason) => {
    // Ignore client namespace disconnects
    if (reason === 'client namespace disconnect') {
      return;
    }
    
    console.log('🔌 User disconnected:', socket.id, 'Reason:', reason);
    
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
      
      console.log(`👋 User ${user.username} left room ${user.roomId}. Room now has ${room.users.size} users.`);

      if (user.isHost && room.users.size > 0) {
        console.log(`🔄 [HOST MIGRATION] Host ${user.username} disconnected, transferring host...`);
        
        // Find the next host (first user in the room)
        const newHostEntry = Array.from(room.users.entries())[0];
        const [newHostSocketId, newHostUser] = newHostEntry;
        
        // Transfer host status
        newHostUser.isHost = true;
        users.set(newHostSocketId, newHostUser);
        room.users.set(newHostSocketId, newHostUser);
        
        // Preserve video state for seamless transition
        const currentVideoState = room.videoState;
        const currentVideo = room.currentVideo;
        
        console.log(`🔄 [HOST MIGRATION] Transferring video state:`, {
          currentVideo: currentVideo?.title || 'none',
          isPlaying: currentVideoState.isPlaying,
          currentTime: currentVideoState.currentTime,
          newHost: newHostUser.username
        });
        
        // Notify all users about host change with video state
        io.to(user.roomId).emit('host_changed', {
          newHost: newHostUser.username,
          socketId: newHostSocketId,
          videoState: currentVideoState,
          currentVideo: currentVideo,
          queue: room.queue
        });
        
        // Send special message to new host with recovery instructions
        io.to(newHostSocketId).emit('host_migration_recovery', {
          videoState: currentVideoState,
          currentVideo: currentVideo,
          queue: room.queue,
          message: 'You are now the host. Video sync will be automatically restored.'
        });
        
        // If there was a video playing, ensure sync recovery
        if (currentVideo && currentVideoState.isPlaying) {
          console.log(`🎥 [HOST MIGRATION] Recovering video playback for ${currentVideo.title}`);
          
          // Update video state timestamp to prevent desync
          room.videoState.lastUpdate = Date.now();
          
          // Broadcast current state to all participants
          setTimeout(() => {
            io.to(user.roomId).emit('video_sync', {
              videoId: currentVideo.videoId,
              currentTime: currentVideoState.currentTime,
              isPlaying: currentVideoState.isPlaying,
              timestamp: room.videoState.lastUpdate,
              fromHost: newHostSocketId,
              reason: 'host_migration_recovery'
            });
          }, 1000); // Small delay to ensure new host is ready
        }
        
        console.log(`👑 [HOST MIGRATION] Host transferred to ${newHostUser.username} in room ${user.roomId}`);
      }

      if (room.users.size === 0) {
        rooms.delete(user.roomId);
        console.log(`🗑️ Deleted empty room ${user.roomId}`);
      }
    }

    users.delete(socket.id);
  });

  socket.on('error', (error) => {
    console.error('❌ Socket error for', socket.id, ':', error);
  });
});

app.get('/health', (req, res) => {
  const roomDetails = Array.from(rooms.entries()).map(([id, room]) => ({
    id,
    userCount: room.users.size,
    queueLength: room.queue.length,
    hasCurrentVideo: !!room.currentVideo,
    createdAt: room.createdAt
  }));

  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    stats: {
      rooms: rooms.size,
      users: users.size,
      connections: io.engine.clientsCount
    },
    roomDetails
  });
});

// Add Socket.IO error logging
io.engine.on("connection_error", (err) => {
  console.error('❌ [SERVER] Socket.IO connection error:', {
    code: err.code,
    message: err.message,
    context: err.context,
    type: err.type
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎤 Karaoke server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.io server ready for connections`);
  console.log(`🔗 CORS origins: ${process.env.ALLOWED_ORIGINS || 'all (development)'}`);
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});