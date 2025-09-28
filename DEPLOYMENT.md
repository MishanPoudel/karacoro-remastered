# Simple Server & Client Deployment Guide# Production Deployment Checklist



This guide explains how to deploy your Karaoke Party application using traditional hosting (no Docker).Before deploying your Karaoke Party application to production, ensure you complete all items in this checklist.



## 📋 Prerequisites## 🔐 Security Configuration



- Node.js 18+ installed on your server### Required Environment Variables

- PM2 or similar process manager (recommended)- [ ] Set `NEXT_PUBLIC_YOUTUBE_API_KEY` with your production YouTube API key

- Domain with SSL certificate- [ ] Set `JWT_SECRET` with a secure random string (minimum 32 characters)

- YouTube Data API key- [ ] Set `SESSION_SECRET` with a secure random string (minimum 32 characters)

- [ ] Configure `ALLOWED_ORIGINS` with your actual domain(s)

## 🏗️ Project Structure- [ ] Update `NEXT_PUBLIC_BASE_URL` with your production domain

- [ ] Update `NEXT_PUBLIC_SOCKET_URL` with your production WebSocket URL

```

karacoro-remastered/### Security Settings

├── app/                 # Next.js frontend- [ ] `NODE_ENV=production` is set

├── components/          # React components- [ ] `NEXT_PUBLIC_PRODUCTION_MODE=true` is set

├── server/             # Express.js backend- [ ] `NEXT_PUBLIC_MOCK_APIS=false` is set

├── .env.production     # Frontend environment variables- [ ] `NEXT_PUBLIC_VERBOSE_LOGGING=false` is set

└── server/.env.production  # Backend environment variables- [ ] `NEXT_PUBLIC_SHOW_MOCK_INDICATORS=false` is set

```

## 🌐 Domain & SSL Configuration

## ⚙️ Configuration

- [ ] Domain is properly configured and pointing to your server

### 1. Frontend Environment (.env.production)- [ ] SSL certificate is installed and configured

```bash- [ ] Update `nginx.conf` with your actual domain name

# YouTube API- [ ] Update SSL certificate paths in `nginx.conf`

NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key_here- [ ] Test HTTPS redirect functionality

NEXT_PUBLIC_YOUTUBE_QUOTA_LIMIT=10000

## 📊 Performance & Monitoring

# Production Settings

NODE_ENV=production### Rate Limiting

NEXT_PUBLIC_PRODUCTION_MODE=true- [ ] Configure appropriate rate limits for your expected traffic

- [ ] Test rate limiting functionality

# Server URLs (Update with your domain)- [ ] Monitor rate limit logs

NEXT_PUBLIC_SOCKET_URL=wss://yourdomain.com:3001

NEXT_PUBLIC_BASE_URL=https://yourdomain.com### Resource Limits

- [ ] Set appropriate Docker memory limits based on your server capacity

# Server Ports- [ ] Configure CPU limits appropriately

PORT=3000- [ ] Monitor resource usage after deployment

SERVER_PORT=3001

### Logging

# Feature Flags- [ ] Configure log rotation to prevent disk space issues

NEXT_PUBLIC_ENABLE_VOICE_CHAT=true- [ ] Set up log monitoring and alerting

NEXT_PUBLIC_ENABLE_ANALYTICS=true- [ ] Test log aggregation if using external services

NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true

## 🔧 Application Configuration

# Debug (Keep false in production)

NEXT_PUBLIC_VERBOSE_LOGGING=false### YouTube API

NEXT_PUBLIC_SHOW_MOCK_INDICATORS=false- [ ] YouTube API key has sufficient quota for production usage

NEXT_PUBLIC_FORCE_DEVELOPMENT=false- [ ] YouTube API key restrictions are properly configured

NEXT_PUBLIC_MOCK_APIS=false- [ ] Test video loading with production API key



# Security (Generate 32+ character secrets)### Room Management

SESSION_SECRET=your_secure_session_secret_here- [ ] Configure `MAX_ROOMS` based on expected usage

JWT_SECRET=your_secure_jwt_secret_here- [ ] Set `MAX_USERS_PER_ROOM` appropriately

- [ ] Configure cleanup intervals for inactive rooms

# CORS & Rate Limiting

ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com## 🚀 Deployment Process

RATE_LIMIT_WINDOW_MS=900000

RATE_LIMIT_MAX_REQUESTS=1000### Pre-deployment

```- [ ] Run `npm run security:audit` to check for vulnerabilities

- [ ] Run `npm run lint` to ensure code quality

### 2. Backend Environment (server/.env.production)- [ ] Run `npm run type-check` for TypeScript validation

