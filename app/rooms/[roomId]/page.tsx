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
import { VoiceChat } from '@/components/room/VoiceChat';

export default function RoomPage() {
  // Persistent userId logic
  const getOrCreateUserId = () => {
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2);
      localStorage.setItem('userId', userId);
    }
    return userId;
  };

  const params = useParams();
  const roomId = params.roomId as string;
  const [showJoinDialog, setShowJoinDialog] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);

  const {
    roomState,
    socket,
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
    }
  }, [roomState.roomId, roomState.username]);

  const handleJoinRoom = (username: string) => {
    const userId = getOrCreateUserId();
    joinRoom(roomId, username, userId); // Pass userId to joinRoom
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
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="container mx-auto px-4 py-6 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 overflow-hidden">
          <Link href="/">
            <Button
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Leave Room
            </Button>
          </Link>

          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold">Karaoke Room</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-gray-400">Room ID:</span>
              <button
                onClick={handleCopyRoomId}
                className="font-mono text-red-500 hover:text-red-400 transition-colors"
              >
                {roomId}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Status */}
            {roomState.connected ? (
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <Wifi className="w-4 h-4" />
                Connected
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-400 text-sm">
                <WifiOff className="w-4 h-4" />
                Disconnected
              </div>
            )}

            {/* Host Badge */}
            {roomState.isHost && (
              <div className="flex items-center gap-1 text-yellow-500 text-sm">
                <Crown className="w-4 h-4" />
                Host
              </div>
            )}
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid lg:grid-cols-12 gap-6 overflow-hidden">
          {/* Left Column - Video Player and Queue */}
          <div className="lg:col-span-8 space-y-6 min-w-0 overflow-hidden">
            <VideoPlayer
              currentVideo={roomState.currentVideo}
              videoState={roomState.videoState}
              isHost={roomState.isHost}
              onVideoStateChange={updateVideoState}
              onVideoEnd={videoEnded}
              onSkip={skipVideo}
            />

            <div className="overflow-hidden">
              <VideoQueue
                queue={roomState.queue}
                isHost={roomState.isHost}
                onAddToQueue={addToQueue}
                onRemoveFromQueue={removeFromQueue}
              />
            </div>
          </div>

          {/* Right Sidebar - Voice Chat, Users and Chat (Desktop Only) */}
          <div className="lg:col-span-4 space-y-6 hidden lg:block min-w-0 overflow-hidden">
            <VoiceChat
              socket={socket}
              roomId={roomId}
              userId={getOrCreateUserId()}
            />
            
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
        <div className="lg:hidden mt-6 overflow-hidden">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-3 overflow-hidden">
              <TabsTrigger value="chat" className="overflow-hidden">
                <MessageCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="truncate">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="overflow-hidden">
                <Users className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="truncate">Users</span>
              </TabsTrigger>
              <TabsTrigger value="voice" className="overflow-hidden">
                <Music className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="truncate">Voice</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-4 overflow-hidden">
              <div className="h-80 overflow-hidden">
                <ChatPanel
                  messages={roomState.chatHistory}
                  onSendMessage={sendChatMessage}
                />
              </div>
            </TabsContent>

            <TabsContent value="users" className="mt-4">
              <UserPanel
                users={roomState.users}
                currentUsername={roomState.username}
                isHost={roomState.isHost}
              />
            </TabsContent>

            <TabsContent value="voice" className="mt-4">
              <VoiceChat
                socket={socket}
                roomId={roomId}
                userId={getOrCreateUserId()}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}