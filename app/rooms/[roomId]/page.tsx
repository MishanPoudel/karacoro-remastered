"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Music, MessageCircle, Crown, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';
import { JoinRoomDialog } from '@/components/room/JoinRoomDialog';
import { VideoPlayer } from '@/components/room/VideoPlayer';
import { VideoQueue } from '@/components/room/VideoQueue';
import { ChatPanel } from '@/components/room/ChatPanel';
import { UserPanel } from '@/components/room/UserPanel';

export default function RoomPage() {
  // Persistent userId logic
  const getOrCreateUserId = () => {
    let userId = typeof window !== 'undefined' ? sessionStorage.getItem('userId') : null;
    if (!userId) {
      userId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('userId', userId);
      }
    }
    return userId;
  };

  const params = useParams();
  const roomId = params.roomId as string;
  const [showJoinDialog, setShowJoinDialog] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);

  const {
    roomState,
    joinRoom,
    sendChatMessage,
    addToQueue,
    removeFromQueue,
    updateVideoState,
    skipVideo,
    videoEnded,
  } = useSocket();

  useEffect(() => {
    if (roomState.roomId && roomState.username) {
      setHasJoined(true);
      setShowJoinDialog(false);
    } else if (typeof window !== 'undefined') {
      // Auto-rejoin if we have stored username for this room
      const storedUsername = sessionStorage.getItem(`room_${roomId}_username`);
      if (storedUsername) {
        handleJoinRoom(storedUsername);
      }
    }
  }, [roomState.roomId, roomState.username, roomId]);

  const handleJoinRoom = (username: string) => {
    const userId = getOrCreateUserId();
    
    // Store username for this room
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`room_${roomId}_username`, username);
    }
    
    joinRoom(roomId, username, userId);
    setHasJoined(true);
    setShowJoinDialog(false);
  };

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('Room ID copied to clipboard!');
    } catch {
      toast.error('Failed to copy room ID');
    }
  };

  if (!hasJoined) {
    return (
      <JoinRoomDialog
        isOpen={showJoinDialog}
        roomId={roomId}
        onJoin={handleJoinRoom}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-xs sm:text-sm h-8 sm:h-10"
            >
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Leave Room
            </Button>
          </Link>

          <div className="text-center flex-1 sm:flex-none">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Karaoke Room</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-gray-400 text-xs sm:text-sm">Room ID:</span>
              <button
                onClick={handleCopyRoomId}
                className="font-mono text-red-500 hover:text-red-400 transition-colors text-xs sm:text-sm"
              >
                {roomId}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Connection Status */}
            {roomState.connected ? (
              <div className="flex items-center gap-1 text-green-400 text-xs sm:text-sm">
                <Wifi className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-400 text-xs sm:text-sm">
                <WifiOff className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Disconnected</span>
              </div>
            )}

            {/* Host Badge */}
            {roomState.isHost && (
              <div className="flex items-center gap-1 text-yellow-500 text-xs sm:text-sm">
                <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Host</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid lg:grid-cols-12 gap-4 sm:gap-6">
          <div className="lg:col-span-8 space-y-4 sm:space-y-6">
            <VideoPlayer
              currentVideo={roomState.currentVideo}
              videoState={roomState.videoState}
              isHost={roomState.isHost}
              onVideoStateChange={updateVideoState}
              onVideoEnd={videoEnded}
              onSkip={skipVideo}
            />

            <VideoQueue
              queue={roomState.queue}
              isHost={roomState.isHost}
              onAddToQueue={addToQueue}
              onRemoveFromQueue={removeFromQueue}
            />
          </div>

          {/* Right Sidebar - Voice Chat, Users and Chat (Desktop Only) */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-6 hidden lg:block">
            <UserPanel
              users={roomState.users}
              currentUsername={roomState.username}
              isHost={roomState.isHost}
            />

            <div className="h-96">
              <ChatPanel
                messages={roomState.chatHistory}
                onSendMessage={sendChatMessage}
              />
            </div>
          </div>
        </div>

        {/* Mobile-only tabs */}
        <div className="lg:hidden mt-4 sm:mt-6">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10 sm:h-12">
              <TabsTrigger value="chat" className="text-xs sm:text-sm">
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Chat ({roomState.chatHistory.length})
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Users ({roomState.users.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-3 sm:mt-4">
              <div className="h-64 sm:h-80">
                <ChatPanel
                  messages={roomState.chatHistory}
                  onSendMessage={sendChatMessage}
                />
              </div>
            </TabsContent>

            <TabsContent value="users" className="mt-3 sm:mt-4">
              <UserPanel
                users={roomState.users}
                currentUsername={roomState.username}
                isHost={roomState.isHost}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}