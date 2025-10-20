"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Users, Copy, Check, Shield } from 'lucide-react';
import { validateRoomId } from '@/lib/room-utils';
import { toast } from 'sonner';

interface JoinRoomDialogProps {
  isOpen: boolean;
  roomId: string;
  onJoin: (username: string) => void;
}

export function JoinRoomDialog({ isOpen, roomId, onJoin }: JoinRoomDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [roomHasPassword, setRoomHasPassword] = useState(false);
  const [isCheckingPassword, setIsCheckingPassword] = useState(true); // NEW

  useEffect(() => {
    const savedUsername = localStorage.getItem('karaoke_username');
    if (savedUsername) {
      setUsername(savedUsername);
    }

    // Check if there's a stored password for this room (creator scenario)
    const storedPassword = sessionStorage.getItem(`room_password_${roomId}`);
    if (storedPassword) {
      setPassword(storedPassword);
    }

    // Check if room requires password
    const checkRoomPassword = async () => {
      setIsCheckingPassword(true); // Start checking
      try {
        const response = await fetch(`/api/rooms/check?roomId=${roomId}`);
        const data = await response.json();
        if (data.exists && data.room?.hasPassword) {
          setRoomHasPassword(true);
          setShowPasswordField(true);
        }
      } catch (error) {
        console.error('Error checking room password:', error);
      } finally {
        setIsCheckingPassword(false); // Done checking
      }
    };

    if (roomId) {
      checkRoomPassword();
    }
  }, [roomId]);

  const handleJoin = async () => {
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    if (username.trim().length < 2 || username.trim().length > 20) {
      toast.error('Username must be 2-20 characters long');
      return;
    }

    if (!validateRoomId(roomId)) {
      toast.error('Invalid room ID');
      return;
    }

    setIsJoining(true);
    
    try {
      // Double-check room password requirement
      const checkResponse = await fetch(`/api/rooms/check?roomId=${roomId}`);
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        
        if (checkData.exists && checkData.room?.hasPassword) {
          if (!password.trim()) {
            toast.error('Please enter the room password');
            setIsJoining(false);
            return;
          }

          // Verify password
          const verifyResponse = await fetch('/api/rooms/check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              roomId,
              password: password.trim(),
            }),
          });

          if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json();
            toast.error(errorData.error || 'Incorrect password');
            setIsJoining(false);
            return;
          }

          // Store password in sessionStorage for reconnections
          sessionStorage.setItem(`room_password_${roomId}`, password.trim());
        }
      }

      localStorage.setItem('karaoke_username', username.trim());
      
      // Add a small delay to show the joining state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onJoin(username.trim());
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
      setIsJoining(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isJoining) {
      handleJoin();
    }
  };

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      toast.success('Room ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy room ID');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="bg-gray-900 border-red-500 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-red-500" />
            Join Karaoke Room
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <div 
              className="bg-gray-800 p-3 rounded font-mono text-lg tracking-wider border border-red-500/30 text-white cursor-pointer hover:bg-gray-700 transition-all duration-200 group relative"
              onClick={handleCopyRoomId}
              title="Click to copy room ID"
            >
              <div className="flex items-center justify-center gap-2">
                {roomId}
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors duration-200" />
                )}
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-2">Room ID (Click to copy)</p>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Choose a Username *
            </label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500/20"
              disabled={isJoining}
              maxLength={20}
              autoFocus={!roomHasPassword}
            />
            <p className="text-xs text-gray-400 mt-1">
              2-20 characters • {username.length}/20
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
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500/20 pr-10"
                  disabled={isJoining}
                  autoFocus={roomHasPassword}
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
            onClick={handleJoin}
            disabled={isJoining || !username.trim() || isCheckingPassword}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCheckingPassword ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking room...
              </>
            ) : isJoining ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining Room...
              </>
            ) : (
              'Join Room'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}