# Karaoke Party Server

A robust Node.js/Express backend server for the Karaoke Party application with real-time WebSocket communication, room management, and comprehensive API endpoints.

## 🚀 Features

- **Real-time Communication**: Socket.io for synchronized karaoke sessions
- **Room Management**: Create, join, and manage karaoke rooms
- **Queue System**: Add, remove, and manage video queues
- **Chat System**: Real-time messaging within rooms
- **Voice Chat Support**: WebRTC signaling for voice communication
- **Rate Limiting**: Protect against abuse and spam
- **Error Handling**: Comprehensive error handling and logging
- **Health Monitoring**: Health check endpoints and statistics
- **Auto Cleanup**: Automatic cleanup of inactive rooms
- **Security**: CORS, Helmet, and input validation

## 📁 Project Structure

```
server/
├── config/
│   └── index.js              # Configuration management
├── middleware/
│   ├── cors.js               # CORS configuration
│   ├── rateLimiter.js        # Rate limiting middleware
│   ├── validation.js         # Input validation
│   └── errorHandler.js       # Error handling
├── routes/
│   ├── rooms.js              # Room management endpoints
│   └── health.js             # Health check endpoints
├── socket/
│   ├── index.js              # Socket.io initialization
│   ├── socketHandlers.js     # Main socket event handlers
│   └── voiceHandlers.js      # Voice chat handlers
├── utils/
│   ├── roomUtils.js          # Room utility functions
│   └── logger.js             # Logging utility
├── tasks/
│   └── cleanup.js            # Background cleanup tasks
├── package.json              # Dependencies and scripts
├── .env.example              # Environment variables template
└── index.js                  # Main server file
```

## 🛠 Installation

1. **Navigate to server directory**:
   ```bash
   cd server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server**:
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the server directory:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,https://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Room Configuration
MAX_ROOMS=1000
MAX_USERS_PER_ROOM=50
ROOM_CLEANUP_INTERVAL_MINUTES=30
INACTIVE_ROOM_TIMEOUT_MINUTES=60

# Feature Flags
ENABLE_VOICE_CHAT=true
ENABLE_RATE_LIMITING=true

# Logging
LOG_LEVEL=info
```

### Configuration Options

- **PORT**: Server port (default: 3001)
- **NODE_ENV**: Environment mode (development/production)
- **MAX_ROOMS**: Maximum number of concurrent rooms
- **MAX_USERS_PER_ROOM**: Maximum users per room
- **RATE_LIMIT_MAX_REQUESTS**: API requests per window
- **ENABLE_VOICE_CHAT**: Enable/disable voice chat features

## 📡 API Endpoints

### Room Management

#### Create Room
```http
POST /api/rooms
Content-Type: application/json

{
  "name": "My Karaoke Room",
  "roomId": "ABC123"  // Optional custom ID
}
```

#### Check Room Exists
```http
GET /api/rooms/check?roomId=ABC123
```

#### Get Room Statistics
```http
GET /api/rooms/stats
```

### Health Checks

#### Basic Health Check
```http
GET /api/health
```

#### Detailed Health Information
```http
GET /api/health/detailed
```

## 🔌 WebSocket Events

### Client → Server Events

#### Room Events
- `join_room` - Join a karaoke room
- `change_username` - Change username in room

#### Chat Events
- `chat_message` - Send chat message

#### Queue Events
- `add_to_queue` - Add video to queue
- `remove_from_queue` - Remove video from queue (host only)

#### Video Events
- `video_state_change` - Update video playback state (host only)
- `skip_video` - Skip current video (host only)
- `video_ended` - Notify video has ended (host only)

#### Voice Chat Events
- `voice_join` - Join voice chat
- `voice_offer` - WebRTC offer
- `voice_answer` - WebRTC answer
- `voice_ice_candidate` - ICE candidate
- `voice_mute_status` - Update mute status
- `voice_activity` - Voice activity detection
- `voice_leave` - Leave voice chat

### Server → Client Events

#### Room Events
- `room_joined` - Successfully joined room
- `user_joined` - Another user joined
- `user_left` - User left room
- `host_changed` - Host transferred
- `username_changed` - Username updated

#### Chat Events
- `chat_message` - New chat message

#### Queue Events
- `queue_updated` - Queue modified
- `video_changed` - Current video changed
- `video_ended` - Video playback ended

#### Video Events
- `video_state_sync` - Video state synchronization

#### Voice Events
- `voice_user_joined` - User joined voice chat
- `voice_user_left` - User left voice chat
- `voice_offer` - WebRTC offer received
- `voice_answer` - WebRTC answer received
- `voice_ice_candidate` - ICE candidate received

## 🛡 Security Features

### Rate Limiting
- General API rate limiting
- Strict limits for room creation
- IP-based throttling

### Input Validation
- Room ID format validation
- Username sanitization
- Message length limits
- YouTube URL validation

### CORS Protection
- Configurable allowed origins
- Credential support
- WebContainer environment detection

### Error Handling
- Comprehensive error logging
- Graceful error responses
- Stack trace protection in production

## 📊 Monitoring & Logging

### Health Monitoring
- Server uptime tracking
- Memory usage monitoring
- Room statistics
- User count tracking

### Logging Levels
- **Error**: Critical errors and exceptions
- **Warn**: Warning conditions
- **Info**: General information
- **Debug**: Detailed debugging information

### Automatic Cleanup
- Inactive room removal
- Memory optimization
- Statistics reporting

## 🔄 Background Tasks

### Room Cleanup
- Runs every 30 minutes (configurable)
- Removes inactive rooms
- Cleans up empty rooms
- Logs cleanup statistics

### Statistics Collection
- Hourly server statistics
- Memory usage tracking
- Room activity monitoring

## 🚀 Production Deployment

### Environment Setup
```bash
NODE_ENV=production
PORT=3001
ENABLE_RATE_LIMITING=true
LOG_LEVEL=info
```

### Process Management
```bash
# Using PM2
npm install -g pm2
pm2 start index.js --name karaoke-server

# Using Docker
docker build -t karaoke-server .
docker run -p 3001:3001 karaoke-server
```

### Health Checks
```bash
# Check server health
curl http://localhost:3001/api/health

# Check detailed statistics
curl http://localhost:3001/api/health/detailed
```

## 🧪 Testing

### Manual Testing
```bash
# Test room creation
curl -X POST http://localhost:3001/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Room"}'

# Test room check
curl "http://localhost:3001/api/rooms/check?roomId=ABC123"
```

### WebSocket Testing
Use a WebSocket client to test real-time functionality:
```javascript
const socket = io('http://localhost:3001');
socket.emit('join_room', { roomId: 'ABC123', username: 'TestUser' });
```

## 📝 Development

### Adding New Features
1. Create route handlers in `routes/`
2. Add socket event handlers in `socket/`
3. Update validation in `middleware/validation.js`
4. Add tests and documentation

### Code Style
- Use consistent error handling
- Add comprehensive logging
- Validate all inputs
- Follow security best practices

## 🐛 Troubleshooting

### Common Issues

#### CORS Errors
- Check `ALLOWED_ORIGINS` in `.env`
- Verify frontend URL configuration
- Check WebContainer environment detection

#### Socket Connection Issues
- Verify port configuration
- Check firewall settings
- Ensure WebSocket transport is enabled

#### Rate Limiting
- Adjust rate limits in configuration
- Check IP whitelisting for development
- Monitor rate limit logs

### Debug Mode
```bash
LOG_LEVEL=debug npm run dev
```

## 📄 License

MIT License - see LICENSE file for details.#   k a r a c o r o - r e m a s t e r e d - b a c k e n d 
 
 