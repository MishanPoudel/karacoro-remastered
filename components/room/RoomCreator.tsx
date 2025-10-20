"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUpRight, Loader2, Shield } from 'lucide-react';
import { generateRoomId, validateRoomId } from '@/lib/room-utils';
import { toast } from 'sonner';

interface RoomCreatorProps {
  className?: string;
}

export function RoomCreator({ className = '' }: RoomCreatorProps) {
  const [roomName, setRoomName] = useState('');
  const [customRoomId, setCustomRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
          password: password.trim() || undefined,
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
      
      console.log('✅ Room created:', roomData); // Debug log
      
      // Store password in sessionStorage if set
      if (password.trim()) {
        sessionStorage.setItem(`room_password_${roomId}`, password.trim());
        console.log('🔒 Password stored for room:', roomId); // Debug log
      }
      
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
    <div className={`bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-800/95 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6 hover:scale-105 transition-all duration-300 hover:border-red-500/60 hover:shadow-2xl hover:shadow-red-500/30 ${className}`}>
      <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
        Create a Room
      </h3>
      
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
            className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl transition-all"
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
            className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl transition-all"
            disabled={isLoading}
            maxLength={6}
          />
          <p className="text-xs text-gray-400 mt-1">
            Leave empty to auto-generate a room ID
          </p>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-400" />
              Room Password (Optional)
            </div>
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Leave empty for public room"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl transition-all pr-10"
              disabled={isLoading}
            />
            {password && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Set a password to make your room private
          </p>
        </div>

        <Button
          onClick={handleCreateRoom}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 transition-all duration-200 hover:shadow-2xl hover:shadow-red-500/40 hover:scale-105 rounded-xl"
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