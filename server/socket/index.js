const { Server } = require('socket.io');
const SocketHandlers = require('./socketHandlers');
const VoiceHandlers = require('./voiceHandlers');
const logger = require('../utils/logger');
const config = require('../config');

function initializeSocket(server, rooms) {
  const io = new Server(server, {
    cors: config.cors,
    pingTimeout: config.socket.pingTimeout,
    pingInterval: config.socket.pingInterval,
    maxHttpBufferSize: config.socket.maxHttpBufferSize,
    allowEIO3: config.socket.allowEIO3,
    transports: ['websocket', 'polling']
  });

  // In-memory storage for users
  const users = new Map();

  // Initialize handlers
  const socketHandlers = new SocketHandlers(io, rooms, users);
  const voiceHandlers = new VoiceHandlers(io, rooms, users);

  // Connection handling
  io.on('connection', (socket) => {
    logger.info('Socket connected', { socketId: socket.id, ip: socket.handshake.address });

    // Room events
    socket.on('join_room', (data) => socketHandlers.handleJoinRoom(socket, data));
    socket.on('change_username', (data) => socketHandlers.handleChangeUsername(socket, data));

    // Chat events
    socket.on('chat_message', (data) => socketHandlers.handleChatMessage(socket, data));

    // Queue events
    socket.on('add_to_queue', (data) => socketHandlers.handleAddToQueue(socket, data));
    socket.on('remove_from_queue', (data) => socketHandlers.handleRemoveFromQueue(socket, data));

    // Video events
    socket.on('video_state_change', (data) => socketHandlers.handleVideoStateChange(socket, data));
    socket.on('skip_video', () => socketHandlers.handleSkipVideo(socket));
    socket.on('video_ended', () => socketHandlers.handleVideoEnded(socket));

    // Voice chat events (always enabled now)
    socket.on('voice_join', (data) => {
      console.log('\\n🎤 [SOCKET] ========================================');
      console.log('🎤 [SOCKET] Received voice_join event');
      console.log('🎤 [SOCKET] Data:', JSON.stringify(data, null, 2));
      console.log('🎤 [SOCKET] From socket:', socket.id);
      console.log('🎤 [SOCKET] Socket rooms:', Array.from(socket.rooms));
      console.log('🎤 [SOCKET] ========================================\\n');
      voiceHandlers.handleVoiceJoin(socket, data);
    });
    socket.on('voice_offer', (data) => voiceHandlers.handleVoiceOffer(socket, data));
    socket.on('voice_answer', (data) => voiceHandlers.handleVoiceAnswer(socket, data));
    socket.on('voice_ice_candidate', (data) => voiceHandlers.handleIceCandidate(socket, data));
    socket.on('voice_toggle_mute', (data) => voiceHandlers.handleMuteStatus(socket, data));
    socket.on('voice_leave', (data) => voiceHandlers.handleVoiceLeave(socket, data));

    // Error handling
    socket.on('error', (error) => {
      logger.error('Socket error', { error: error.message, socketId: socket.id });
    });

    // Disconnect handling
    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { socketId: socket.id, reason });
      socketHandlers.handleDisconnect(socket);
      voiceHandlers.handleVoiceDisconnect(socket);
    });

    // Connection error handling
    socket.on('connect_error', (error) => {
      logger.error('Socket connection error', { error: error.message, socketId: socket.id });
    });
  });

  // Socket.io middleware for logging
  io.use((socket, next) => {
    logger.debug('Socket middleware', { 
      socketId: socket.id, 
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent']
    });
    next();
  });

  // Error handling for the socket server
  io.engine.on('connection_error', (err) => {
    logger.error('Socket.io connection error', {
      code: err.code,
      message: err.message,
      context: err.context
    });
  });

  logger.info('Socket.io server initialized', {
    cors: config.cors.origin,
    pingTimeout: config.socket.pingTimeout,
    pingInterval: config.socket.pingInterval,
    voiceChatEnabled: true
  });

  return { io, users };
}

module.exports = initializeSocket;