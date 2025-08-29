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
    <Card className="bg-gray-800 border-red-500/30">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-red-500" />
            Participants ({users.length})
          </h3>
        </div>
      </div>

      <ScrollArea className="h-64">
        <div className="p-4 space-y-3">
          {users.map((user) => {
            return (
              <div
                key={user.socketId}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  user.username === currentUsername 
                    ? 'bg-red-500/20 border border-red-500/30' 
                    : 'bg-gray-700/50 hover:bg-gray-700/70'
                }`}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white bg-red-500">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {user.username}
                      {user.username === currentUsername && (
                        <span className="text-xs text-gray-400 ml-1">(You)</span>
                      )}
                    </span>
                    {user.isHost && (
                      <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {user.isHost ? 'Host' : 'Participant'}
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