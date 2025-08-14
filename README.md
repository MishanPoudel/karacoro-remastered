# Karaoke Party - Real-time YouTube Karaoke App

A real-time karaoke application that allows users to create rooms, search YouTube videos, and sing together in sync.

## Features

- **Real-time synchronization** - Host controls playback, guests sync automatically
- **YouTube integration** - Search and play any YouTube video
- **Room management** - Create private rooms with 6-character codes
- **Live chat** - Chat with participants during karaoke sessions
- **Queue management** - Add videos to queue and take turns
- **Voice chat** - WebRTC-based voice communication
- **Volume controls** - Individual volume control for each user
- **Environment-aware configuration** - Easy switching between production and development modes

## Environment Configuration

This application features a comprehensive environment system that allows easy switching between production and development modes.

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Required: YouTube API Key
NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key_here

# Environment Control
NEXT_PUBLIC_PRODUCTION_MODE=false          # Set to true for production
NEXT_PUBLIC_FORCE_DEVELOPMENT=false       # Force dev mode even in production
NEXT_PUBLIC_MOCK_APIS=false               # Use mocks even in production

# Production URLs
NEXT_PUBLIC_SOCKET_URL=your_socket_server_url
NEXT_PUBLIC_BASE_URL=your_app_url

# Feature Flags
NEXT_PUBLIC_ENABLE_VOICE_CHAT=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=false

# Debug Settings
NEXT_PUBLIC_VERBOSE_LOGGING=false
NEXT_PUBLIC_SHOW_MOCK_INDICATORS=true
```

## Setup

### 1. YouTube API Configuration

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing one
3. Enable the **YouTube Data API v3**
4. Create credentials (API Key)
5. Copy your API key to `.env.local`

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Application

```bash
# Development mode (starts both frontend and backend)
npm run dev
```

This will start both the Next.js frontend (port 3000) and the Socket.io backend (port 3001) concurrently.

## Production Deployment

### Environment Setup
```bash
NODE_ENV=production
NEXT_PUBLIC_PRODUCTION_MODE=true
NEXT_PUBLIC_YOUTUBE_API_KEY=your_production_key
NEXT_PUBLIC_SOCKET_URL=wss://your-production-server.com
```

### Build and Start
```bash
npm run build
npm start
```

## Architecture

### Core Components

- **VideoPlayer** - YouTube video playback with real-time sync
- **VideoQueue** - Queue management with search and popular songs
- **ChatPanel** - Real-time messaging system
- **VoiceChat** - WebRTC voice communication
- **UserPanel** - User management and controls

### Backend Server

- **Express.js** server with Socket.io
- **Room management** with automatic cleanup
- **Rate limiting** and security features
- **Health monitoring** and logging
- **Voice chat signaling** for WebRTC

## License

MIT License - see LICENSE file for details.