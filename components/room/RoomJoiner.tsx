"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { validateRoomId } from '@/lib/room-utils';
import { toast } from 'sonner';

interface RoomJoinerProps {
  className?: string;
}

export function RoomJoiner({ className = '' }: RoomJoinerProps) {
  const [roomId, setRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleJoinRoom = async () => {
    const trimmedRoomId = roomId.trim().toUpperCase();

    if (!trimmedRoomId) {
      toast.error('Please enter a room ID');
      return;
    }

    if (!validateRoomId(trimmedRoomId)) {
      toast.error('Room ID must be 6 uppercase alphanumeric characters');
      return;
    }

    setIsLoading(true);

    try {
      toast.success(`Joining room ${trimmedRoomId}...`);
      
      // Redirect to the room directly without checking
      router.push(`/rooms/${trimmedRoomId}`);
      
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleJoinRoom();
    }
  };

  return (
    <div className={`bg-gray-900/90 backdrop-blur-sm border border-red-500/30 rounded-lg p-6 hover:scale-105 transition-all duration-300 hover:border-red-500/60 hover:shadow-lg hover:shadow-red-500/20 ${className}`}>
      <h3 className="text-2xl font-bold mb-6 text-white">Join a Room</h3>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="roomIdInput" className="block text-sm font-medium text-gray-300 mb-2">
            Room ID *
          </label>
          <Input
            id="roomIdInput"
            type="text"
            placeholder="Enter 6-character room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase().slice(0, 6))}
            onKeyPress={handleKeyPress}
            className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500/20"
            disabled={isLoading}
            maxLength={6}
          />
          <p className="text-xs text-gray-400 mt-1">
            Enter the 6-character room code
          </p>
        </div>

        <Button
          onClick={handleJoinRoom}
          disabled={isLoading || !roomId.trim()}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Joining Room...
            </>
          ) : (
            <>
              Join Room
              <ArrowUpRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}