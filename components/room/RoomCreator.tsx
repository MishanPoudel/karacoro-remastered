"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { generateRoomId, validateRoomId } from '@/lib/room-utils';
import { toast } from 'sonner';

interface RoomCreatorProps {
  className?: string;
}

export function RoomCreator({ className = '' }: RoomCreatorProps) {
  const [roomName, setRoomName] = useState('');
  const [customRoomId, setCustomRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    setIsLoading(true);

    try {
      // Generate or use custom room ID
      let roomId = customRoomId.trim().toUpperCase();
      
      if (!roomId) {
        roomId = generateRoomId();
      } else if (!validateRoomId(roomId)) {
        toast.error('Room ID must be 6 uppercase alphanumeric characters');
        setIsLoading(false);
        return;
      }

      // Create the room directly without checking
      const createResponse = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          name: roomName.trim(),
        }),
      });

      if (!createResponse.ok) {
        let errorMessage = 'Failed to create room';
        try {
          const errorText = await createResponse.text();
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If parsing fails, use generic message
        }
        throw new Error(errorMessage);
      }

      const roomData = await createResponse.json();
      
      toast.success(`Room "${roomData.name}" created successfully!`);
      
      // Redirect to the room
      router.push(`/rooms/${roomId}`);
      
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-gray-900/90 backdrop-blur-sm border border-red-500/30 rounded-lg p-6 hover:scale-105 transition-all duration-300 hover:border-red-500/60 hover:shadow-lg hover:shadow-red-500/20 ${className}`}>
      <h3 className="text-2xl font-bold mb-6 text-white">Create a Room</h3>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="roomName" className="block text-sm font-medium text-gray-300 mb-2">
            Room Name *
          </label>
          <Input
            id="roomName"
            type="text"
            placeholder="Enter room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500/20"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="customRoomId" className="block text-sm font-medium text-gray-300 mb-2">
            Custom Room ID (Optional)
          </label>
          <Input
            id="customRoomId"
            type="text"
            placeholder="6 characters (auto-generated if empty)"
            value={customRoomId}
            onChange={(e) => setCustomRoomId(e.target.value.toUpperCase().slice(0, 6))}
            className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500/20"
            disabled={isLoading}
            maxLength={6}
          />
          <p className="text-xs text-gray-400 mt-1">
            Leave empty to auto-generate a room ID
          </p>
        </div>

        <Button
          onClick={handleCreateRoom}
          disabled={isLoading}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/30"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Room...
            </>
          ) : (
            <>
              Create Room
              <ArrowUpRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}