```bash- [ ] Test the application locally with production environment variables

# Server Configuration

PORT=3001### Deployment

NODE_ENV=production- [ ] Use `npm run deploy:prod` or run `deploy.sh`/`deploy.bat`

- [ ] Verify health checks pass

# CORS Configuration- [ ] Test core functionality (room creation, joining, video playback)

ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com- [ ] Test WebSocket connectivity

- [ ] Verify voice chat functionality if enabled

# Rate Limiting

RATE_LIMIT_WINDOW_MS=900000### Post-deployment

RATE_LIMIT_MAX_REQUESTS=1000- [ ] Monitor application logs for errors

- [ ] Test load balancing if using multiple instances

# Room Configuration- [ ] Verify backup and disaster recovery procedures

MAX_ROOMS=1000- [ ] Set up monitoring and alerting

MAX_USERS_PER_ROOM=50

ROOM_CLEANUP_INTERVAL_MINUTES=30## 🔍 Testing Checklist

INACTIVE_ROOM_TIMEOUT_MINUTES=60

MAX_QUEUE_SIZE=100### Core Functionality

MAX_CHAT_HISTORY=100- [ ] Room creation works

- [ ] Room joining works

# Security (Same secrets as frontend)- [ ] Video search and playback work

JWT_SECRET=your_secure_jwt_secret_here- [ ] Queue management functions properly

SESSION_SECRET=your_secure_session_secret_here- [ ] Chat functionality works

BCRYPT_ROUNDS=12- [ ] Voice chat works (if enabled)



# Socket Configuration### Performance Testing

SOCKET_PING_TIMEOUT=60000- [ ] Test with multiple concurrent users

SOCKET_PING_INTERVAL=25000- [ ] Verify WebSocket connection stability

- [ ] Test under expected load conditions

# YouTube API- [ ] Monitor memory and CPU usage

YOUTUBE_API_KEY=your_youtube_api_key_here

```### Security Testing

- [ ] Verify CORS policies are working

## 🚀 Deployment Steps- [ ] Test rate limiting

- [ ] Verify CSP headers are applied

### 1. Install Dependencies- [ ] Test input validation

```bash

# Install frontend dependencies## 📝 Documentation

npm install

- [ ] Update deployment documentation

# Install backend dependencies- [ ] Document environment variable requirements

cd server && npm install- [ ] Create operational runbooks

```- [ ] Document backup and recovery procedures



### 2. Build the Application## 🚨 Emergency Procedures

```bash

# Build frontend- [ ] Document rollback procedures

npm run build- [ ] Set up monitoring and alerting

- [ ] Prepare incident response plan

# Backend is ready (no build needed)- [ ] Test disaster recovery procedures

```

---

### 3. Start Production Services

## Quick Commands

#### Option A: Using PM2 (Recommended)

```bash```bash

# Install PM2 globally# Deploy to production

npm install -g pm2npm run deploy:prod



# Start frontend# Check logs

pm2 start npm --name "karaoke-frontend" -- startnpm run docker:logs



# Start backend# Stop production services

pm2 start server/index.js --name "karaoke-backend"npm run docker:down



# Save PM2 configuration# Security audit

pm2 savenpm run security:audit

pm2 startup```

```

## Important Notes

#### Option B: Using npm scripts

```bash1. **Never commit sensitive environment variables** to version control

# Start both services2. **Always use HTTPS in production**

npm run start:production3. **Regularly update dependencies** for security patches

```4. **Monitor resource usage** and scale as needed

5. **Keep backups** of your configuration and data

#### Option C: Manual start6. **Test thoroughly** before deploying to production

```bash

# Terminal 1: Start frontend## Support

npm start

If you encounter issues during deployment, check:

# Terminal 2: Start backend1. Application logs: `npm run docker:logs`

cd server && npm start2. Docker container status: `docker ps`

```3. Network connectivity and DNS resolution

4. SSL certificate validity

## 🔒 Security Setup5. Environment variable configuration

### 1. Generate Secure Secrets
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. SSL Certificate
- Obtain SSL certificate for your domain
- Configure your reverse proxy (Nginx/Apache) to handle HTTPS
- Ensure WebSocket connections work with SSL

### 3. Firewall Configuration
```bash
# Allow HTTP/HTTPS
ufw allow 80
ufw allow 443

# Allow application ports (if not using reverse proxy)
ufw allow 3000
ufw allow 3001
```

## 🌐 Reverse Proxy Setup (Nginx Example)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend/Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Frontend health
curl -f http://localhost:3000/api/health

# Backend health
curl -f http://localhost:3001/health
```

### Log Management
```bash
# PM2 logs
pm2 logs

# Manual logs
tail -f logs/server.log  # if logging to file
```

### Updates
```bash
# Stop services
pm2 stop all

# Pull updates
git pull

# Install dependencies
npm install && cd server && npm install

# Build frontend
cd .. && npm run build

# Restart services
pm2 restart all
```

## 🛠️ Useful Commands

```bash
# Development
npm run dev              # Start development mode
npm run server:dev       # Start backend in dev mode

# Production
npm run build           # Build frontend
npm run start:production # Start both services
npm run server:start    # Start backend only

# Maintenance
npm run clean           # Clean build files
npm run security:audit  # Security audit
npm run lint            # Code linting
```

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000 and 3001 are available
2. **CORS errors**: Check ALLOWED_ORIGINS in environment files
3. **WebSocket issues**: Ensure SSL is properly configured for WSS
4. **API limits**: Monitor YouTube API quota usage

### Performance Tips

1. **Use PM2 cluster mode** for better performance:
   ```bash
   pm2 start npm --name "karaoke-frontend" -i max -- start
   ```

2. **Enable Nginx gzip compression** for better load times

3. **Monitor resource usage**:
   ```bash
   pm2 monit
   ```

## 📞 Support

If you encounter issues:
1. Check application logs
2. Verify environment variables
3. Test network connectivity
4. Ensure SSL certificates are valid