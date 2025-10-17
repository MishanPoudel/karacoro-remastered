"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  Music,
  MessageCircle,
  Crown,
  Wifi,
  WifiOff,
  Copy,
  Check,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSocket } from "@/hooks/useSocket";
import { JoinRoomDialog } from "@/components/room/JoinRoomDialog";

// OPTIMIZATION: Dynamic imports for heavy components to reduce initial bundle size
const VideoPlayer = dynamic(
  () =>
    import("@/components/room/VideoPlayer").then((mod) => ({
      default: mod.VideoPlayer,
    })),
  {
    loading: () => (
      <Card className="bg-gray-800/95 backdrop-blur-sm border-gray-700">
        <div className="aspect-video bg-gray-700/50 animate-pulse rounded-lg m-4" />
        <div className="p-4 space-y-2">
          <div className="h-4 bg-gray-700/50 animate-pulse rounded w-3/4" />
          <div className="h-3 bg-gray-700/50 animate-pulse rounded w-1/2" />
        </div>
      </Card>
    ),
    ssr: false, // YouTube API doesn't work on server
  }
);

const VideoQueue = dynamic(
  () =>
    import("@/components/room/VideoQueue").then((mod) => ({
      default: mod.VideoQueue,
    })),
  {
    loading: () => (
      <Card className="bg-gray-800/95 backdrop-blur-sm border-gray-700">
        <div className="p-4 space-y-4">
          <div className="h-6 bg-gray-700/50 animate-pulse rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
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
    ssr: false,
  }
);

const ChatPanel = dynamic(
  () =>
    import("@/components/room/ChatPanel").then((mod) => ({
      default: mod.ChatPanel,
    })),
  {
    loading: () => (
      <Card className="bg-gray-800/95 backdrop-blur-sm border-gray-700">
        <div className="p-4 space-y-4">
          <div className="h-5 bg-gray-700/50 animate-pulse rounded w-1/4" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
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
    ssr: false,
  }
);

const UserPanel = dynamic(
  () =>
    import("@/components/room/UserPanel").then((mod) => ({
      default: mod.UserPanel,
    })),
  {
    loading: () => (
      <Card className="bg-gray-800/95 backdrop-blur-sm border-gray-700">
        <div className="p-4 space-y-3">
          <div className="h-5 bg-gray-700/50 animate-pulse rounded w-1/3" />
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2 bg-gray-700/30 rounded-lg"
            >
              <div className="w-8 h-8 bg-gray-600/50 animate-pulse rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-600/50 animate-pulse rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    ),
    ssr: false,
  }
);

const VoiceChat = dynamic(
  () =>
    import("@/components/room/VoiceChat").then((mod) => ({
      default: mod.VoiceChat,
    })),
  {
    loading: () => (
      <Card className="bg-gray-800/95 backdrop-blur-sm border-gray-700">
        <div className="p-4">
          <div className="h-5 bg-gray-700/50 animate-pulse rounded w-1/3 mb-3" />
          <div className="h-10 bg-gray-600/50 animate-pulse rounded" />
        </div>
      </Card>
    ),
    ssr: false,
  }
);

export default function RoomPage() {
  // Persistent userId logic
  const getOrCreateUserId = () => {
    let userId = localStorage.getItem("userId");
    if (!userId) {
      userId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2);
      localStorage.setItem("userId", userId);
    }
    return userId;
  };

  const params = useParams();
  const roomId = params.roomId as string;
  const [showJoinDialog, setShowJoinDialog] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [roomHasPassword, setRoomHasPassword] = useState(false);

  // Check if room is password protected
  useEffect(() => {
    const checkRoomPassword = async () => {
      try {
        const response = await fetch(`/api/rooms/check?roomId=${roomId}`);
        const data = await response.json();
        if (data.exists && data.room?.hasPassword) {
          setRoomHasPassword(true);
        }
      } catch (error) {
        console.error('Error checking room password:', error);
      }
    };

    if (roomId) {
      checkRoomPassword();
    }
  }, [roomId]);

  // Initialize userId on mount
  useEffect(() => {
    setUserId(getOrCreateUserId());
  }, []);

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
      setCopied(true);
      toast.success("Room ID copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy room ID");
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
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-900 text-white">
      <div className="container mx-auto px-4 py-6 max-w-[1920px]">
        {/* Header with Glass Effect - Enhanced Design */}
        <div className="mb-6 bg-gradient-to-br from-black/60 via-black/40 to-red-900/20 backdrop-blur-xl rounded-2xl p-3 md:p-4 border border-red-500/30 shadow-2xl shadow-red-900/20">
          {/* Mobile Layout - Clean Two-Row Design */}
          <div className="flex flex-col gap-2 md:hidden">
            {/* Row 1: Leave + Status Badges */}
            <div className="flex items-center justify-between">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/30 text-red-400 hover:from-red-500 hover:to-red-600 hover:text-white hover:border-red-500 transition-all duration-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  <span className="text-xs font-semibold">Back</span>
                </Button>
              </Link>

              {/* Status Badges Group */}
              <div className="flex items-center gap-2">
                {/* User Count */}
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500/15 to-blue-600/15 text-blue-400 px-2.5 py-1 rounded-lg border border-blue-500/30 shadow-lg shadow-blue-900/10">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">{roomState.users.length}</span>
                </div>

                {/* Room Privacy Status - Lock/Unlock */}
                {roomHasPassword ? (
                  <div 
                    className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500/15 to-purple-600/15 text-purple-400 px-2.5 py-1 rounded-lg border border-purple-500/30 shadow-lg shadow-purple-900/10"
                    title="Private Room - Password Protected"
                  >
                    <span className="text-sm">🔒</span>
                    <span className="text-xs font-bold">Private</span>
                  </div>
                ) : (
                  <div 
                    className="flex items-center gap-1.5 bg-gradient-to-r from-green-500/15 to-green-600/15 text-green-400 px-2.5 py-1 rounded-lg border border-green-500/30 shadow-lg shadow-green-900/10"
                    title="Public Room - Anyone Can Join"
                  >
                    <span className="text-sm">🔓</span>
                    <span className="text-xs font-bold">Public</span>
                  </div>
                )}

                {/* Connection + Host Combined */}
                <div className="flex items-center gap-1.5">
                  {roomState.connected ? (
                    <div className="relative bg-gradient-to-r from-green-500/15 to-green-600/15 border border-green-500/30 rounded-lg p-1.5 shadow-lg shadow-green-900/10">
                      <Wifi className="w-3.5 h-3.5 text-green-400" />
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-red-500/15 to-red-600/15 border border-red-500/30 rounded-lg p-1.5 shadow-lg shadow-red-900/10">
                      <WifiOff className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                    </div>
                  )}

                  {roomState.isHost && (
                    <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40 rounded-lg p-1.5 shadow-lg shadow-yellow-900/20">
                      <Crown className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Title + Room Code */}
            <div className="flex items-center justify-between bg-gradient-to-r from-red-900/20 via-red-800/10 to-red-900/20 border border-red-500/20 rounded-xl p-2.5">
              {/* Title */}
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-red-500/30 to-red-600/30 p-1.5 rounded-lg border border-red-500/40">
                  <Music className="w-4 h-4 text-red-300 animate-pulse" />
                </div>
                <h1 className="text-base font-bold bg-gradient-to-r from-white via-red-100 to-red-200 bg-clip-text text-transparent">
                  Karaoke Room
                </h1>
              </div>

              {/* Room Code */}
              <button
                onClick={handleCopyRoomId}
                className="group flex items-center gap-1.5 bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 border border-red-500/30 hover:border-red-400/50 rounded-lg px-2.5 py-1.5 transition-all duration-300 shadow-lg shadow-red-900/20"
                title="Tap to copy"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs font-semibold text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-red-300 group-hover:text-red-200" />
                    <span className="text-xs font-mono text-red-300 group-hover:text-red-200 truncate max-w-[80px]">
                      {roomId}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Desktop Layout - Enhanced */}
          <div className="hidden md:flex items-center justify-between gap-4">
            {/* Left: Leave Button */}
            <Link href="/" className="flex-shrink-0">
              <Button
                variant="outline"
                className="group border-red-500/40 bg-red-500/5 text-red-400 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 hover:text-white hover:border-red-500 transition-all duration-300 shadow-lg shadow-red-900/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                Leave Room
              </Button>
            </Link>

            {/* Center: Title + Room ID */}
            <div className="text-center flex-1 space-y-2">
              <div className="flex items-center justify-center gap-2.5">
                <Music className="w-5 h-5 text-red-400 animate-pulse" />
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-red-100 to-red-300 bg-clip-text text-transparent">
                  Karaoke Room
                </h1>
                <Music className="w-5 h-5 text-red-400 animate-pulse" />
              </div>

              <button
                onClick={handleCopyRoomId}
                className="group inline-flex items-center gap-2 font-mono text-sm bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-lg px-3 py-1.5 transition-all duration-300"
                title="Click to copy room ID"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-semibold">
                      Copied!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-red-400 group-hover:text-red-300" />
                    <span className="text-gray-400">Room ID:</span>
                    <span className="text-red-400 group-hover:text-red-300">
                      {roomId}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Right: Status Badges */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {/* User Count */}
              <div className="flex items-center gap-2 text-sm bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20">
                <Users className="w-4 h-4" />
                <span className="font-semibold">{roomState.users.length}</span>
                <span className="hidden lg:inline text-xs text-blue-300">
                  Online
                </span>
              </div>

              {/* Room Privacy Status - Lock/Unlock */}
              {roomHasPassword ? (
                <div 
                  className="flex items-center gap-2 text-sm bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-lg border border-purple-500/20"
                  title="Private Room - Password Protected"
                >
                  <span className="text-base">🔒</span>
                  <span className="hidden lg:inline font-medium">Private</span>
                </div>
              ) : (
                <div 
                  className="flex items-center gap-2 text-sm bg-green-500/10 text-green-400 px-3 py-1.5 rounded-lg border border-green-500/20"
                  title="Public Room - Anyone Can Join"
                >
                  <span className="text-base">🔓</span>
                  <span className="hidden lg:inline font-medium">Public</span>
                </div>
              )}

              {/* Connection Status */}
              {roomState.connected ? (
                <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                  <div className="relative">
                    <Wifi className="w-4 h-4" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                  </div>
                  <span className="hidden lg:inline font-medium">
                    Connected
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
                  <WifiOff className="w-4 h-4 animate-pulse" />
                  <span className="hidden lg:inline font-medium">Offline</span>
                </div>
              )}

              {/* Host Badge */}
              {roomState.isHost && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 text-sm px-3 py-1.5 rounded-lg border border-yellow-500/30 shadow-lg shadow-yellow-900/20">
                  <Crown className="w-4 h-4 animate-pulse" />
                  <span className="hidden lg:inline font-bold">Host</span>
                </div>
              )}
            </div>
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

            {/* Chat with fixed height using viewport calculations */}
            <div className="h-[calc(100vh-32rem)] min-h-[400px] max-h-[600px]">
              <ChatPanel
                messages={roomState.chatHistory}
                onSendMessage={sendChatMessage}
                currentUserId={userId}
              />
            </div>
          </div>
        </div>

        {/* Mobile-only tabs with Better Styling */}
        <div className="lg:hidden mt-6">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800/50 backdrop-blur-xl border border-red-500/20 p-1 rounded-xl">
              <TabsTrigger
                value="chat"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white rounded-lg transition-all"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white rounded-lg transition-all"
              >
                <Users className="w-4 h-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger
                value="voice"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white rounded-lg transition-all"
              >
                <Music className="w-4 h-4 mr-2" />
                Voice
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-4">
              {/* Chat with fixed height for mobile */}
              <div className="h-[calc(100vh-20rem)] min-h-[400px] max-h-[550px]">
                <ChatPanel
                  messages={roomState.chatHistory}
                  onSendMessage={sendChatMessage}
                  currentUserId={userId}
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
