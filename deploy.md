# Deployment Guide

## Environment Variables Required

### Frontend (.env.production)
```bash
NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key
NEXT_PUBLIC_SOCKET_URL=wss://your-socket-server.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NODE_ENV=production
```

### Backend (server/.env.production)
```bash
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://your-domain.com
```

## Deployment Options

### 1. Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t karaoke-party .
docker run -p 3000:3000 -p 3001:3001 karaoke-party
```

### 2. Manual Deployment
```bash
# Build frontend
npm run build

# Install server dependencies
cd server && npm install --production

# Start both services
npm run start:production
```

### 3. Separate Deployments

#### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy dist folder
```

#### Backend (Railway/Heroku/VPS)
```bash
cd server
npm install --production
npm start
```

## Important Notes

1. **Socket URL**: Must be accessible from your frontend domain
2. **CORS**: Configure ALLOWED_ORIGINS in server environment
3. **YouTube API**: Get production API key with higher quotas
4. **HTTPS**: Use WSS for socket connections in production
5. **Ports**: Ensure ports 3000 and 3001 are open

## Health Checks

- Frontend: `https://your-domain.com`
- Backend: `https://your-socket-server.com/health`