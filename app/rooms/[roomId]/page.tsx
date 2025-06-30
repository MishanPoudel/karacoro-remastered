"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Music, MessageCircle, Crown, Wifi, WifiOff, Mic, MicOff, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';
import { JoinRoomDialog } from '@/components/room/JoinRoomDialog';
import { VideoPlayer } from '@/components/room/VideoPlayer';
import { VideoQueue } from '@/components/room/VideoQueue';
import { ChatPanel } from '@/components/room/ChatPanel';
import { UserPanel } from '@/components/room/UserPanel';
import { VoiceChat, VoiceParticipant } from '@/components/room/VoiceChat';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [showJoinDialog, setShowJoinDialog] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [voiceParticipants, setVoiceParticipants] = useState<VoiceParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const {
    roomState,
    joinRoom,
    changeUsername,
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
    joinRoom(roomId, username);
  };

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('Room ID copied to clipboard!');
    } catch {
      toast.error('Failed to copy room ID');
    }
  };

  const handleVoiceConnectionChange = (isConnected: boolean) => {
    setVoiceConnected(isConnected);
  };

  const handleVoiceParticipantsChange = (participants: VoiceParticipant[]) => {
    setVoiceParticipants(participants);
  };

  const handleVoiceMuteChange = (muted: boolean) => {
    setIsMuted(muted);
  };

  const toggleVoiceChat = () => {
    if (roomState.isDemoMode) {
      toast.info('🎭 Voice Chat Demo', {
        description: 'Voice chat is simulated in demo mode. Real voice features require a live server.',
        duration: 4000,
      });
    }

    setVoiceEnabled(!voiceEnabled);
    if (!voiceEnabled) {
      toast.success('Voice chat enabled');
    } else {
      toast.info('Voice chat disabled');
      setVoiceConnected(false);
      setVoiceParticipants([]);
    }
  };

  const currentUserVoice = voiceParticipants.find((p) => p.id === roomState.username);
  const isCurrentUserSpeaking = currentUserVoice?.isSpeaking || false;

  if (!hasJoined) {
    return <JoinRoomDialog isOpen={showJoinDialog} roomId={roomId} onJoin={handleJoinRoom} />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-2 sm:px-4 py-4">

        {/* Room Header */}
        <div className="bg-gradient-to-r from-gray-900 to-black/90 backdrop-blur-sm shadow-sm rounded-md px-3 py-2 sm:px-4 sm:py-3 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Room Title and Badges (Centered on Mobile, Left on Desktop) */}
            <div className="flex flex-col items-center sm:items-start sm:flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
                Karaoke Room
              </h1>
              <div className="flex flex-col items-center sm:items-start gap-2 mt-2 w-full">
                {/* Room ID */}
                <div className="flex justify-center sm:justify-start items-center">
                  <span className="text-gray-400 text-xs sm:text-sm">Room ID:</span>
                  <button
                    onClick={handleCopyRoomId}
                    className="font-mono text-red-400 rounded px-2 py-1 text-xs sm:text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    {roomId}
                  </button>
                </div>
                {/* Badges */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  {/* Demo Mode Indicator */}
                  {roomState.isDemoMode && (
                    <Badge
                      variant="secondary"
                      className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs"
                    >
                      <AlertTriangle className="w-2 h-2 mr-1" />
                      Demo Mode
                    </Badge>
                  )}

                  {/* Connection Status */}
                  <Badge
                    variant="secondary"
                    className={`text-xs ${roomState.connected
                      ? 'text-green-400 bg-green-500/20 border-green-500/30'
                      : 'text-red-400 bg-red-500/20 border-red-500/30'
                      }`}
                  >
                    {roomState.connected ? (
                      <>
                        <Wifi className="w-2 h-2 mr-1" />
                        {roomState.isDemoMode ? 'Demo' : 'Connected'}
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-2 h-2 mr-1" />
                        Disconnected
                      </>
                    )}
                  </Badge>

                  {/* Microphone Status */}
                  {voiceEnabled && voiceConnected && (
                    <Badge
                      variant="secondary"
                      className={`text-xs ${isMuted
                        ? 'text-red-400 bg-red-500/20 border-red-500/30'
                        : isCurrentUserSpeaking
                          ? 'text-green-300 bg-green-500/20 border-green-500/30 animate-pulse'
                          : 'text-green-400 bg-green-500/20 border-green-500/30'
                        }`}
                    >
                      {isMuted ? (
                        <MicOff className="w-2 h-2 mr-1" />
                      ) : (
                        <Mic className="w-2 h-2 mr-1" />
                      )}
                      {isMuted ? 'Muted' : 'Live'}
                    </Badge>
                  )}

                  {/* Host Badge */}
                  {roomState.isHost && (
                    <Badge
                      variant="secondary"
                      className="text-yellow-400 bg-yellow-500/20 border-yellow-500/30 text-xs"
                    >
                      <Crown className="w-2 h-2 mr-1" />
                      Host
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Buttons (Left and Right on Mobile, Right on Desktop) */}
            <div className="flex md:flex-row-reverse justify-between sm:justify-end w-full sm:w-auto gap-2">

              {/* Leave Room Button */}
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-200 py-1 sm:py-2"
              >
                <Link href="/">
                  <ArrowLeft className="w-3 h-3 mr-2" />
                  Leave Room
                </Link>
              </Button>
              {/* Voice Chat Toggle */}
              <Button
                onClick={toggleVoiceChat}
                variant={voiceEnabled ? 'default' : 'outline'}
                size="sm"
                className={`${voiceEnabled
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white'
                  } transition-all duration-200 py-1 sm:py-2`}
              >
                <Volume2 className="w-3 h-3 mr-1" />
                Voice
                {voiceConnected && (
                  <Badge
                    variant="secondary"
                    className="ml-1 bg-gray-700/50 text-white text-[8px] sm:text-xs"
                  >
                    {voiceParticipants.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Voice Participants Bar */}
        {voiceEnabled && voiceConnected && voiceParticipants.length > 0 && (
          <Card className="p-2 mb-4 bg-gray-800/50 border-blue-500/30">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-blue-400">
                <Volume2 className="w-3 h-3" />
                <span className="text-xs font-medium">
                  Voice Chat Active {roomState.isDemoMode && '(Demo)'}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {voiceParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-all duration-200 ${participant.isSpeaking && !participant.isMuted
                      ? 'bg-green-500/20 border border-green-500/50 animate-pulse'
                      : 'bg-gray-700/50 border border-gray-600/50'
                      }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${participant.isSpeaking && !participant.isMuted ? 'bg-green-400' : 'bg-gray-500'
                        }`}
                    />
                    <span className="text-white">{participant.id}</span>
                    {participant.isMuted && <MicOff className="w-2 h-2 text-red-400" />}
                    {participant.connectionQuality && (
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${participant.connectionQuality === 'good'
                          ? 'bg-green-400'
                          : participant.connectionQuality === 'medium'
                            ? 'bg-yellow-400'
                            : 'bg-red-400'
                          }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Main Content */}
        <div className="lg:grid lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-4">
            <div className="w-full max-w-full overflow-hidden">
              <VideoPlayer
                currentVideo={roomState.currentVideo}
                videoState={roomState.videoState}
                isHost={roomState.isHost}
                onVideoStateChange={updateVideoState}
                onVideoEnd={videoEnded}
                onSkip={skipVideo}
              />
            </div>
            <VideoQueue
              queue={roomState.queue}
              isHost={roomState.isHost}
              onAddToQueue={addToQueue}
              onRemoveFromQueue={removeFromQueue}
            />
          </div>

          {/* Sidebar Content */}
          <div className="lg:col-span-4 space-y-4 hidden lg:block">
            {voiceEnabled && roomState.connected && (
              <VoiceChat
                socket={null}
                roomId={roomId}
                userId={roomState.username}
                onConnectionStatusChange={handleVoiceConnectionChange}
                onVoiceParticipantsChange={handleVoiceParticipantsChange}
                onMuteStatusChange={handleVoiceMuteChange}
              />
            )}
            <UserPanel
              users={roomState.users}
              currentUsername={roomState.username}
              isHost={roomState.isHost}
              onChangeUsername={changeUsername}
              voiceParticipants={voiceParticipants}
            />
            <div className="h-[28rem]">
              <ChatPanel messages={roomState.chatHistory} onSendMessage={sendChatMessage} />
            </div>
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="lg:hidden mt-4">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-3 gap-1">
              <TabsTrigger
                value="chat"
                className="text-xs py-2 px-1 sm:text-sm sm:px-2"
              >
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Chat ({roomState.chatHistory.length})
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="text-xs py-2 px-1 sm:text-sm sm:px-2"
              >
                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Users ({roomState.users.length})
              </TabsTrigger>
              {voiceEnabled && (
                <TabsTrigger
                  value="voice"
                  className="text-xs py-2 px-1 sm:text-sm sm:px-2"
                >
                  <Volume2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Voice ({voiceParticipants.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="chat" className="mt-4">
              <div className="h-[18rem] sm:h-[22rem]">
                <ChatPanel messages={roomState.chatHistory} onSendMessage={sendChatMessage} />
              </div>
            </TabsContent>

            <TabsContent value="users" className="mt-4">
              <UserPanel
                users={roomState.users}
                currentUsername={roomState.username}
                isHost={roomState.isHost}
                onChangeUsername={changeUsername}
                voiceParticipants={voiceParticipants}
              />
            </TabsContent>

            {voiceEnabled && (
              <TabsContent value="voice" className="mt-4">
                <VoiceChat
                  socket={null}
                  roomId={roomId}
                  userId={roomState.username}
                  onConnectionStatusChange={handleVoiceConnectionChange}
                  onVoiceParticipantsChange={handleVoiceParticipantsChange}
                  onMuteStatusChange={handleVoiceMuteChange}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}