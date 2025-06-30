import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// In-memory storage for demo purposes
// In production, you would use a database
const rooms = new Map<string, { roomId: string; name: string; createdAt: Date }>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    const exists = rooms.has(roomId);
    const room = exists ? rooms.get(roomId) : null;

    return NextResponse.json({
      exists,
      room: room || null,
    });
  } catch (error) {
    console.error('Error checking room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}