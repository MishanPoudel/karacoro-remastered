# Karacoro — Remastered

Professional documentation for the Karacoro remastered project.

Summary
-------
Karacoro is a real-time karaoke web application built with Next.js (frontend) and an Express/Socket.io backend. The app supports synchronized YouTube playback, queue management, chat, and optional voice chat via WebRTC.

Key features
------------
- Real-time playback sync (host-controlled)
- YouTube Data API integration (search and play)
- Room creation and management (room codes)
- Video queue with prioritization and voting
- Text chat and optional voice chat (WebRTC signaling)
- User volume and role controls

System requirements
-------------------
- Node.js 20.x
- npm >= 8
- A YouTube Data API key for search/playback features

Repository layout (high level)
------------------------------
- app/                     — Next.js app routes and pages
- components/              — React components (UI, room, shared)
- hooks/                   — Custom React hooks
- lib/                     — Shared utilities, API wrappers, Redis helpers
- server/                  — Express/Socket.io backend and server-only code
- public/                  — Static assets
- styles and config files  — tailwind.config.ts, postcss.config.js, etc.

Environment variables
---------------------
Place secret/runtime configuration in a `.env.local` file at the repo root. Typical variables used by the project:

Required
- NEXT_PUBLIC_YOUTUBE_API_KEY — YouTube Data API key (used by frontend and server)

Recommended / optional
- NEXT_PUBLIC_SOCKET_URL — WebSocket URL for the backend (wss://...)
- NEXT_PUBLIC_BASE_URL — Public base URL for the app
- NEXT_PUBLIC_PRODUCTION_MODE — "true" | "false"
- NEXT_PUBLIC_ENABLE_VOICE_CHAT — "true" | "false"
- NEXT_PUBLIC_MOCK_APIS — "true" | "false" (for local testing)

Example `.env.local` (copy from `.env.example` if present):

```powershell
NEXT_PUBLIC_YOUTUBE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_SOCKET_URL=ws://localhost:3001
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_PRODUCTION_MODE=false
NEXT_PUBLIC_ENABLE_VOICE_CHAT=true
```

Local development
-----------------
1. Install dependencies

```powershell
npm install
```

2a. Frontend only

```powershell
npm run dev
```

2b. Backend only (server folder)

```powershell
cd server
npm install
npm start
```

2c. Frontend + backend concurrently

```powershell
npm run dev:all
```

Available npm scripts
---------------------
- npm run dev         — Start Next.js in development mode
- npm run dev:server  — Start backend server from the `server/` folder
- npm run dev:all     — Frontend and backend concurrently (concurrently)
- npm run build       — Build Next.js app for production
- npm start           — Start the built Next.js app
- npm run lint        — Run ESLint
- npm run lint:fix    — Run ESLint with --fix
- npm run type-check  — Run TypeScript checks (tsc --noEmit)

Backend details
---------------
- Entry: `server/index.js`
- Socket handlers: `server/socket/socketHandlers.js` and `server/socket/voiceHandlers.js`
- Routes: `server/routes/*` (e.g., health checks, rooms)
- Middleware: `server/middleware/*` (CORS, rate limiting, validation, error handling)
- Tasks: scheduled cleanup jobs in `server/tasks/`

Frontend details
----------------
- Next.js app is under `app/` (app-router). Key pages: room list (`app/rooms`), room view (`app/rooms/[roomId]`), sponsor and sponsor pages.
- Components live in `components/` (shared UI and room-specific pieces under `components/room/`).
- Tailwind and design tokens are configured in `tailwind.config.ts`.

Testing & linting
-----------------
- Lint: `npm run lint` (uses Next.js ESLint config)
- TypeScript type-check: `npm run type-check` (tsc --noEmit)
- Tests: not present by default; add Jest/Playwright as needed

Build & deploy
--------------
1. Set production environment variables on your host or in deployment platform.
2. Build the app:

```powershell
npm run build
```

3. Start in production:

```powershell
npm start
```

If deploying alongside the backend, ensure your Socket.io server is reachable from the frontend (CORS and WebSocket URL configured via `NEXT_PUBLIC_SOCKET_URL`). Consider using a process manager (PM2) or containerization.

Docker
------
This repository includes a `Dockerfile` and `docker-compose.yml`. Use them to build and run containers for production or local debugging.

Security & operational notes
----------------------------
- Do not commit `.env.local` or any secret keys. Add them to your CI/CD secrets manager.
- Rate limiting and input validation exist on the server; review `server/middleware` before exposing to public traffic.
- Enable TLS/WSS in production; set `NEXT_PUBLIC_SOCKET_URL` to a secure endpoint.

Troubleshooting
---------------
- Build errors: run `npm run type-check` to catch TypeScript issues.
- YouTube API errors: ensure your API key is valid and the API is enabled in Google Cloud Console.
- Socket issues: check `NEXT_PUBLIC_SOCKET_URL`, server logs (`server/logs/`) and CORS middleware.

Contributing
------------
- Fork the repository and create feature branches.
- Keep PRs small and focused. Include a description and testing steps.
- Run lint and type checks locally before opening PRs.

Contact & support
-----------------
- For questions or issues, open a GitHub issue in this repository.

License
-------
- MIT

EOF