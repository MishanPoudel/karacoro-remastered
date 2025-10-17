import { NextRequest, NextResponse } from 'next/server';
import { roomStorage } from '@/lib/room-storage';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

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

    const exists = roomStorage.hasRoom(roomId);
    const room = exists ? roomStorage.getSafeRoom(roomId) : null;

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, password } = body;

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    const room = roomStorage.getRoom(roomId);
    
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Check if room has password
    if (room.hasPassword) {
      if (!password) {
        return NextResponse.json(
          { error: 'Password required', requiresPassword: true },
          { status: 401 }
        );
      }

      if (!roomStorage.verifyPassword(roomId, password)) {
        return NextResponse.json(
          { error: 'Incorrect password', requiresPassword: true },
          { status: 403 }
        );
      }
    }

    // Password correct or no password required
    return NextResponse.json({
      success: true,
      message: 'Access granted'
    });
  } catch (error) {
    console.error('Error verifying password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}