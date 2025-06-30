import { NextResponse } from 'next/server';

export async function GET() {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    environment: process.env.NODE_ENV,
    services: {
      database: 'healthy', // Add actual database check
      youtube_api: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ? 'configured' : 'not_configured',
      socket_server: 'unknown', // Add actual socket server check
    }
  };

  return NextResponse.json(healthCheck);
}