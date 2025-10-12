"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Music, MessageCircle, Crown, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';
import { JoinRoomDialog } from '@/components/room/JoinRoomDialog';

// OPTIMIZATION: Dynamic imports for heavy components to reduce initial bundle size
const VideoPlayer = dynamic(() => import('@/components/room/VideoPlayer').then(mod => ({ default: mod.VideoPlayer })), {
  loading: () => (
    <Card className="bg-gray-800/95 backdrop-blur-sm border-gray-700">
      <div className="aspect-video bg-gray-700/50 animate-pulse rounded-lg m-4" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-700/50 animate-pulse rounded w-3/4" />
        <div className="h-3 bg-gray-700/50 animate-pulse rounded w-1/2" />
      </div>
    </Card>
  ),
  ssr: false // YouTube API doesn't work on server
});

const VideoQueue = dynamic(() => import('@/components/room/VideoQueue').then(mod => ({ default: mod.VideoQueue })), {
  loading: () => (
    <Card className="bg-gray-800/95 backdrop-blur-sm border-gray-700">
      <div className="p-4 space-y-4">
        <div className="h-6 bg-gray-700/50 animate-pulse rounded w-1/3" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 p-3 bg-gray-700/30 rounded-lg">
              <div className="w-[120px] h-[67px] bg-gray-600/50 animate-pulse rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-600/50 animate-pulse rounded w-3/4" />
                <div className="h-3 bg-gray-600/50 animate-pulse rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  ),
  ssr: false
});

const ChatPanel = dynamic(() => import('@/components/room/ChatPanel').then(mod => ({ default: mod.ChatPanel })), {
  loading: () => (
    <Card className="bg-gray-800/95 backdrop-blur-sm border-gray-700">
      <div className="p-4 space-y-4">
        <div className="h-5 bg-gray-700/50 animate-pulse rounded w-1/4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-2">
              <div className="w-8 h-8 bg-gray-600/50 animate-pulse rounded-full" />
              <div className="flex-1">
                <div className="h-3 bg-gray-600/50 animate-pulse rounded w-1/3 mb-1" />
                <div className="h-4 bg-gray-600/50 animate-pulse rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  ),
  ssr: false
});

const UserPanel = dynamic(() => import('@/components/room/UserPanel').then(mod => ({ default: mod.UserPanel })), {
  loading: () => (
    <Card className="bg-gray-800/95 backdrop-blur-sm border-gray-700">
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-700/50 animate-pulse rounded w-1/3" />
        {[1, 2].map(i => (
          <div key={i} className="flex items-center gap-3 p-2 bg-gray-700/30 rounded-lg">
            <div className="w-8 h-8 bg-gray-600/50 animate-pulse rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-600/50 animate-pulse rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  ),
  ssr: false
});

const VoiceChat = dynamic(() => import('@/components/room/VoiceChat').then(mod => ({ default: mod.VoiceChat })), {
  loading: () => (
    <Card className="bg-gray-800/95 backdrop-blur-sm border-gray-700">
      <div className="p-4">
        <div className="h-5 bg-gray-700/50 animate-pulse rounded w-1/3 mb-3" />
        <div className="h-10 bg-gray-600/50 animate-pulse rounded" />
      </div>
    </Card>
  ),
  ssr: false
});

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
    joinRoom(roomId, username); // joinRoom only takes roomId and username
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
              username={roomState.username}
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
                username={roomState.username}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}