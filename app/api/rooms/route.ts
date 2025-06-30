import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// In-memory storage for demo purposes
// In production, you would use a database
const rooms = new Map<string, { roomId: string; name: string; createdAt: Date }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, name } = body;

    // Validate input
    if (!roomId || !name) {
      return NextResponse.json(
        { error: 'Room ID and name are required' },
        { status: 400 }
      );
    }

    // Check if room already exists
    if (rooms.has(roomId)) {
      return NextResponse.json(
        { error: 'Room already exists' },
        { status: 409 }
      );
    }

    // Create room
    const room = {
      roomId,
      name: name.trim(),
      createdAt: new Date(),
    };

    rooms.set(roomId, room);

    return NextResponse.json(room, { status: 201 });
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
  const allRooms = Array.from(rooms.values());
  return NextResponse.json({ rooms: allRooms });
}