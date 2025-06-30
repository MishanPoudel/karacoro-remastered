"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Crown, Users, Edit3, Check, X, Mic, MicOff, Volume2 } from 'lucide-react';
import { User } from '@/hooks/useSocket';
import { VoiceParticipant } from '@/components/room/VoiceChat';
import { toast } from 'sonner';

interface UserPanelProps {
  users: User[];
  currentUsername: string;
  isHost: boolean;
  onChangeUsername: (newUsername: string) => void;
  voiceParticipants?: VoiceParticipant[];
}

export function UserPanel({ users, currentUsername, isHost, onChangeUsername, voiceParticipants = [] }: UserPanelProps) {
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

  const handleCancelEdit = () => {
    setNewUsername(currentUsername);
    setIsEditingUsername(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUsernameChange();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Get voice info for a user
  const getUserVoiceInfo = (username: string) => {
    return voiceParticipants.find(p => p.id === username);
  };

  const getConnectionQualityColor = (quality?: 'good' | 'medium' | 'poor') => {
    switch (quality) {
      case 'good': return 'bg-green-400';
      case 'medium': return 'bg-yellow-400';
      case 'poor': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <Card className="bg-gray-800 border-red-500/30">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-red-500" />
            Participants ({users.length})
          </h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white">
                <Edit3 className="w-3 h-3 mr-1" />
                Edit Name
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-red-500">
              <DialogHeader>
                <DialogTitle className="text-white">Change Username</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    New Username
                  </label>
                  <Input
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Enter new username"
                    maxLength={20}
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    2-20 characters • {newUsername.length}/20
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleUsernameChange}
                    className="flex-1 bg-red-500 hover:bg-red-600"
                    disabled={!newUsername.trim() || newUsername.trim() === currentUsername}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ScrollArea className="h-64">
        <div className="p-4 space-y-3">
          {users.map((user) => {
            const voiceInfo = getUserVoiceInfo(user.username);
            const isInVoice = !!voiceInfo;
            const isSpeaking = voiceInfo?.isSpeaking || false;
            const isMuted = voiceInfo?.isMuted ?? true;
            
            return (
              <div
                key={user.socketId}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                  user.username === currentUsername 
                    ? 'bg-red-500/20 border border-red-500/30' 
                    : 'bg-gray-700/50 hover:bg-gray-700/70'
                } ${isSpeaking ? 'ring-2 ring-green-400/50 animate-pulse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white transition-all duration-200 ${
                  isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}>
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
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-400">
                      {user.isHost ? 'Host' : 'Participant'}
                    </p>
                    {isInVoice && (
                      <div className="flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-blue-400" />
                        <span className="text-xs text-blue-400">Voice</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Voice Status Indicators */}
                <div className="flex items-center gap-1">
                  {isInVoice && (
                    <>
                      {/* Microphone Status */}
                      <div className={`p-1 rounded ${isMuted ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                        {isMuted ? (
                          <MicOff className="w-3 h-3 text-red-400" />
                        ) : (
                          <Mic className={`w-3 h-3 ${isSpeaking ? 'text-green-300' : 'text-green-400'}`} />
                        )}
                      </div>

                      {/* Connection Quality */}
                      {voiceInfo?.connectionQuality && (
                        <div className={`w-2 h-2 rounded-full ${getConnectionQualityColor(voiceInfo.connectionQuality)}`} />
                      )}

                      {/* Speaking Indicator */}
                      {isSpeaking && (
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-3 bg-green-400 rounded animate-pulse" />
                          <div className="w-1 h-4 bg-green-400 rounded animate-pulse" style={{ animationDelay: '0.1s' }} />
                          <div className="w-1 h-2 bg-green-400 rounded animate-pulse" style={{ animationDelay: '0.2s' }} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}