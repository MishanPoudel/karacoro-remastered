"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUpRight, Loader2, Shield } from 'lucide-react';
import { validateRoomId } from '@/lib/room-utils';
import { toast } from 'sonner';

interface RoomJoinerProps {
  className?: string;
}

export function RoomJoiner({ className = '' }: RoomJoinerProps) {
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      // Check if room exists and if it needs a password (optional check)
      const checkResponse = await fetch(`/api/rooms/check?roomId=${trimmedRoomId}`);
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();

        // If room exists and has password
        if (checkData.exists && checkData.room?.hasPassword) {
          // If we haven't shown the password field yet
          if (!showPasswordField) {
            setShowPasswordField(true);
            setIsLoading(false);
            toast.info('This room is password protected');
            return;
          }

          // Verify password
          const verifyResponse = await fetch('/api/rooms/check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              roomId: trimmedRoomId,
              password: password.trim(),
            }),
          });

          if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json();
            toast.error(errorData.error || 'Incorrect password');
            setIsLoading(false);
            return;
          }
        }
      }
      // If room doesn't exist in API, it will be created when joining via Socket.io

      toast.success(`Joining room ${trimmedRoomId}...`);
      
      // Store password in sessionStorage for the room page to use
      if (password.trim()) {
        sessionStorage.setItem(`room_password_${trimmedRoomId}`, password.trim());
      }
      
      // Redirect to the room
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
    <div className={`bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-800/95 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6 hover:scale-105 transition-all duration-300 hover:border-red-500/60 hover:shadow-2xl hover:shadow-red-500/30 ${className}`}>
      <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
        Join a Room
      </h3>
      
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
            className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl transition-all"
            disabled={isLoading}
            maxLength={6}
          />
          <p className="text-xs text-gray-400 mt-1">
            Enter the 6-character room code
          </p>
        </div>

        {showPasswordField && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label htmlFor="passwordInput" className="block text-sm font-medium text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-400" />
                Room Password *
              </div>
            </label>
            <div className="relative">
              <Input
                id="passwordInput"
                type={showPassword ? "text" : "password"}
                placeholder="Enter room password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl transition-all pr-10"
                disabled={isLoading}
                autoFocus
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
              This room is password protected
            </p>
          </div>
        )}

        <Button
          onClick={handleJoinRoom}
          disabled={isLoading || !roomId.trim()}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 transition-all duration-200 hover:shadow-2xl hover:shadow-red-500/40 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
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