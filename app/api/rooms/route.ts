import { NextRequest, NextResponse } from 'next/server';
import { roomStorage } from '@/lib/room-storage';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, name, password } = body;

    // Validate input
    if (!roomId || !name) {
      return NextResponse.json(
        { error: 'Room ID and name are required' },
        { status: 400 }
      );
    }

    // Check if room already exists
    if (roomStorage.hasRoom(roomId)) {
      return NextResponse.json(
        { error: 'Room already exists' },
        { status: 409 }
      );
    }

    // Create room
    const room = roomStorage.createRoom(roomId, name, password);

    // Return room without password
    const safeRoom = roomStorage.getSafeRoom(roomId);
    return NextResponse.json(safeRoom, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return all rooms (for debugging purposes)
  const allRooms = roomStorage.getAllRooms().map(room => roomStorage.getSafeRoom(room.roomId));
  return NextResponse.json({ rooms: allRooms });
}