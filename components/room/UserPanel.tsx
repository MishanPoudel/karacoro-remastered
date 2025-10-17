"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Crown, Users, Edit3, Check, X, Mic, MicOff, Volume2 } from 'lucide-react';
import { User } from '@/hooks/useSocket';
import { toast } from 'sonner';

interface UserPanelProps {
  users: User[];
  currentUsername: string;
  isHost: boolean;
}

export function UserPanel({ users, currentUsername, isHost }: UserPanelProps) {
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(currentUsername);

  const handleUsernameChange = () => {
    if (!newUsername.trim()) {
      toast.error('Username cannot be empty');
      return;
    }

    if (newUsername.trim().length < 2 || newUsername.trim().length > 20) {
      toast.error('Username must be 2-20 characters long');
      return;
    }

    if (newUsername.trim() === currentUsername) {
      setIsEditingUsername(false);
      return;
    }

    onChangeUsername(newUsername.trim());
    setIsEditingUsername(false);
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border-red-500/30 shadow-2xl">
      <div className="p-4 border-b border-red-500/20 bg-gradient-to-r from-red-500/10 to-transparent">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <div className="p-1.5 bg-red-500/20 rounded-lg">
              <Users className="w-5 h-5 text-red-400" />
            </div>
            Participants
            <span className="text-sm text-gray-400 font-normal ml-auto bg-gray-700/50 px-2 py-0.5 rounded-full">
              {users.length}
            </span>
          </h3>
        </div>
      </div>

      <ScrollArea className="h-64">
        <div className="p-4 space-y-2">
          {users.map((user) => {
            const isCurrentUser = user.username === currentUsername;
            return (
              <div
                key={user.socketId}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                  isCurrentUser 
                    ? 'bg-gradient-to-r from-red-500/30 to-red-600/20 border border-red-500/40 shadow-lg shadow-red-500/10' 
                    : 'bg-gray-700/30 hover:bg-gray-700/50 border border-transparent hover:border-gray-600/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white relative ${
                  user.isHost 
                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/30' 
                    : 'bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/20'
                }`}>
                  {user.username.charAt(0).toUpperCase()}
                  {user.isHost && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5">
                      <Crown className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold truncate ${
                      user.isHost ? 'text-yellow-400' : 'text-white'
                    }`}>
                      {user.username}
                    </span>
                    {isCurrentUser && (
                      <span className="text-xs text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">You</span>
                    )}
                  </div>
                  <p className={`text-xs ${user.isHost ? 'text-yellow-300/70' : 'text-gray-400'}`}>
                    {user.isHost ? '👑 Room Host' : 'Participant'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}

function onChangeUsername(arg0: string) {
  throw new Error('Function not implemented.');
}
